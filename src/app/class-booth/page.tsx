import { BoothCard } from "@/components/ui/boothcard";
export default function ClassBooth() {
  return (
    <div>
      <h1>クラス展示</h1>
      {/* スワイプして学年を切り替えれるスライドショーみたいな感じにする */}
      <div>
        <h2>1年生</h2>
        <BoothCard
          name="1-1"
          description="クラスの説明"
          imageUrl=""
          imageAlt=""
        />
      </div>
    </div>
  );
}
