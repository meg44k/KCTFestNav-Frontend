import Image from "next/image";
import { cn } from "@/lib/utils";
import { NaviButton } from "./naviButton";

function BoothCard({
  name,
  description,
  imageUrl,
  imageAlt,
  congestionStatus,
}: {
  name: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  congestionStatus: string;
}) {
  let congestionStatusMessage: string = "空いています";
  if (congestionStatus === "empty") {
    congestionStatusMessage = "空いています";
  } else if (congestionStatus === "clouded") {
    congestionStatusMessage = "少し混んでいます";
  } else if (congestionStatus === "veryClouded") {
    congestionStatusMessage = "非常に混んでいます";
  }

  return (
    <div
      className={cn("relative rounded-md w-80 h-30 bg-[#00B894] p-1 pl-8", {
        "bg-[#00B894]": congestionStatus === "empty",
        "bg-[#FDCB6E]": congestionStatus === "clouded",
        "bg-[#D63031]": congestionStatus === "veryClouded",
      })}
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center">
        <span className="text-black/50 text-xs font-bold whitespace-nowrap rotate-90 origin-center">
          {congestionStatusMessage}
        </span>
      </div>
      <div className="flex flex-row bg-white rounded-sm h-full w-full shadow-2xl p-2">
        <div className="relative aspect-square h-full bg-gray-300 overflow-hidden mr-2 rounded-sm">
          <Image
            alt={imageAlt}
            src={imageUrl}
            fill
            className="object-cover"
          ></Image>
        </div>
        <div className="flex flex-col mr-auto">
          <span className="text-black">{name}</span>
          <span className="text-black text-sm">{description}</span>
          <NaviButton className="absolute bottom-3 right-3" />
        </div>
      </div>
    </div>
  );
}

export { BoothCard };
