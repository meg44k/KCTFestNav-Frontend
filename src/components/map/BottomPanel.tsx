"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * 地図の下から出るカードや棟の一覧の入れ物。中身が変わっても作り直さず、高さだけを動かす。
 * 開くときは 0 から、入れ替えるときは今の高さから新しい高さへ、ゴムのように少し行き過ぎて戻る。
 * 閉じるときは 0 へ下がる(下がりきるまで前の中身を出しておく)
 */
export function BottomPanel({
  children,
  contentKey,
}: {
  children: ReactNode;
  /** 中身を見分ける値。変わったのに高さが同じときは、入れ替わったと分かるよう軽く弾ませる */
  contentKey?: string | null;
}) {
  const open =
    children !== null && children !== undefined && children !== false;
  // 閉じる間も前の中身を出しておく
  const last = useRef<ReactNode>(children);
  useEffect(() => {
    if (open) last.current = children;
  });
  const inner = useRef<HTMLDivElement>(null);
  const outer = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  const heightRef = useRef(0);
  useEffect(() => {
    heightRef.current = height;
  });
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // 開いたまま中身が変わり、高さがほとんど変わらないときだけ弾ませる
  // (高さが変わるときは、高さの動きそのものが弾む)
  const prevKey = useRef(contentKey);
  useEffect(() => {
    const before = prevKey.current;
    prevKey.current = contentKey;
    if (!contentKey || !before || before === contentKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const h = heightRef.current;
    const frame = requestAnimationFrame(() => {
      const el = inner.current;
      if (!el || !outer.current || Math.abs(el.offsetHeight - h) > 4) return;
      outer.current.animate(
        [
          { height: `${h}px` },
          { height: `${h + 10}px`, offset: 0.4 },
          { height: `${h - 3}px`, offset: 0.75 },
          { height: `${h}px` },
        ],
        { duration: 380, easing: "ease-out" },
      );
    });
    return () => cancelAnimationFrame(frame);
  }, [contentKey]);

  return (
    <div
      ref={outer}
      className="bottom-panel overflow-hidden"
      style={{
        height: open ? height : 0,
        transitionTimingFunction: open
          ? // 少し行き過ぎて戻る
            "cubic-bezier(0.3, 1.35, 0.5, 1)"
          : "cubic-bezier(0.4, 0, 1, 1)",
      }}
      aria-hidden={!open}
    >
      <div ref={inner} className={open ? "" : "pointer-events-none"}>
        {open ? children : last.current}
      </div>
    </div>
  );
}
