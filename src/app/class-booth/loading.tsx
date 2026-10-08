import { PageTitle } from "@/components/layout/PageTitle";

export default function Loading() {
  return (
    <div>
      <PageTitle>クラス展示</PageTitle>
      <p className="flex justify-center mt-10 text-gray-400">読み込み中...</p>
    </div>
  );
}
