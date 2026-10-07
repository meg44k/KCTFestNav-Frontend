"use client";

import { useEffect, useRef } from "react";
import {
  amplitudeAt,
  type Box,
  burstStrength,
  centerOnTopOrBottom,
  perimeterLength,
  pointOnRoundedRect,
  waveOffset,
} from "@/lib/stage/live-wave";

// 波形がはみ出せる余白(px)
const MARGIN = 16;
// いちばん大きいときの振れ幅(px)
const MAX_AMP = 14;
// ギザギザの長さ(周りの長さに対する割合)、一度に出る数、出ている長さと次が出るまでの間(秒)
const LENGTH = 0.06;
const BURSTS = 2;
const DURATION = [0.6, 1.3] as const;
const GAP = [0.15, 0.7] as const;
// 枠を描くときの細かさ(px)と色(赤い枠と同じ)
const STEP = 1.5;
const COLOR = "#e54141";

const between = ([min, max]: readonly [number, number]) =>
  min + Math.random() * (max - min);

// 枠の上のギザギザ 1 つ。center は上下の辺のどこか(0〜1、前半が上・後半が下)、start と duration は秒
type Burst = { center: number; start: number; duration: number; seed: number };

/**
 * LIVE の帯の枠そのもの。赤い枠の上か下の辺のどこか(ランダム)が急にギザギザになって震え、静まると別の所に出る。
 * 親(position: relative、角丸 radius px、赤い枠 border px)の上に重ねて置く。
 * 描けるまでは親の普通の赤い枠が見え、描けたら親の枠を透明にして入れ替える
 */
export function LiveWave({
  radius = 6,
  border = 2,
}: {
  radius?: number;
  border?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    const host = el?.parentElement;
    const ctx = el?.getContext("2d");
    if (!el || !host || !ctx) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let box: Box = { w: 0, h: 0, r: 0 };
    let visible = true;
    let frame = 0;
    const started = performance.now();
    // 前のと近すぎない所を選ぶ
    const pickCenter = (others: Burst[]) => {
      let c = Math.random();
      for (let i = 0; i < 8; i++) {
        // 同じ辺の近い所(辺の 3 割以内)には出さない
        const near = others.some((o) => Math.abs(o.center - c) < 0.15);
        if (!near) break;
        c = Math.random();
      }
      return c;
    };
    const bursts: Burst[] = [];
    for (let k = 0; k < BURSTS; k++) {
      bursts.push({
        center: pickCenter(bursts),
        start: 0.1 + k * between([0.4, 0.8]),
        duration: between(DURATION),
        seed: Math.random() * 100,
      });
    }
    // 静まったものは、少し間をあけて別の所に出す
    const renew = (t: number) => {
      bursts.forEach((b, i) => {
        if (t < b.start + b.duration) return;
        const others = bursts.filter((_, j) => j !== i);
        bursts[i] = {
          center: pickCenter([b, ...others]),
          start: t + between(GAP),
          duration: between(DURATION),
          seed: Math.random() * 100,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = host.clientWidth + border * 2;
      const h = host.clientHeight + border * 2;
      el.width = (w + MARGIN * 2) * dpr;
      el.height = (h + MARGIN * 2) * dpr;
      el.style.width = `${w + MARGIN * 2}px`;
      el.style.height = `${h + MARGIN * 2}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 枠の線のまん中を通る角丸の長方形
      box = {
        w: w - border,
        h: h - border,
        r: Math.max(radius - border / 2, 0),
      };
    };

    // 枠の線そのものを描く。ふだんはまっすぐで、出ているギザギザの所だけ変形する
    const draw = (now: number, still = false) => {
      const t = (now - started) / 1000;
      ctx.clearRect(0, 0, el.width, el.height);
      const p = perimeterLength(box);
      if (p <= 0) return;
      const len = p * LENGTH;
      if (!still) renew(t);
      const waves = still
        ? []
        : bursts.flatMap((b) => {
            const strength = burstStrength(t - b.start, b.duration);
            if (strength <= 0) return [];
            const tt = t + b.seed;
            return [
              {
                tail: centerOnTopOrBottom(box, b.center, len) - len / 2,
                t: tt,
                amp: amplitudeAt(tt) * MAX_AMP * strength,
              },
            ];
          });
      const ox = MARGIN + border / 2;
      const steps = Math.ceil(p / STEP);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const s = (i / steps) * p;
        const at = pointOnRoundedRect(box, s);
        // 波形の区間(tail〜tail+len)に入っている所だけずらす
        let off = 0;
        for (const w of waves) {
          const rel = (((s - w.tail) % p) + p) % p;
          if (rel < len) off += waveOffset(rel / len, w.t, w.amp);
        }
        const x = ox + at.x + at.nx * off;
        const y = ox + at.y + at.ny * off;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = COLOR;
      ctx.lineWidth = border;
      ctx.lineJoin = "miter";
      ctx.stroke();
      // 描けたら、読み込み中に出していた普通の赤い枠を消して入れ替える
      host.style.borderColor = "transparent";
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (reduce) draw(started, true);
      else frame = requestAnimationFrame(loop);
    };

    resize();
    start();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(started, true);
    });
    ro.observe(host);
    // 画面の外や裏にあるときは止める
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    });
    io.observe(host);
    const onVisibility = () => {
      if (!document.hidden) start();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      host.style.borderColor = "";
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [radius, border]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: -(MARGIN + border), top: -(MARGIN + border) }}
    />
  );
}
