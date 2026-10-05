import { redirect } from "next/navigation";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, fetchMe } from "@/lib/api/manage";
import { homePathFor } from "@/lib/manage/roles";

export default async function ManageHome() {
  const me = await fetchMe();
  if (!me.ok) {
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return (
      <ConsoleMessage title="管理画面">
        <p>{failureMessage(me.reason)}</p>
        {/* ヘッダーが出ないので、ここからログインし直せるようにする */}
        <a href="/manage/logout" className="inline-block mt-4 underline">
          ログインし直す
        </a>
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
