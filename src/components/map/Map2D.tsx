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
import { YELLOW as BRAND_YELLOW, OFF_WHITE } from "@/lib/home/palette";
import {
  floorLabel,
  fromScreen,
  MAP_BEARING,
  shortName,
  toScreen,
  type XY,
} from "@/lib/map/campus";
import { clusterPins } from "@/lib/map/cluster";
import { viewShowing } from "@/lib/map/focus-view";
import { GROUND } from "@/lib/map/ground";
import { cn } from "@/lib/utils";
import { MAP_BG, type MapProps, PIN_COLORS } from "./types";

const MARGIN = 12;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 12;
// これより拡大したら、ピンの横にブース名を出す(全体表示では重なるので出さない)
const PIN_NAME_ZOOM = 2.2;
// 画面の上でこれより近いピンは 1 つの丸にまとめる(px)。拡大するとほどける
const CLUSTER_PX = 28;
// ブースを選んだら、ここまで拡大してそのピンへ寄せる
const SELECT_ZOOM = 3;
// ブースを選んでいる間、ほかのピンや丸の濃さ
const DIM = 0.35;
// 地図の上の白は、タイトル画面・入口ページと同じ少しあたたかい白(OFF_WHITE)。
// 真っ白だと黒い地図の上でチカチカする(現在地の青い点のふちだけは真っ白のまま)
// 平面図の色(「お祭りの夜」: タイトルの星空に合わせた紺)。鮮やかな色は混雑度のピンだけに使い、
// ほかは「地面 → 道 → 建物 → 名札 → ピン」の順に明るくする。
// 地面の絵(道・草・駐輪場)の色は scripts/map-ground.py で同じ考えにそろえる
const MAP = {
  bg: MAP_BG, // 敷地の外
  building: "#5E6787",
  buildingEdge: "#B3BAD3",
  focus: BRAND_YELLOW, // 選んだ棟
  tag: MAP_BG, // 棟の名札の地
  cluster: "#141A2A", // まとめた丸の地
};

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
  onMovePin,
  className,
  controlsClassName = "right-3 bottom-3",
}: MapProps & {
  onPickPoint?: (xy: XY) => void;
  /** 管理用: ピンを押さえたまま動かすと呼ぶ(そのあいだ地図は動かさない)。渡すとピンをまとめず、名前もいつも出す */
  onMovePin?: (id: number, xy: XY) => void;
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

  // ブースを選んだら、そのピンが下のカードに隠れない所へ寄せる(すっと動かす)
  const viewNow = useRef(view);
  viewNow.current = view;
  // biome-ignore lint/correctness/useExhaustiveDependencies: 選んだときだけ寄せる(混み具合の更新で pins が変わっても動かさない)
  useEffect(() => {
    const el = svg.current;
    const pin = pins.find((p) => p.id === selectedPinId);
    if (!el || !pin || onMovePin || onPickPoint) return;
    const u = Math.max(vb.w / el.clientWidth, vb.h / el.clientHeight);
    const from = viewNow.current;
    const to = viewShowing(
      at(pin.xy),
      { cx: vb.x + vb.w / 2, cy: vb.y + vb.h / 2, h: el.clientHeight * u },
      SELECT_ZOOM,
      from.k,
    );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return setView(to);
    const start = performance.now();
    let raf = requestAnimationFrame(function step(now) {
      const t = Math.min((now - start) / 400, 1);
      const e = 1 - (1 - t) ** 3;
      setView({
        k: from.k + (to.k - from.k) * e,
        tx: from.tx + (to.tx - from.tx) * e,
        ty: from.ty + (to.ty - from.ty) * e,
      });
      if (t < 1) raf = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedPinId]);

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

  // 動かしているピン(onMovePin のとき)
  const dragPin = useRef<number | null>(null);

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (onMovePin && pointers.current.size === 0) {
      const pin = (e.target as Element)
        .closest("[data-pin]")
        ?.getAttribute("data-pin");
      dragPin.current = pin ? Number(pin) : null;
    }
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
    if (dragPin.current !== null && onMovePin) {
      // 2 本目の指が来たら、ピンを動かすのをやめて拡大・縮小にする
      if (pts.length > 1) dragPin.current = null;
      else {
        const s = toSvg(e.clientX, e.clientY);
        gesture.current.moved = Number.POSITIVE_INFINITY;
        return onMovePin(dragPin.current, toMap(s.x, s.y));
      }
    }
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
    if (pointers.current.size === 0) dragPin.current = null;
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
    // まとめた丸は、そこへ寄ってほどく
    if (target.closest("[data-cluster]")) return zoomAt(s.x, s.y, 2.5);
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
  const showPinNames = onMovePin
    ? true
    : view.k >= PIN_NAME_ZOOM && !onPickPoint;
  // 場所を選ぶ画面(管理用)ではまとめない
  const clusters = clusterPins(
    pins,
    // 動かす画面では、同じ場所に重なったピンも 1 本ずつ動かせるよう、まったくまとめない(-1)
    onMovePin ? -1 : onPickPoint ? 0 : CLUSTER_PX * px,
    selectedPinId,
  );

  // 選んだピン(clusterPins はまとめないので、いつも 1 本で出る)
  const selected = pins.find((p) => p.id === selectedPinId);
  const renderPin = (pin: (typeof pins)[number]) => {
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
        // ブースを選んでいる間は、ほかのピンを薄くする
        opacity={selected && !big ? DIM : 1}
      >
        {big && (
          <>
            {/* 選んだ直後に広がる輪(選び直すたびに出し直す) */}
            <circle
              key={`pulse${pin.id}`}
              className="map-pin-pulse"
              r={r}
              fill="none"
              stroke={BRAND_YELLOW}
              strokeWidth={3 * px}
              pointerEvents="none"
            />
            <circle
              r={r + 3 * px}
              fill="none"
              stroke={BRAND_YELLOW}
              strokeWidth={3 * px}
            />
          </>
        )}
        <circle
          r={r}
          fill={pin.color ?? PIN_COLORS[pin.congestion]}
          stroke={OFF_WHITE}
          strokeWidth={2.5 * px}
        />
        {label && (
          <text
            x={r + (big ? 7 : 3) * px}
            y={0}
            fontSize={(big ? 14 : 12) * px}
            fontWeight="bold"
            fill={OFF_WHITE}
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
  };

  return (
    <div className={cn("relative h-full w-full", className)}>
      <svg
        ref={svg}
        role="img"
        aria-label="キャンパスの平面図"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        className="h-full w-full touch-none select-none"
        style={{ background: MAP.bg }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
        onWheel={onWheel}
      >
        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {/* 地面の絵(道・草)。建物より下。onPickPoint の地図(管理用)でも同じに出す */}
          <image
            href={GROUND.href}
            x={GROUND.left}
            y={-GROUND.top}
            width={GROUND.right - GROUND.left}
            height={GROUND.top - GROUND.bottom}
            preserveAspectRatio="none"
            pointerEvents="none"
          />
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
                    // 名前の無い棟(渡り廊下・物置など)も、地面の絵の上で埋もれないよう同じ色にする
                    fill={focused ? `${MAP.focus}99` : MAP.building}
                    stroke={focused ? MAP.focus : MAP.buildingEdge}
                    strokeWidth={(focused ? 2.5 : 1.5) * px}
                    strokeLinejoin="round"
                  />
                ))}
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
          {clusters
            .filter((c) => c.members.length > 1)
            .map((c) => {
              const p = at(c.xy);
              return (
                <g
                  key={`c${c.members[0].id}`}
                  data-cluster
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={selected ? DIM : 1}
                >
                  <circle
                    r={15 * px}
                    fill={MAP.cluster}
                    stroke={OFF_WHITE}
                    strokeWidth={2.5 * px}
                  />
                  <text
                    fontSize={14 * px}
                    // 数がひと目で読めるよう太く。文字の書体は 700 より太いものが無いので、
                    // 同じ色のふちを足して太らせる
                    fontWeight="bold"
                    fill={OFF_WHITE}
                    stroke={OFF_WHITE}
                    strokeWidth={1.1 * px}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {c.members.length}
                  </text>
                </g>
              );
            })}
          {clusters
            .filter(
              (c) =>
                c.members.length === 1 && c.members[0].id !== selectedPinId,
            )
            .map(({ members: [pin] }) => renderPin(pin))}
          {/* 棟の名札はピンや丸より前に出す(重なっても何号館か読めるように)。押した判定は下のピンに通す */}
          {campus.buildings
            .filter((b) => b.name)
            .map((b) => {
              const name = shortName(b.name as string);
              const size = 12 * px;
              // 文字の左右に 9px ずつあける
              const w = textWidth(name, size) + 18 * px;
              const h = 20 * px;
              const c = at(b.center);
              const focused = focus?.buildingId === b.id;
              return (
                <g
                  key={b.id}
                  pointerEvents="none"
                  // 半透明にして、下に重なったピンや丸の数も透けて見えるように(選んだ棟ははっきり)
                  opacity={focused ? 1 : 0.6}
                >
                  <rect
                    x={c.x - w / 2}
                    y={c.y - h / 2}
                    width={w}
                    height={h}
                    rx={h / 2}
                    fill={focused ? MAP.focus : MAP.tag}
                    stroke={`${OFF_WHITE}40`}
                    strokeWidth={px}
                  />
                  <text
                    x={c.x}
                    y={c.y}
                    fontSize={size}
                    fontWeight="bold"
                    fill={focused ? "#000" : OFF_WHITE}
                    textAnchor="middle"
                    dominantBaseline="central"
                  >
                    {name}
                  </text>
                </g>
              );
            })}
          {/* 選んだピンは棟の名札よりも手前に出す */}
          {selected && renderPin(selected)}
        </g>
      </svg>
      {/* 上が北ではないので、北の向きを出す */}
      <div
        aria-label="北の向き"
        role="img"
        className="pointer-events-none absolute top-[100px] left-4 flex h-9 w-9 flex-col items-center justify-center rounded-full glass text-[10px] text-white"
        style={{ transform: `rotate(${-MAP_BEARING}deg)` }}
      >
        <Navigation2 size={14} fill="currentColor" />N
      </div>
      <div
        className={cn(
          "absolute flex flex-col overflow-hidden rounded-xl glass",
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
