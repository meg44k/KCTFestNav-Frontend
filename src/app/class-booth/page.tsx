import { fetchBooths } from "@/lib/api/booths";
import { type GradeGroup, groupBoothsByGrade } from "@/lib/booth-grade";
import ClassBooth from "./ClassBooth";

// 混雑度が随時変わるため常にリクエスト時に描画する。
// これが無いとビルド時に静的生成が試みられ、cache:"no-store" の fetch が
// 投げる DynamicServerError を下の catch が拾ってしまう
export const dynamic = "force-dynamic";

export default async function ClassBoothPage() {
  let gradeGroups: GradeGroup[] = [];
  let loadFailed = false;

  try {
    // 混雑度が随時変わるためキャッシュしない
    const booths = await fetchBooths({ cache: "no-store" });
    gradeGroups = groupBoothsByGrade(booths);
  } catch (e) {
    // APIが落ちていてもページ全体を500にせず、画面は出したうえで案内を表示する
    console.error("ブース一覧の取得に失敗しました", e);
    loadFailed = true;
  }

  return <ClassBooth gradeGroups={gradeGroups} loadFailed={loadFailed} />;
}
