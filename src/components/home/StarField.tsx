import { makeStars } from "@/lib/home/stars";

// 毎回同じ並びにする(サーバーとブラウザで食い違わないように、種は決めておく)
// スマホで細かい点がざわつかないよう、数と明るさを控えめに
const STARS = makeStars(90, 2026);
const DIM = 0.7;

/**
 * 背景の星。白い点をまだらに散らす。押せない・読み上げない飾り。
 * ふだんは入れ物いっぱい(入口ページ)。fixed にすると画面に固定し、縦に長いページでも引き伸ばさない
 */
export function StarField({ fixed = false }: { fixed?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none ${fixed ? "fixed" : "absolute"} inset-0 -z-10 h-full w-full`}
    >
      {STARS.map((s) => (
        <circle
          key={`${s.x}-${s.y}`}
          cx={`${s.x}%`}
          cy={`${s.y}%`}
          r={s.r}
          fill="#fff"
          opacity={s.opacity * DIM}
        />
      ))}
    </svg>
  );
}
