import { loadMyBooth } from "@/app/actions/my-booth";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { DetailForm } from "../DetailForm";

export default async function MyBoothDetailPage() {
  const res = await loadMyBooth();
  if (!res.ok) {
    return <ConsoleMessage title="ブースの説明">{res.message}</ConsoleMessage>;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-bold">説明と画像</h2>
      <DetailForm booth={res.booth} />
    </section>
  );
}
