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
        <Image
          src="/catchcopy.png"
          alt="ST@R G4ZER"
          width={992}
          height={528}
          priority
          className="mx-auto h-auto w-full max-w-80"
        />
      </h1>
    </ViewTransition>
  );
}
