import { redirect } from "next/navigation";
import { ConsoleHeader } from "@/components/manage/ConsoleHeader";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, fetchMe } from "@/lib/api/manage";
import { menuFor } from "@/lib/manage/roles";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await fetchMe();
  if (!me.ok) {
    // 期限切れ・不正なトークンは Cookie を消してログインし直してもらう
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

  return (
    <div className="flex flex-1 flex-col min-h-full">
      <ConsoleHeader user={me.data} menu={menuFor(me.data.role)} />
      {/* 中身は白地に黒文字。ボタンなどが使う背景・文字の色もこの中だけ白・黒にする */}
      <main className="flex-1 px-4 py-6 bg-white text-black [--background:oklch(1_0_0)] [--foreground:oklch(0.145_0_0)]">
        {children}
      </main>
    </div>
  );
}
