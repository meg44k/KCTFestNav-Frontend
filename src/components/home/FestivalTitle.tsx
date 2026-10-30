import Image from "next/image";
import { ViewTransition } from "react";
import { eventYear } from "@/lib/constants";

// ロゴの上の「北九州高専」と下の「高専祭 2026」。文字で書くと、フォント(Zen Kaku Gothic New)が
// ページの読み込みの後に届いて切り替わる瞬間に位置がずれるので、切り替わった後の見た目を画像にしたもの。
// 位置と幅はロゴの幅に対する割合(cqw)。前の文字のときと同じ所に置く
const CAPTIONS = [
  {
    src: "/catchcopy-caption-top.png",
    width: 448,
    height: 120,
    style: { left: "5.54cqw", top: "-4.89cqw", width: "41.25cqw" },
  },
  {
    src: "/catchcopy-caption-bottom.png",
    width: 484,
    height: 120,
    style: { left: "49.64cqw", top: "43.69cqw", width: "44.82cqw" },
  },
];

/**
 * 入口ページのタイトル。キャッチコピーのロゴ「ST@R G4ZER」。
 * タイトル画面の最後のロゴ画像と同じ名前をロゴ画像だけに付け、移るときに画像から画像へ
 * 位置と大きさが滑らかに変わるようにする(見出し全体に付けると箱の形が違って伸び縮みして見える)
 */
export function CatchcopyTitle({ className }: { className?: string }) {
  return (
    <h1 className={className}>
      <span className="sr-only">{eventYear} 北九州高専 高専祭</span>
      {/* ロゴの上に学校名、下に祭の名前・年の画像(読み上げは上の見出しがあるので飾り扱い) */}
      {/*
          ロゴの幅は、横幅(最大 17rem)と、置き場所の高さ(上下の文字の分を除く)に収まる大きい方。
          高さの低いスマホでは小さくなり、入口ページが 1 画面に収まる
        */}
      <span
        // ロゴの幅を基準に上下の文字の大きさも決める(ロゴが縮んだら文字も縮む)
        className="relative mx-auto block [container-type:inline-size]"
        style={{
          // 上と下の文字(それぞれロゴの幅の約 9%)の分を除いた高さに収める
          width: "min(17rem, 100cqw, calc(100cqh * 992 / 528 / 1.34))",
        }}
      >
        <ViewTransition name="festival-title" share="intro-morph">
          <Image
            src="/catchcopy-offwhite.png"
            alt="ST@R G4ZER"
            width={992}
            height={528}
            priority
            className="h-auto w-full"
          />
        </ViewTransition>
        {CAPTIONS.map((c) => (
          <Image
            key={c.src}
            src={c.src}
            alt=""
            width={c.width}
            height={c.height}
            preload
            className="absolute h-auto"
            style={c.style}
          />
        ))}
      </span>
    </h1>
  );
}
