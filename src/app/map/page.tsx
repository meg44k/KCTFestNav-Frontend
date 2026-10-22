import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { LikesProvider } from "@/components/likes/LikesProvider";
import { CampusMap } from "@/components/map/CampusMap";
import { RefreshEvery } from "@/components/RefreshEvery";
import { type Booth, fetchBooths } from "@/lib/api/booths";
import { parseMapQuery, resolveInitial } from "@/lib/map/map-booths";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let booths: Booth[] = [];
  let loadFailed = false;
  try {
    // 混雑度が変わるので、キャッシュしない
    booths = await fetchBooths({ cache: "no-store" });
  } catch (e) {
    // API が落ちていても地図は出す
    console.error("ブースの取得に失敗しました", e);
    loadFailed = true;
  }
  const initial = resolveInitial(parseMapQuery(await searchParams), booths);
  return (
    <div>
      <LikesProvider>
        <CampusMap booths={booths} initial={initial} loadFailed={loadFailed} />
      </LikesProvider>
      <SideMenu />
      <RefreshEvery seconds={60} />
    </div>
  );
}
