import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { BoothCard } from "@/components/ui/boothcard";
import { type Booth, fetchBooths } from "@/lib/api/booths";
import { filterClubBooths } from "@/lib/booth-grade";

// 混雑度が随時変わるため常にリクエスト時に描画する。
// これが無いとビルド時に静的生成が試みられ、cache:"no-store" の fetch が
// 投げる DynamicServerError を下の catch が拾ってしまう
export const dynamic = "force-dynamic";

export default async function BazaarPage() {
  let booths: Booth[] = [];
  let loadFailed = false;

  try {
    // 混雑度が随時変わるためキャッシュしない
    booths = filterClubBooths(await fetchBooths({ cache: "no-store" }));
  } catch (e) {
    // APIが落ちていてもページ全体を500にせず、画面は出したうえで案内を表示する
    console.error("ブース一覧の取得に失敗しました", e);
    loadFailed = true;
  }

  return (
    <div>
      <SideMenu />
      <h1 className="flex justify-center font-extrabold text-4xl">
        クラブバザー
      </h1>

      {loadFailed ? (
        <p className="flex justify-center mt-10 text-gray-400">
          ブース情報を読み込めませんでした。時間をおいて再度お試しください。
        </p>
      ) : booths.length === 0 ? (
        <p className="flex justify-center mt-10 text-gray-400">
          公開されているクラブバザーはまだありません。
        </p>
      ) : (
        <div className="flex flex-col gap-3 items-center mt-6">
          {booths.map((booth) => (
            <BoothCard
              key={booth.id}
              name={booth.name}
              description={booth.description}
              organizer={booth.organizer}
              imageUrl={booth.imageUrl}
              imageAlt={booth.name}
              congestionStatus={booth.congestionStatus}
              latitude={booth.latitude}
              longitude={booth.longitude}
            />
          ))}
        </div>
      )}
    </div>
  );
}
