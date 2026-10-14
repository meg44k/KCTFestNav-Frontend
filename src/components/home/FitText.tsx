"use client";

import { type CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { fitScale } from "@/lib/home/fit-text";

/**
 * 1 行の文字。長くて幅に入らないときだけ、入るまで小さくする(「…」で切らない)。
 * 小さくしすぎると読めないので下限で止め、それでも入らなければ折り返す。
 * fontSize は案の大きさ(u(…) など)。画面の幅が変わったら測り直す
 */
export function FitText({
  children,
  fontSize,
  className,
  style,
}: {
  children: string;
  fontSize: string;
  className?: string;
  style?: CSSProperties;
}) {
  const box = useRef<HTMLSpanElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);
  // 下限まで小さくしても入らないほど長いときは、「…」で切らずに折り返す
  const [wrap, setWrap] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 文字が変わったら測り直す
  useLayoutEffect(() => {
    const outer = box.current;
    const inner = text.current;
    if (!outer || !inner) return;
    const measure = () => {
      // 案の大きさのときの幅で比べる。測ったら今の大きさに戻す(React が付けた値を消さない)
      const current = inner.style.fontSize;
      const whiteSpace = inner.style.whiteSpace;
      inner.style.fontSize = fontSize;
      inner.style.whiteSpace = "nowrap";
      const natural = inner.scrollWidth;
      inner.style.fontSize = current;
      inner.style.whiteSpace = whiteSpace;
      const next = fitScale(outer.clientWidth, natural);
      setScale(next);
      setWrap(natural * next > outer.clientWidth + 0.5);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [children, fontSize]);

  return (
    <span
      ref={box}
      className={`block min-w-0 ${className ?? ""}`}
      style={style}
    >
      <span
        ref={text}
        className={
          wrap ? "block break-words" : "block overflow-hidden whitespace-nowrap"
        }
        style={{ fontSize: `calc(${fontSize} * ${scale})` }}
      >
        {children}
      </span>
    </span>
  );
}
