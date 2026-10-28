import Link from "next/link";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import { PinEditor } from "./PinEditor";

/** ブースの位置を、地図の上でピンを動かしてまとめて直す(管理者だけ) */
export default async function BoothMapPage() {
  const auth = await requireRole(["Admin"]);
  if (!auth.ok) {
    return (
      <ConsoleMessage title="地図で位置を直す">{auth.message}</ConsoleMessage>
    );
  }
  const booths = await manageRequest<{ booths: BoothResponse[] }>("/booths");
  if (!booths.ok) {
    return (
      <ConsoleMessage title="地図で位置を直す">
        {failureMessage(booths.reason)}
      </ConsoleMessage>
    );
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-3xl">地図で位置を直す</h1>
        <Link href="/manage/booths" className="text-gray-600 text-sm underline">
          ブース管理へ戻る
        </Link>
      </div>
      <PinEditor booths={booths.data.booths} />
    </div>
  );
}
