import Link from "next/link";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import type { StageSectionResponse } from "@/lib/api/stage";
import { StageOps } from "../StageOps";

export default async function LivesPage() {
  // 番組表の編集へのリンクは Admin にだけ出すため、役職を見る(権限の確認は layout でも済んでいる)
  const auth = await requireRole(["Admin", "Gakuseikai"]);
  if (!auth.ok) {
    return <ConsoleMessage title="ライブ">{auth.message}</ConsoleMessage>;
  }
  const stage = await manageRequest<{ sections: StageSectionResponse[] }>(
    "/stage",
  );
  if (!stage.ok) {
    return (
      <ConsoleMessage title="ライブ">
        {failureMessage(stage.reason)}
      </ConsoleMessage>
    );
  }
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-extrabold text-3xl">ライブ</h1>
        {auth.user.role === "Admin" && (
          <Link
            href="/manage/ops/lives/edit"
            className="rounded-md border border-black/20 px-4 py-2 font-bold"
          >
            番組表を編集
          </Link>
        )}
      </div>
      <p className="text-gray-600 text-sm">
        バンドが替わったら「次のバンドへ」を押してください。来場者の画面に「LIVE」として表示されます。
      </p>
      <StageOps sections={stage.data.sections} serverNow={Date.now()} />
    </>
  );
}
