import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { AnnouncementForm } from "../AnnouncementForm";

export default async function AnnouncementPage() {
  const res = await manageRequest<{ content: string }>("/announcements");
  if (!res.ok) {
    return (
      <ConsoleMessage title="お知らせ">
        {failureMessage(res.reason)}
      </ConsoleMessage>
    );
  }
  return (
    <>
      <h1 className="font-extrabold text-3xl">お知らせ</h1>
      <AnnouncementForm current={res.data.content} />
    </>
  );
}
