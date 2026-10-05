import { XIcon } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { NaviButton } from "./naviButton";

function congestionMessageOf(congestionStatus?: string): string {
  if (congestionStatus === "clouded") return "少し混んでいます";
  if (congestionStatus === "veryClouded") return "非常に混んでいます";
  return "空いています";
}

function BoothCard({
  name,
  description,
  organizer,
  location,
  imageUrl,
  imageAlt,
  congestionStatus,
  latitude,
  longitude,
}: {
  name: string;
  description: string;
  // クラブバザーでは主催の部活名が主要な情報になるため出す。
  // クラス展示では主催者(ex. 1-1)を出さないので任意にしている
  organizer?: string;
  // 場所の説明(ex. 第一体育館)。詳細ダイアログにだけ出す
  location?: string;
  // バックエンドは画像未設定のブースを空文字で返すため任意にする
  imageUrl?: string;
  imageAlt: string;
  // 座標・混雑度がまだ用意できていないブースもあるため任意にする
  congestionStatus?: string;
  latitude?: number;
  longitude?: number;
}) {
  const congestionStatusMessage = congestionMessageOf(congestionStatus);
  const congestionColor = {
    "bg-[#00B894] border-l border-[#00ffcc]": congestionStatus === "empty",
    "bg-[#FDCB6E] border-l border-[#ffe3af]": congestionStatus === "clouded",
    "bg-[#e54141] border-l border-[#ff7d7d]":
      congestionStatus === "veryClouded",
  };

  return (
    // ナビボタンをカードの上に重ねるための基準。
    // ナビボタンを詳細ダイアログのトリガーの中に入れるとボタンが入れ子になり、
    // タップが両方に伝わってしまうため、トリガーの外に出して重ねている
    <div className="relative w-fit">
      <Dialog>
        <DialogTrigger
          className="block text-left cursor-pointer"
          aria-label={`${name}の詳細を見る`}
        >
          <div
            className={cn(
              "relative flex justify-center items-center right-0 w-30 h-6 bg-white rounded-t-md",
              congestionColor,
            )}
          >
            <span className="text-black/60 text-xs font-bold whitespace-nowrap origin-center">
              {congestionStatusMessage}
            </span>
          </div>
          <div
            className={cn(
              "relative rounded-b-md rounded-r-md w-80 h-30 bg-[#00B894] p-1 ",
              congestionColor,
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
                {/* 全文はタップで開く詳細ダイアログで読めるため、カードでは1行に抑える */}
                <span className="text-black text-sm line-clamp-1">
                  {description}
                </span>
                {organizer && (
                  <span className="text-black/60 text-xs">{organizer}</span>
                )}
              </div>
            </div>
          </div>
        </DialogTrigger>

        {/* ミニカードと同じ構成(混雑度のタブ + 色の枠 + 白い中身)を大きくしたもの */}
        <DialogContent
          showCloseButton={false}
          className="min-w-[85dvw] md:min-w-100 bg-transparent p-0 ring-0 text-black"
        >
          <div>
            <div
              className={cn(
                "flex justify-center items-center w-30 h-6 bg-white rounded-t-md",
                congestionColor,
              )}
            >
              <span className="text-black/60 text-xs font-bold whitespace-nowrap">
                {congestionStatusMessage}
              </span>
            </div>
            <div
              className={cn(
                "rounded-b-md rounded-r-md bg-[#00B894] p-1",
                congestionColor,
              )}
            >
              <div className="relative flex flex-col gap-3 bg-white rounded-sm p-3 shadow-2xl">
                {/* 画像の上に重なっても見えるよう背景を敷く */}
                <DialogClose
                  aria-label="閉じる"
                  className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
                >
                  <XIcon className="size-5" />
                </DialogClose>
                <div className="relative w-full aspect-video bg-gray-300 rounded-sm overflow-hidden">
                  {imageUrl && (
                    <Image
                      alt={imageAlt}
                      src={imageUrl}
                      fill
                      sizes="(min-width: 768px) 400px, 85vw"
                      className="object-cover"
                    ></Image>
                  )}
                </div>
                <div className="flex flex-col">
                  <DialogTitle className="text-black text-xl">
                    {name}
                  </DialogTitle>
                  <div className="flex flex-wrap gap-x-3 text-black/60 text-xs">
                    {organizer && <span>{organizer}</span>}
                    {location && <span>{location}</span>}
                  </div>
                </div>
                <DialogDescription className="text-black text-sm">
                  {description}
                </DialogDescription>
                {latitude !== undefined && longitude !== undefined && (
                  // 説明文と重ならないよう、絶対配置ではなく最後の行として右に寄せる
                  <div className="flex justify-end">
                    <NaviButton
                      latitude={latitude}
                      longitude={longitude}
                      name={name}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {latitude !== undefined && longitude !== undefined && (
        <NaviButton
          latitude={latitude}
          longitude={longitude}
          name={name}
          className="absolute bottom-3 right-3"
        />
      )}
    </div>
  );
}

export { BoothCard };
