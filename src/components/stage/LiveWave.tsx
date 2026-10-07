"use client";

import { useEffect, useRef } from "react";
import {
  amplitudeAt,
  type Box,
  perimeterLength,
  pointOnRoundedRect,
  waveOffset,
} from "@/lib/stage/live-wave";

// 波形がはみ出せる余白(px)
const MARGIN = 12;
// いちばん大きいときの振れ幅(px)
const MAX_AMP = 12;
// 枠を回る速さ(px/秒)と、波形の長さ(周りの長さに対する割合)
const SPEED = 110;
const LENGTH = 0.12;
// 枠を描くときの細かさ(px)と色(赤い枠と同じ)
const STEP = 1.5;
const COLOR = "#e54141";

/**
 * LIVE の帯の枠そのもの。赤い枠の一部がギザギザに変形しながら回り、振幅は時間でかわる。
 * 親(position: relative、角丸 radius px、透明な枠 border px)の上に重ねて置く
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

    // 枠の線そのものを描く。ふだんはまっすぐで、回っている一部だけがギザギザに変形する
    const draw = (now: number) => {
      const t = (now - started) / 1000;
      ctx.clearRect(0, 0, el.width, el.height);
      const p = perimeterLength(box);
      if (p <= 0) return;
      const tail = t * SPEED - p * LENGTH;
      const len = p * LENGTH;
      const amp = amplitudeAt(t) * MAX_AMP;
      const ox = MARGIN + border / 2;
      const steps = Math.ceil(p / STEP);
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const s = (i / steps) * p;
        const at = pointOnRoundedRect(box, s);
        // 波形の区間(tail〜tail+len)に入っている所だけずらす
        const rel = (((s - tail) % p) + p) % p;
        const off = rel < len ? waveOffset(rel / len, t, amp) : 0;
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
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      if (reduce) draw(started + 1500);
      else frame = requestAnimationFrame(loop);
    };

    resize();
    start();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) draw(started + 1500);
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
