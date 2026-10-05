import { loadMyBooth } from "@/app/actions/my-booth";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";

/** 自分のブース(混雑度・ブースの説明)の共通部分。ブース名と場所を上に出す */
export default async function MyBoothLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
      {children}
    </div>
  );
}
