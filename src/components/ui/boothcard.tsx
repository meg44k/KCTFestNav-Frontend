import Image from "next/image";
import { cn } from "@/lib/utils";
import { NaviButton } from "./naviButton";

function BoothCard({
  name,
  description,
  imageUrl,
  imageAlt,
  congestionStatus,
  latitude,
  longitude,
}: {
  name: string;
  description: string;
  // バックエンドは画像未設定のブースを空文字で返すため任意にする
  imageUrl?: string;
  imageAlt: string;
  // 座標・混雑度がまだ用意できていないブースもあるため任意にする
  congestionStatus?: string;
  latitude?: number;
  longitude?: number;
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
            {imageUrl && (
              <Image
                alt={imageAlt}
                src={imageUrl}
                fill
                sizes="120px"
                className="object-cover"
              ></Image>
            )}
          </div>
          <div className="flex flex-col mr-auto">
            <span className="text-black">{name}</span>
            <span className="text-black text-sm">{description}</span>
            {latitude !== undefined && longitude !== undefined && (
              <NaviButton
                latitude={latitude}
                longitude={longitude}
                name={name}
                className="absolute bottom-3 right-3"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { BoothCard };
