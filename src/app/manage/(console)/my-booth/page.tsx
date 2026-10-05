import { loadMyBooth } from "@/app/actions/my-booth";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { UpdatedAgo } from "@/components/manage/UpdatedAgo";
import { CongestionButtons } from "./CongestionButtons";
import { DetailForm } from "./DetailForm";

export default async function MyBoothPage() {
  const res = await loadMyBooth();
  if (!res.ok) {
    return <ConsoleMessage title="自分のブース">{res.message}</ConsoleMessage>;
  }
  const { booth } = res;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="font-extrabold text-3xl">{booth.name}</h1>
        {booth.location && <p className="text-gray-500">{booth.location}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">いまの混雑度</h2>
        <CongestionButtons
          boothId={booth.id}
          current={booth.congestion_status}
        />
        <UpdatedAgo
          key={booth.congestion_updated_at ?? "never"}
          updatedAt={booth.congestion_updated_at}
          serverNow={Date.now()}
        />
      </section>
      <hr className="border-black/10" />
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">説明と画像</h2>
        <DetailForm booth={booth} />
      </section>
    </div>
  );
}
