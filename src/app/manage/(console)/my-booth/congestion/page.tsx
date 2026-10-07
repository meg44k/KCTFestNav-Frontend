import { loadMyBooth } from "@/app/actions/my-booth";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { UpdatedAgo } from "@/components/manage/UpdatedAgo";
import { CongestionButtons } from "../CongestionButtons";

export default async function MyBoothCongestionPage() {
  const res = await loadMyBooth();
  if (!res.ok) {
    return <ConsoleMessage title="混雑度">{res.message}</ConsoleMessage>;
  }
  const { booth } = res;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">いまの混雑度</h2>
      <CongestionButtons
        boothId={booth.id}
        current={booth.congestion_status}
        organizer={booth.organizer}
      />
      <UpdatedAgo
        key={booth.congestion_updated_at ?? "never"}
        updatedAt={booth.congestion_updated_at}
        status={booth.congestion_status}
        serverNow={Date.now()}
      />
    </section>
  );
}
