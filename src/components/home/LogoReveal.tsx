"use client";

import Image from "next/image";
import { useEffect, useRef, useState, ViewTransition } from "react";
import { eventYear } from "@/lib/constants";
import {
  DIR,
  FLASH_MS,
  headAt,
  LOGO_H,
  LOGO_IMAGE,
  LOGO_W,
  logoImageRect,
  orbitAt,
  PATH_LEN,
  pixelRevealTime,
  REVEAL_END_MS,
  revealLayout,
  SPARKS,
  STAR_BOXES,
} from "@/lib/home/logo-reveal";

// 色は「r,g,b」の形(透明度を後から付けるため)
const GOLD = "255,217,138";
const CYAN = "159,212,255";
// 文字は入口ページのロゴと同じあたたかい白(#F4F1EA)
const LETTER = [244, 241, 234] as const;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  born: number;
  life: number;
  r: number;
  col: string;
};
type Comet = {
  s: (typeof SPARKS)[number];
  land: number;
  dur: number;
  sx: number;
  sy: number;
  burst: boolean;
};

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// 4 つの角を持つ、辺のくびれた星
function sparkPath(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) {
  const k = r * 0.16;
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + k, y - k, x + r, y);
  c.quadraticCurveTo(x + k, y + k, x, y + r);
  c.quadraticCurveTo(x - k, y + k, x - r, y);
  c.quadraticCurveTo(x - k, y - k, x, y - r);
  c.closePath();
}

function glowDot(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
  a: number,
) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(1, `rgba(${col},0)`);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

// 尾(1)から頭(2)へ細くなる光の筋
function streak(
  c: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  w: number,
  a: number,
  col: string,
) {
  const g = c.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, `rgba(${col},0)`);
  g.addColorStop(1, `rgba(${col},${a})`);
  c.strokeStyle = g;
  c.lineWidth = w;
  c.lineCap = "round";
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.stroke();
}

function makeComets(): Comet[] {
  // 各キラキラの位置へ、斜線に近い向きから小さな星が飛び込む
  return SPARKS.map((s, i) => {
    const ang = Math.atan2(DIR.y, DIR.x) + rnd(-0.35, 0.35);
    const dist = rnd(700, 1000);
    return {
      s,
      land: 3100 + i * 140 + rnd(-40, 40),
      dur: rnd(420, 560),
      sx: s[0] - Math.cos(ang) * dist,
      sy: s[1] - Math.sin(ang) * dist,
      burst: false,
    };
  });
}

type Rect = { left: number; top: number; width: number; height: number };

/**
 * タイトル画面のロゴ「ST@R G4ZER」が、流れ星とともに現れるアニメーション(約 5 秒)。
 * 大きな流れ星が斜線を走って手前を回り、斜線をなぞった所から文字が現れ、キラキラに小さな星が飛び込む。
 * 終わったら同じ位置にロゴ画像を重ねて入れ替え、入口ページのロゴへ滑らかにつながるようにする。
 * 「視差効果を減らす」の端末では動かさず、はじめから完成したロゴを出す
 */
export function LogoReveal() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!wrap || !cv || !ctx) return;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setDone(true);

    let raf = 0;
    let stopped = false;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let sc = 1;
    let ox = 0;
    let oy = 0;
    let logoC: HTMLCanvasElement;
    let logoX: CanvasRenderingContext2D;
    let pix: { idx: Int32Array; al: Uint8Array; rt: Float32Array };
    let imgData: ImageData;
    let u32: Uint32Array;
    let staticDone = false;
    let letters: HTMLImageElement;
    let stars: HTMLImageElement;
    let particles: Particle[] = [];
    const comets = makeComets();
    const start = performance.now();
    const toStage = (x: number, y: number) => [ox + x * sc, oy + y * sc];

    function layout() {
      if (!wrap || !cv) return;
      const r = wrap.getBoundingClientRect();
      // ページを離れるときなど、大きさが無いときは描き直さない
      if (r.width === 0 || r.height === 0) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = Math.round(r.width * dpr);
      H = Math.round(r.height * dpr);
      cv.width = W;
      cv.height = H;
      ({ sc, ox, oy } = revealLayout(W, H));
      // 重ねるロゴ画像は CSS の px で置く
      const css = logoImageRect(revealLayout(r.width, r.height));
      setRect(css);
      const lw = Math.ceil(LOGO_W * sc);
      const lh = Math.ceil(LOGO_H * sc);
      logoC = document.createElement("canvas");
      logoC.width = lw;
      logoC.height = lh;
      logoX = logoC.getContext("2d") as CanvasRenderingContext2D;
      // 端末の大きさで文字の形を読み、1 点ずつ現れる時刻を先に決めておく
      const tmp = document.createElement("canvas");
      tmp.width = lw;
      tmp.height = lh;
      const tx = tmp.getContext("2d") as CanvasRenderingContext2D;
      tx.drawImage(letters, 0, 0, lw, lh);
      const src = tx.getImageData(0, 0, lw, lh).data;
      const idx: number[] = [];
      const al: number[] = [];
      const rt: number[] = [];
      for (let y = 0; y < lh; y++)
        for (let x = 0; x < lw; x++) {
          const i = y * lw + x;
          const a = src[i * 4 + 3];
          if (a < 8) continue;
          idx.push(i);
          al.push(a);
          rt.push(pixelRevealTime(x / sc, y / sc) + Math.random() * 40);
        }
      pix = {
        idx: Int32Array.from(idx),
        al: Uint8Array.from(al),
        rt: Float32Array.from(rt),
      };
      imgData = logoX.createImageData(lw, lh);
      u32 = new Uint32Array(imgData.data.buffer);
      staticDone = false;
    }

    function renderLogo(t: number) {
      if (staticDone) return;
      u32.fill(0);
      const { idx, al, rt } = pix;
      const [r, g, b] = LETTER;
      let all = true;
      for (let k = 0; k < idx.length; k++) {
        if (t < rt[k]) {
          all = false;
          continue;
        }
        u32[idx[k]] = (al[k] << 24) | (b << 16) | (g << 8) | r;
      }
      logoX.putImageData(imgData, 0, 0);
      if (all) staticDone = true;
    }

    function frame(now: number) {
      if (!ctx || stopped) return;
      const t = reduce ? 99999 : now - start;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // 文字
      renderLogo(t);
      ctx.drawImage(logoC, ox, oy);
      // 文字から離れた星の形は、小さな星が着いたときに出す
      for (const c of comets) {
        const bi = c.s[3];
        if (bi < 0) continue;
        const q = clamp((t - c.land) / 250, 0, 1);
        if (q <= 0) continue;
        const [bx, by, bw, bh] = STAR_BOXES[bi];
        ctx.globalAlpha = q;
        ctx.drawImage(
          stars,
          bx,
          by,
          bw,
          bh,
          ox + bx * sc,
          oy + by * sc,
          bw * sc,
          bh * sc,
        );
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "lighter";

      // 大きな流れ星: 斜線を下り、手前を回って右上の始点へ戻る
      const oo = orbitAt(t);
      if (oo) {
        let prev: number[] | null = null;
        for (let i = 36; i >= 0; i--) {
          const o = orbitAt(t - i * 2.5);
          if (!o) continue;
          const [x, y] = toStage(o.x, o.y);
          if (prev) {
            ctx.strokeStyle = `rgba(${GOLD},${0.025 * (36 - i)})`;
            ctx.lineWidth = Math.min(7 * dpr * o.k, 4000);
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(prev[0], prev[1]);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
          prev = [x, y];
        }
        const [x, y] = toStage(oo.x, oo.y);
        const r = 6 * dpr * oo.k * Math.max(sc, 0.4);
        glowDot(ctx, x, y, r * 7, "255,200,120", 0.5);
        glowDot(ctx, x, y, r * 2.2, "255,240,210", 0.9);
        glowDot(ctx, x, y, r * 0.8, "255,255,255", 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(oo.th * 0.5);
        ctx.fillStyle = "rgba(255,255,255,.9)";
        sparkPath(ctx, 0, 0, r * 3);
        ctx.fill();
        ctx.restore();
        // 手前を通るときは火花を散らす
        if (oo.k > 1.5)
          for (let i = 0; i < 3; i++) {
            const a = rnd(0, 6.283);
            const v = rnd(0.3, 1.2) * Math.min(oo.k, 6) * 0.3;
            particles.push({
              x: (x - ox) / sc,
              y: (y - oy) / sc,
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              born: t,
              life: rnd(200, 450),
              r: rnd(1, 3) * Math.min(oo.k, 4) * 0.6,
              col: Math.random() < 0.5 ? GOLD : "200,230,255",
            });
          }
      }

      // 斜線をなぞる流れ星の頭
      const h = headAt(t);
      if (h && h.p <= 1.05) {
        const [hx, hy] = toStage(h.x, h.y);
        const L = Math.min(h.p, 1) * PATH_LEN * sc * 0.55;
        streak(
          ctx,
          hx - DIR.x * L,
          hy - DIR.y * L,
          hx,
          hy,
          5 * dpr,
          0.55,
          GOLD,
        );
        streak(
          ctx,
          hx - DIR.x * L * 0.6,
          hy - DIR.y * L * 0.6,
          hx,
          hy,
          2 * dpr,
          1,
          "255,255,255",
        );
        glowDot(ctx, hx, hy, 60 * dpr, GOLD, 0.55);
        glowDot(ctx, hx, hy, 16 * dpr, "255,255,255", 1);
        if (Math.random() < 0.9)
          for (let i = 0; i < 3; i++)
            particles.push({
              x: h.x,
              y: h.y,
              vx: rnd(-0.25, 0.25) - DIR.x * 0.05,
              vy: rnd(-0.25, 0.25) - DIR.y * 0.05,
              born: t,
              life: rnd(300, 700),
              r: rnd(1, 2.4),
              col: Math.random() < 0.5 ? GOLD : CYAN,
            });
      }

      // キラキラに飛び込む小さな星: 着くと輪と火花を出して弾け、ロゴの星の形に戻る
      for (const c of comets) {
        const st = c.land - c.dur;
        const p = (t - st) / c.dur;
        if (p > 0 && p < 1) {
          const e = ease(p);
          const e2 = ease(Math.max(0, p - 0.18));
          const [a1, b1] = toStage(
            c.sx + (c.s[0] - c.sx) * e2,
            c.sy + (c.s[1] - c.sy) * e2,
          );
          const [a2, b2] = toStage(
            c.sx + (c.s[0] - c.sx) * e,
            c.sy + (c.s[1] - c.sy) * e,
          );
          streak(ctx, a1, b1, a2, b2, 2.2 * dpr, 0.9, CYAN);
          glowDot(ctx, a2, b2, 14 * dpr, "255,255,255", 0.95);
        }
        if (p >= 1 && !c.burst) {
          c.burst = true;
          for (let i = 0; i < 14; i++) {
            const a = rnd(0, 6.283);
            const v = rnd(0.15, 0.55);
            particles.push({
              x: c.s[0],
              y: c.s[1],
              vx: Math.cos(a) * v,
              vy: Math.sin(a) * v,
              born: t,
              life: rnd(350, 750),
              r: rnd(1, 2.2),
              col: "255,236,190",
            });
          }
        }
        const k = (t - c.land) / 420;
        if (k >= 0 && k < 1.75) {
          const [x, y] = toStage(c.s[0], c.s[1]);
          const s =
            k < 0.55
              ? ease(k / 0.55) * 1.6
              : k < 1
                ? 1.6 - 0.6 * ease((k - 0.55) / 0.45)
                : 1;
          const fade = k < 1 ? 1 : 1 - (k - 1) / 0.75;
          const r = c.s[2] * sc * s * 1.4;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(k < 1 ? ((1 - ease(k)) * Math.PI) / 4 : 0);
          glowDot(ctx, 0, 0, r * 2.2, GOLD, 0.75 * fade);
          const a = c.s[4] ? (k < 1 ? 1 - ease(k) : 0) : fade;
          ctx.fillStyle = `rgba(255,255,255,${a})`;
          sparkPath(ctx, 0, 0, r);
          ctx.fill();
          ctx.restore();
          if (k < 1) {
            ctx.strokeStyle = `rgba(${CYAN},${1 - k})`;
            ctx.lineWidth = 1.5 * dpr;
            ctx.beginPath();
            ctx.arc(x, y, c.s[2] * sc * (1 + k * 3), 0, 6.283);
            ctx.stroke();
          }
        }
      }

      // 火花
      particles = particles.filter((p) => t - p.born < p.life);
      for (const p of particles) {
        const age = t - p.born;
        const [x, y] = toStage(p.x + p.vx * age, p.y + p.vy * age);
        glowDot(ctx, x, y, p.r * 4 * dpr, p.col, (1 - age / p.life) * 0.8);
      }

      // 完成の瞬間に、まん中が一瞬光る
      if (t > FLASH_MS && t < REVEAL_END_MS) {
        const a = 0.32 * (1 - (t - FLASH_MS) / (REVEAL_END_MS - FLASH_MS));
        const g = ctx.createRadialGradient(
          W / 2,
          H / 2,
          0,
          W / 2,
          H / 2,
          Math.max(W, H) * 0.7,
        );
        g.addColorStop(0, `rgba(255,250,235,${a})`);
        g.addColorStop(1, "rgba(255,250,235,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalCompositeOperation = "source-over";

      // 終わったらロゴ画像に入れ替えて、描くのをやめる
      if (t >= REVEAL_END_MS) {
        setDone(true);
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    let ro: ResizeObserver | undefined;
    Promise.all([
      loadImage("/reveal/letters.png"),
      loadImage("/reveal/stars.png"),
    ])
      .then(([l, s]) => {
        if (stopped) return;
        letters = l;
        stars = s;
        layout();
        ro = new ResizeObserver(layout);
        ro.observe(wrap);
        raf = requestAnimationFrame(frame);
      })
      // 絵が読めなければ、アニメーションなしでロゴを出す
      .catch(() => {
        const r = wrap.getBoundingClientRect();
        setRect(logoImageRect(revealLayout(r.width, r.height)));
        setDone(true);
      });

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        aria-hidden
        className="absolute inset-0 h-full w-full"
        style={{ opacity: done ? 0 : 1 }}
      />
      {rect && (
        // 入口ページのロゴと同じ名前。移るときに位置と大きさが滑らかに変わる
        <ViewTransition name="festival-title" share="intro-morph">
          <h1
            className="absolute m-0"
            style={{ ...rect, opacity: done ? 1 : 0 }}
          >
            <span className="sr-only">{eventYear} 北九州高専 高専祭</span>
            <Image
              src="/catchcopy-offwhite.png"
              alt="ST@R G4ZER"
              width={LOGO_IMAGE.width}
              height={LOGO_IMAGE.height}
              priority
              className="h-full w-full"
            />
          </h1>
        </ViewTransition>
      )}
    </div>
  );
}
