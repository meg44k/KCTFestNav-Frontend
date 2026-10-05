import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { LiveResponse } from "@/lib/api/lives";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import { LiveList } from "../LiveList";

export default async function LivesPage() {
  // 追加・編集・削除は Admin にだけ出すため、役職を見る(権限の確認は layout でも済んでいる)
  const auth = await requireRole(["Admin", "Gakuseikai"]);
  if (!auth.ok) {
    return <ConsoleMessage title="ライブ">{auth.message}</ConsoleMessage>;
  }
  const lives = await manageRequest<{ lives: LiveResponse[] }>("/lives");
  if (!lives.ok) {
    return (
      <ConsoleMessage title="ライブ">
        {failureMessage(lives.reason)}
      </ConsoleMessage>
    );
  }
  const ongoing = lives.data.lives.find((l) => l.status === 1);
  return (
    <>
      <h1 className="font-extrabold text-3xl">ライブ</h1>
      <p className="rounded-lg border border-black/10 px-3 py-2">
        {ongoing ? (
          <>
            いまのライブ: <b className="text-[#e54141]">{ongoing.name}</b>
          </>
        ) : (
          <span className="text-gray-500">公演中のライブはありません</span>
        )}
      </p>
      <LiveList lives={lives.data.lives} isAdmin={auth.user.role === "Admin"} />
    </>
  );
}
