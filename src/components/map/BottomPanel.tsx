"use client";

import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// 少し行き過ぎて戻る(ゴムのような)動き
const BOUNCE = { duration: 320, easing: "ease-out" } as const;
const bounceFrom = (startPx: number) => [
  { transform: `translateY(${startPx}px)` },
  { transform: "translateY(-10px)", offset: 0.65 },
  { transform: "translateY(3px)", offset: 0.85 },
  { transform: "translateY(0)" },
];

/**
 * 地図の下から出るカードや棟の一覧の入れ物。中身は画面の下にくっつけて置き、位置だけを動かす。
 * - 開くとき: 画面の下から出てくる
 * - 入れ替えるとき: 前の中身の上端の位置から、新しい中身の位置へ動く(0 に戻らない)
 * - 同じ高さに入れ替えたとき: その場で軽く弾む
 * - 閉じるとき: 画面の下へ下がる(下がりきるまで前の中身を出しておく)
 * どれも少し行き過ぎて戻る。高さで切り取らないので、動いている途中に中身の下が欠けない
 */
export function BottomPanel({
  children,
  contentKey,
}: {
  children: ReactNode;
  /** 中身を見分ける値。null は閉じている */
  contentKey: string | null;
}) {
  const open = contentKey !== null;
  // 閉じる間も前の中身を出しておく
  const last = useRef<ReactNode>(null);
  useEffect(() => {
    if (open) last.current = children;
  });
  // 画面に出しているか(閉じるときは下がりきるまで true)
  const [present, setPresent] = useState(open);
  const box = useRef<HTMLDivElement>(null);
  // 前に出していた中身の高さ(閉じているときは 0)
  const lastHeight = useRef(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 中身が入れ替わったときだけ動かす
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const before = lastHeight.current;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (!open) {
      lastHeight.current = 0;
      if (before === 0 || reduce) {
        setPresent(false);
        return;
      }
      const anim = el.animate(
        [
          { transform: "translateY(0)" },
          { transform: `translateY(${before}px)` },
        ],
        { duration: 180, easing: "ease-in", fill: "forwards" },
      );
      anim.onfinish = () => setPresent(false);
      return () => anim.cancel();
    }
    setPresent(true);
    const after = el.offsetHeight;
    lastHeight.current = after;
    if (reduce) return;
    // 開くときは画面の下(自分の高さ分下)から、入れ替えは前の上端の位置から
    const start = before === 0 ? after : after - before;
    el.animate(bounceFrom(Math.abs(start) < 4 ? 0 : start), BOUNCE);
  }, [contentKey]);

  if (!open && !present) return null;
  return (
    <div ref={box} data-bottom-panel aria-hidden={!open}>
      {open ? children : last.current}
    </div>
  );
}
