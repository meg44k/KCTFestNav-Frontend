import { BoothBrowser } from "@/components/booths/BoothBrowser";
import { type Booth, fetchBooths } from "@/lib/api/booths";
import { type BoothType, parseFilters } from "@/lib/booth-browser";

/** クラス展示・クラブバザーのページ本体。最初に選ぶ種類だけが違う */
export async function BoothBrowserPage({
  defaultType,
  searchParams,
}: {
  defaultType: BoothType;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  let booths: Booth[] = [];
  let loadFailed = false;
  try {
    // 混雑度が随時変わるためキャッシュしない
    booths = await fetchBooths({ cache: "no-store" });
  } catch (e) {
    // APIが落ちていてもページ全体を500にせず、画面は出したうえで案内を表示する
    console.error("ブース一覧の取得に失敗しました", e);
    loadFailed = true;
  }

  return (
    <BoothBrowser
      booths={booths}
      loadFailed={loadFailed}
      defaultType={defaultType}
      initialFilters={parseFilters(await searchParams, defaultType)}
      serverNow={Date.now()}
    />
  );
}
