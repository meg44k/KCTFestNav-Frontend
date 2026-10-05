import { redirect } from "next/navigation";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { homePathFor, type ManageUser } from "@/lib/manage/roles";

export default async function ManageHome() {
  const me = await manageRequest<ManageUser>("/auth/me");
  if (!me.ok) {
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return (
      <ConsoleMessage title="管理画面">
        {failureMessage(me.reason)}
      </ConsoleMessage>
    );
  }

  const home = homePathFor(me.data.role);
  if (home) redirect(home);
  // Member など。ヘッダーのログアウトから別のアカウントで入り直せる
  return (
    <ConsoleMessage title="管理画面の権限がありません">
      担当者用のアカウントでログインし直してください。
    </ConsoleMessage>
  );
}
