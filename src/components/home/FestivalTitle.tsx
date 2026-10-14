import Image from "next/image";
import { ViewTransition } from "react";
import { eventYear } from "@/lib/constants";
import { OFF_WHITE } from "@/lib/home/palette";

const CAPTION =
  "absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold leading-none tracking-widest";
// ロゴの幅 272px のとき約 20px
const captionStyle = { fontSize: "7.5cqw", color: OFF_WHITE };

/**
 * 入口ページのタイトル。キャッチコピーのロゴ「ST@R G4ZER」。
 * タイトル画面の文字と同じ名前を付け、移るときに文字からロゴへ滑らかに変わるようにする
 */
export function CatchcopyTitle({ className }: { className?: string }) {
  return (
    <ViewTransition name="festival-title" share="intro-morph">
      <h1 className={className}>
        <span className="sr-only">{eventYear} 北九州高専 高専祭</span>
        {/* ロゴの上に学校名、下に祭の名前・年(読み上げは上の見出しがあるので飾り扱い) */}
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
          <Image
            src="/catchcopy-offwhite.png"
            alt="ST@R G4ZER"
            width={992}
            height={528}
            priority
            className="h-auto w-full"
          />
          {/*
            「北九州高専 高専祭 2026」の 1 行のうち、「北九州高専」だけをロゴの上に、
            「高専祭 2026」をロゴの下に置く。同じ 1 行を上と下に置いて見せる所だけを変えるので、
            それぞれの左右の位置は 1 行でまん中にそろえたときのまま
          */}
          <span
            aria-hidden
            // ロゴの「T」の横棒(画像の上から 14%)の少し上。星の線に少しかかってもよい
            className={CAPTION}
            style={{ ...captionStyle, bottom: "calc(86% + 3cqw)" }}
          >
            北九州高専<span className="invisible"> 高専祭 {eventYear}</span>
          </span>
          <span
            aria-hidden
            // ロゴの文字(GAZER)の下の端(画像の上から 83%)のすぐ下
            className={CAPTION}
            style={{ ...captionStyle, top: "calc(83.2% + 1.25cqw)" }}
          >
            <span className="invisible">北九州高専 </span>高専祭 {eventYear}
          </span>
        </span>
      </h1>
    </ViewTransition>
  );
}
