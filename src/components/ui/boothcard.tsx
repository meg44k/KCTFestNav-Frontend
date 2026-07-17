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
    <div>
      <div
        className={cn(
          "relative flex justify-center items-center right-0 w-30 h-6 bg-white rounded-t-md",
          {
            "bg-[#00B894] border-l border-[#00ffcc]":
              congestionStatus === "empty",
            "bg-[#FDCB6E] border-l border-[#ffe3af]":
              congestionStatus === "clouded",
            "bg-[#e54141] border-l border-[#ff7d7d]":
              congestionStatus === "veryClouded",
          },
        )}
      >
        <span className="text-black/60 text-xs font-bold whitespace-nowrap origin-center">
          {congestionStatusMessage}
        </span>
      </div>
      <div
        className={cn(
          "relative rounded-b-md rounded-r-md w-80 h-30 bg-[#00B894] p-1 ",
          {
            "bg-[#00B894] border-l border-[#00ffcc]":
              congestionStatus === "empty",
            "bg-[#FDCB6E] border-l border-[#ffe3af]":
              congestionStatus === "clouded",
            "bg-[#e54141] border-l border-[#ff7d7d]":
              congestionStatus === "veryClouded",
          },
        )}
      >
        <div className="flex flex-row bg-[#ffffff] rounded-sm h-full w-full shadow-2xl p-2">
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
    </div>
  );
}

export { BoothCard };
