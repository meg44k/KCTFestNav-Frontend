import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, fetchMe, manageRequest } from "@/lib/api/manage";
import { type LikesResponse, rankRows } from "@/lib/manage/likes";
import { LikesMonitor } from "../LikesMonitor";

export default async function LikesPage() {
  const [likes, me] = await Promise.all([
    manageRequest<LikesResponse>("/manage/likes"),
    fetchMe(),
  ]);
  if (!likes.ok) {
    return (
      <ConsoleMessage title="いいね">
        {failureMessage(likes.reason)}
      </ConsoleMessage>
    );
  }
  return (
    <>
      <h1 className="font-extrabold text-3xl">いいね</h1>
      <LikesMonitor
        rows={rankRows(likes.data)}
        isAdmin={me.ok && me.data.role === "Admin"}
      />
    </>
  );
}
