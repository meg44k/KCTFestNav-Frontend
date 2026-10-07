"use client";

import {
  type PointerEvent,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from "react";
import { floorLabel, type XY } from "@/lib/map/campus";
import { cn } from "@/lib/utils";
import { type MapProps, PIN_COLORS } from "./types";

const MARGIN = 30;

/** 平面図。黒地に校舎の形・棟の名前・ピン。指で拡大と移動ができる */
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
}: MapProps & { onPickPoint?: (xy: XY) => void; className?: string }) {
  const { minX, maxX, minY, maxY } = campus.bounds;
  const vb = {
    x: minX - MARGIN,
    y: -maxY - MARGIN,
    w: maxX - minX + MARGIN * 2,
    h: maxY - minY + MARGIN * 2,
  };
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
  // viewBox の座標 → 地図の座標(拡大・移動を戻し、y を北向きに)
  const toMap = (sx: number, sy: number): XY => [
    (sx - view.tx) / view.k,
    -(sy - view.ty) / view.k,
  ];

  const zoomAt = (sx: number, sy: number, factor: number) =>
    setView((v) => {
      const k = Math.min(Math.max(v.k * factor, 1), 12);
      const f = k / v.k;
      return { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
    });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; dist?: number }>({ moved: 0 });

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
    // ポインターを捕まえているので e.target は svg になる。指の下の要素を見る
    const target = document.elementFromPoint(e.clientX, e.clientY);
    if (!target) return onPickNothing();
    if (onPickPoint) {
      const s = toSvg(e.clientX, e.clientY);
      return onPickPoint(toMap(s.x, s.y));
    }
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

  const ring = (r: XY[]) => `M${r.map(([x, y]) => `${x},${-y}`).join("L")}Z`;

  return (
    <svg
      ref={svg}
      role="img"
      aria-label="キャンパスの平面図"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className={cn("h-full w-full touch-none select-none bg-black", className)}
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
                  fill={focused ? "#3d8bff55" : b.name ? "#3a4049" : "#22262b"}
                  stroke={focused ? "#3d8bff" : "#8a93a0"}
                  strokeWidth={px}
                />
              ))}
            </g>
          );
        })}
        {campus.buildings
          .filter((b) => b.name)
          .map((b) => (
            <text
              key={b.id}
              x={b.center[0]}
              y={-b.center[1]}
              fontSize={11 * px}
              fill="#e5e7eb"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {b.name}
            </text>
          ))}
        {location && (
          <g pointerEvents="none">
            <circle
              cx={location.xy[0]}
              cy={-location.xy[1]}
              r={Math.max(location.accuracy, 2)}
              fill="#4f8cff26"
            />
            {location.heading !== undefined && (
              <path
                d={`M0,0 L${-5 * px},${-16 * px} L${5 * px},${-16 * px} Z`}
                transform={`translate(${location.xy[0]} ${-location.xy[1]}) rotate(${location.heading})`}
                fill="#4f8cff88"
              />
            )}
            <circle
              cx={location.xy[0]}
              cy={-location.xy[1]}
              r={6 * px}
              fill="#4f8cff"
              stroke="#fff"
              strokeWidth={2 * px}
            />
          </g>
        )}
        {pins.map((pin) => {
          const big = pin.id === selectedPinId;
          const r = (big ? 10 : 7) * px;
          return (
            <g
              key={pin.id}
              data-pin={pin.id}
              transform={`translate(${pin.xy[0]} ${-pin.xy[1]})`}
            >
              <circle
                r={r}
                fill={PIN_COLORS[pin.kind]}
                stroke="#fff"
                strokeWidth={2 * px}
              />
              {pin.floor > 0 && (
                <text
                  x={r + 2 * px}
                  y={0}
                  fontSize={10 * px}
                  fill="#fff"
                  dominantBaseline="middle"
                >
                  {floorLabel(pin.floor)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
