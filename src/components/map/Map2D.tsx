"use client";

import { Maximize, Minus, Navigation2, Plus } from "lucide-react";
import {
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import {
  floorLabel,
  fromScreen,
  MAP_BEARING,
  shortName,
  toScreen,
  type XY,
} from "@/lib/map/campus";
import { cn } from "@/lib/utils";
import { type MapProps, PIN_COLORS } from "./types";

const MARGIN = 12;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 12;
// これより拡大したら、ピンの横にブース名を出す(全体表示では重なるので出さない)
const PIN_NAME_ZOOM = 2.2;

// 地図の座標 → 画面の向き(MAP_BEARING が上)に回した座標。文字は回さずにすむ
const S = (xy: XY) => toScreen(xy, MAP_BEARING);

// 札の幅の目安(全角は 1 文字、半角は 0.6 文字)
const textWidth = (text: string, size: number) =>
  [...text].reduce((w, c) => w + (c.charCodeAt(0) > 0xff ? 1 : 0.6), 0) * size;

/**
 * 平面図。上は MAP_BEARING の方角。最初は名前のある棟が画面いっぱいになるように寄せる。
 * 指で拡大・移動、ダブルタップで拡大、右下のボタンで拡大・縮小・全体に戻す
 */
export function Map2D({
  campus,
  pins,
  selectedPinId,
  focus,
  location,
  onPickPin,
  onPickBuilding,
  onPickNothing,
  onPickPoint,
  className,
  controlsClassName = "right-3 bottom-3",
}: MapProps & {
  onPickPoint?: (xy: XY) => void;
  className?: string;
  /** 拡大・縮小ボタンの位置(地図の上に他のボタンがあるときにずらす) */
  controlsClassName?: string;
}) {
  // 最初に見せる範囲 = 名前のある棟(回した後)。無ければ全部
  const vb = useMemo(() => {
    const named = campus.buildings.filter((b) => b.name);
    const pts = (named.length > 0 ? named : campus.buildings).flatMap((b) =>
      b.parts.flatMap((p) => p.polygons.flatMap(([outer]) => outer.map(S))),
    );
    const xs = pts.map(([x]) => x);
    const ys = pts.map(([, y]) => y);
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
    return {
      x: minX - MARGIN,
      y: -maxY - MARGIN,
      w: maxX - minX + MARGIN * 2,
      h: maxY - minY + MARGIN * 2,
    };
  }, [campus]);
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  // 画面の 1px が viewBox の何単位か(文字やピンの大きさを画面上で一定にする)
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () =>
      setUnit(Math.max(vb.w / el.clientWidth, vb.h / el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vb.w, vb.h]);
  const px = unit / view.k;

  // 画面の座標 → viewBox の座標
  const toSvg = (clientX: number, clientY: number) => {
    const el = svg.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  // viewBox の座標 → 地図の座標(拡大・移動を戻し、y を上向きにして、回転を戻す)
  const toMap = (sx: number, sy: number): XY =>
    fromScreen(
      [(sx - view.tx) / view.k, -(sy - view.ty) / view.k],
      MAP_BEARING,
    );

  const zoomAt = (sx: number, sy: number, factor: number) =>
    setView((v) => {
      const k = Math.min(Math.max(v.k * factor, MIN_ZOOM), MAX_ZOOM);
      const f = k / v.k;
      return { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
    });
  const zoomCenter = (factor: number) =>
    zoomAt(vb.x + vb.w / 2, vb.y + vb.h / 2, factor);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; dist?: number }>({ moved: 0 });
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null);

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { moved: 0 };
    gesture.current.dist = undefined;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const a = toSvg(prev.x, prev.y);
      const b = toSvg(e.clientX, e.clientY);
      gesture.current.moved += Math.hypot(
        e.clientX - prev.x,
        e.clientY - prev.y,
      );
      setView((v) => ({ ...v, tx: v.tx + b.x - a.x, ty: v.ty + b.y - a.y }));
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      if (gesture.current.dist)
        zoomAt(mid.x, mid.y, dist / gesture.current.dist);
      gesture.current.dist = dist;
      gesture.current.moved = Number.POSITIVE_INFINITY;
    }
  };
  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    const was = pointers.current.size;
    pointers.current.delete(e.pointerId);
    if (was !== 1 || gesture.current.moved > 6) return;
    const s = toSvg(e.clientX, e.clientY);
    if (onPickPoint) return onPickPoint(toMap(s.x, s.y));
    // ダブルタップは拡大(1 回目の選択はそのまま)
    const now = performance.now();
    const prev = lastTap.current;
    if (
      prev &&
      now - prev.at < 300 &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < 25
    ) {
      lastTap.current = null;
      return zoomAt(s.x, s.y, 2);
    }
    lastTap.current = { at: now, x: e.clientX, y: e.clientY };
    // ポインターを捕まえているので e.target は svg になる。指の下の要素を見る
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return onPickNothing();
    const pin = target.closest("[data-pin]")?.getAttribute("data-pin");
    if (pin) return onPickPin(Number(pin));
    const building = target
      .closest("[data-building]")
      ?.getAttribute("data-building");
    if (building) return onPickBuilding(building);
    onPickNothing();
  };
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const s = toSvg(e.clientX, e.clientY);
    zoomAt(s.x, s.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const ring = (r: XY[]) =>
    `M${r
      .map(S)
      .map(([x, y]) => `${x},${-y}`)
      .join("L")}Z`;
  const at = (xy: XY) => {
    const [x, y] = S(xy);
    return { x, y: -y };
  };
  const me = location ? at(location.xy) : null;
  const showPinNames = view.k >= PIN_NAME_ZOOM && !onPickPoint;

  return (
    <div className={cn("relative h-full w-full", className)}>
      <svg
        ref={svg}
        role="img"
        aria-label="キャンパスの平面図"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-full w-full touch-none select-none bg-black"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {campus.buildings.map((b) => {
            const focused = focus?.buildingId === b.id;
            return (
              <g key={b.id} data-building={b.id}>
                {b.parts.map((part, i) => (
                  <path
                    // biome-ignore lint/suspicious/noArrayIndexKey: 部分の並びは変わらない
                    key={i}
                    d={part.polygons
                      .map((poly) => poly.map(ring).join(""))
                      .join("")}
                    fillRule="evenodd"
                    // 名前のある棟は明るく、渡り廊下などは背景に引かせる
                    fill={
                      focused ? "#fbbf2499" : b.name ? "#5b6472" : "#1c2025"
                    }
                    stroke={
                      focused ? "#fbbf24" : b.name ? "#d1d5db" : "#3a4048"
                    }
                    strokeWidth={(focused ? 2.5 : b.name ? 1.5 : 1) * px}
                    strokeLinejoin="round"
                  />
                ))}
              </g>
            );
          })}
          {campus.buildings
            .filter((b) => b.name)
            .map((b) => {
              const name = shortName(b.name as string);
              const size = 12 * px;
              const w = textWidth(name, size) + 10 * px;
              const h = 20 * px;
              const c = at(b.center);
              const focused = focus?.buildingId === b.id;
              return (
                <g key={b.id} pointerEvents="none">
                  <rect
                    x={c.x - w / 2}
                    y={c.y - h / 2}
                    width={w}
                    height={h}
                    rx={h / 2}
                    fill={focused ? "#fbbf24" : "#0b0d10"}
                    stroke="#ffffffb3"
                    strokeWidth={px}
                  />
                  <text
                    x={c.x}
                    y={c.y}
                    fontSize={size}
                    fontWeight="bold"
                    fill={focused ? "#000" : "#fff"}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          {location && me && (
            <g pointerEvents="none">
              <circle
                cx={me.x}
                cy={me.y}
                r={Math.max(location.accuracy, 2)}
                fill="#4f8cff26"
              />
              {location.heading !== undefined && (
                <path
                  d={`M0,0 L${-6 * px},${-20 * px} L${6 * px},${-20 * px} Z`}
                  // 向きは北から時計回り。画面では北が -MAP_BEARING の向きにある
                  transform={`translate(${me.x} ${me.y}) rotate(${location.heading - MAP_BEARING})`}
                  fill="#4f8cff88"
                />
              )}
              <circle
                cx={me.x}
                cy={me.y}
                r={7 * px}
                fill="#4f8cff"
                stroke="#fff"
                strokeWidth={2.5 * px}
              />
            </g>
          )}
          {pins.map((pin) => {
            const big = pin.id === selectedPinId;
            const r = (big ? 13 : 9) * px;
            const p = at(pin.xy);
            const label = [
              showPinNames || big ? pin.name : "",
              pin.floor > 0 ? floorLabel(pin.floor) : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <g
                key={pin.id}
                data-pin={pin.id}
                transform={`translate(${p.x} ${p.y})`}
              >
                <circle
                  r={r}
                  fill={PIN_COLORS[pin.congestion]}
                  stroke="#fff"
                  strokeWidth={2.5 * px}
                />
                {label && (
                  <text
                    x={r + 3 * px}
                    y={0}
                    fontSize={12 * px}
                    fontWeight="bold"
                    fill="#fff"
                    stroke="#000"
                    strokeWidth={3 * px}
                    paintOrder="stroke"
                    dominantBaseline="central"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {/* 上が北ではないので、北の向きを出す */}
      <div
        aria-label="北の向き"
        role="img"
        className="pointer-events-none absolute top-14 left-3 flex h-9 w-9 flex-col items-center justify-center rounded-full border border-white/40 bg-black/70 text-[10px] text-white"
        style={{ transform: `rotate(${-MAP_BEARING}deg)` }}
      >
        <Navigation2 size={14} fill="currentColor" />N
      </div>
      <div
        className={cn(
          "absolute flex flex-col overflow-hidden rounded-xl border border-white/40 bg-black/80",
          controlsClassName,
        )}
      >
        {[
          { label: "拡大", icon: Plus, onClick: () => zoomCenter(1.6) },
          { label: "縮小", icon: Minus, onClick: () => zoomCenter(1 / 1.6) },
          {
            label: "全体を表示",
            icon: Maximize,
            onClick: () => setView({ k: 1, tx: 0, ty: 0 }),
          },
        ].map(({ label, icon: Icon, onClick }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={onClick}
            className="flex h-10 w-10 items-center justify-center text-white active:bg-white/20"
          >
            <Icon size={18} />
          </button>
        ))}
      </div>
    </div>
  );
}
