import Image from "next/image";
import { ViewTransition } from "react";
import { eventYear } from "@/lib/constants";
import { OFF_WHITE } from "@/lib/home/palette";

/**
 * 「2026 北九州高専 / 高専祭」。タイトル画面と入口ページで同じ名前を付け、
 * 移るときに位置と大きさが滑らかに変わるようにする
 */
export function FestivalTitle({ className }: { className?: string }) {
  return (
    <ViewTransition name="festival-title" share="intro-morph">
      <h1 className={className}>
        <span className="block">{eventYear} 北九州高専</span>
        <span className="block font-extrabold text-5xl">高専祭</span>
      </h1>
    </ViewTransition>
  );
}

/**
 * 入口ページのタイトル。キャッチコピーのロゴ「ST@R G4ZER」。
 * タイトル画面の文字と同じ名前を付け、移るときに文字からロゴへ滑らかに変わるようにする
 */
export function CatchcopyTitle({ className }: { className?: string }) {
  return (
    <ViewTransition name="festival-title" share="intro-morph">
      <h1 className={className}>
        <span className="sr-only">{eventYear} 北九州高専 高専祭</span>
        {/* ロゴの下のまん中に学校名・祭の名前・年(読み上げは上の見出しがあるので飾り扱い) */}
        {/*
          ロゴの幅は、横幅(最大 20rem)と、置き場所の高さ(下の文字の分 28px を除く)に収まる大きい方。
          高さの低いスマホでは小さくなり、入口ページが 1 画面に収まる
        */}
        <span
          // ロゴの幅を基準に下の文字の大きさも決める(ロゴが縮んだら文字も縮む)
          className="relative mx-auto block [container-type:inline-size]"
          style={{
            // 下の文字(ロゴの幅の約 9%)の分を除いた高さに収める
            width: "min(20rem, 100cqw, calc(100cqh * 992 / 528 / 1.17))",
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
          <span
            aria-hidden
            // ロゴの文字(GAZER)の下の端(画像の上から 83%)のすぐ下に置く。左下の星の線には少しかかってよい
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-bold leading-none tracking-widest"
            // ロゴの幅 320px のとき 24px
            style={{
              top: "calc(83.2% + 1.25cqw)",
              fontSize: "7.5cqw",
              color: OFF_WHITE,
            }}
          >
            北九州高専 高専祭 {eventYear}
          </span>
        </span>
      </h1>
    </ViewTransition>
  );
}
