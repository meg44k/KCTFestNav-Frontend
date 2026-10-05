import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { requireRole } from "@/lib/api/manage";
import { AutoRefresh } from "./AutoRefresh";

/** 当日運営(混雑度・ライブ・お知らせ)の共通部分。自動更新を上に出す */
export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireRole(["Admin", "Gakuseikai"]);
  if (!auth.ok) {
    return <ConsoleMessage title="当日運営">{auth.message}</ConsoleMessage>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex justify-end">
        <AutoRefresh />
      </div>
      {children}
    </div>
  );
}
