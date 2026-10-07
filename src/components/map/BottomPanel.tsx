"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";

/**
 * 地図の下から出るカードや棟の一覧の入れ物。中身が変わっても作り直さず、高さだけを動かす。
 * 開くときは 0 から、入れ替えるときは今の高さから新しい高さへ、ゴムのように少し行き過ぎて戻る。
 * 閉じるときは 0 へ下がる(下がりきるまで前の中身を出しておく)
 */
export function BottomPanel({ children }: { children: ReactNode }) {
  const open =
    children !== null && children !== undefined && children !== false;
  // 閉じる間も前の中身を出しておく
  const last = useRef<ReactNode>(children);
  useEffect(() => {
    if (open) last.current = children;
  });
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
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
