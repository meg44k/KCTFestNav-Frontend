import Image from "next/image";
import { ViewTransition } from "react";
import { eventYear } from "@/lib/constants";

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
        {/* ロゴの右下に小さく年と名前(読み上げは上の見出しがあるので飾り扱い) */}
        <span className="relative mx-auto block w-full max-w-80">
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
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap font-bold text-[#F4F1EA] text-2xl tracking-widest"
          >
            北九州高専 高専祭 {eventYear}
          </span>
        </span>
      </h1>
    </ViewTransition>
  );
}
