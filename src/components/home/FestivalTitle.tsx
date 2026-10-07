import { ViewTransition } from "react";
import { eventYear } from "@/lib/constants";

/** タイトル画面から入口ページへ移るとき、この見出しがそのまま動いてつながるようにする目印 */
export const INTRO_TRANSITION = "intro";

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
