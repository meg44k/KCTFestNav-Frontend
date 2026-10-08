import { BoothBrowserPage } from "@/components/booths/BoothBrowserPage";

// 混雑度が随時変わるため常にリクエスト時に描画する。
// これが無いとビルド時に静的生成が試みられ、cache:"no-store" の fetch が
// 投げる DynamicServerError を catch が拾ってしまう
export const dynamic = "force-dynamic";

export default function ClassBoothPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <BoothBrowserPage defaultType="class" searchParams={searchParams} />;
}
