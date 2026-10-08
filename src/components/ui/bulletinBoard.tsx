import { DotGothic16 } from "next/font/google";
import { Marquee } from "@/components/ui/marquee";

const dotGothic = DotGothic16({
  weight: "400",
  subsets: ["latin"],
});

function BulletinBoard({ content }: { content: string }) {
  return (
    <div className="border-y-1 border-amber-400">
      <Marquee className={dotGothic.className}>
        <span className="text-amber-400">{content}</span>
      </Marquee>
    </div>
  );
}

export { BulletinBoard };
