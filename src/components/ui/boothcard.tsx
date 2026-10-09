import { MapPin, XIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LikeButton } from "@/components/likes/LikeButton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CONGESTION_LABELS,
  type CongestionStatus,
  congestionLabel,
} from "@/lib/api/booths";
import { cn } from "@/lib/utils";
import { NaviButton } from "./naviButton";

function congestionMessageOf(
  congestionStatus: string | undefined,
  organizer: string | undefined,
): string {
  // 知らない値や未指定は準備中(「すぐ入れる」と言わない)。バザーの空きは「すぐ買える」
  const status = (
    congestionStatus && congestionStatus in CONGESTION_LABELS
      ? congestionStatus
      : "preparing"
  ) as CongestionStatus;
  return congestionLabel(status, organizer);
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
  updatedLabel,
  mapHref,
  likeBoothId,
}: {
  name: string;
  description: string;
  // クラブバザーでは主催の部活名が主要な情報になるため出す。
  // クラス展示では主催者(ex. 1-1)を出さないので任意にしている
  organizer?: string;
  // 場所の説明(ex. 第一体育館)
  location?: string;
  // バックエンドは画像未設定のブースを空文字で返すため任意にする
  imageUrl?: string;
  imageAlt: string;
  // 座標・混雑度がまだ用意できていないブースもあるため任意にする
  congestionStatus?: string;
  latitude?: number;
  longitude?: number;
  /** 混雑度タブの横に出す「○分前に更新」。未更新なら出さない */
  updatedLabel?: string;
  /** 地図でこのブースを開くリンク。位置が無いブースや地図の上では渡さない */
  mapHref?: string;
  /** いいねできるブース(クラス展示)の ID。渡したときだけハートを出す */
  likeBoothId?: number;
}) {
  const congestionStatusMessage = congestionMessageOf(
    congestionStatus,
    organizer,
  );
  const congestionColor = {
    "bg-[#00B894] border-l border-[#00ffcc]": congestionStatus === "empty",
    "bg-[#FDCB6E] border-l border-[#ffe3af]": congestionStatus === "clouded",
    "bg-[#e54141] border-l border-[#ff7d7d]":
      congestionStatus === "veryClouded",
    "bg-[#9CA3AF] border-l border-[#d1d5db]": congestionStatus === "preparing",
  };

  return (
    // ナビボタンをカードの上に重ねるための基準。
    // ナビボタンを詳細ダイアログのトリガーの中に入れるとボタンが入れ子になり、
    // タップが両方に伝わってしまうため、トリガーの外に出して重ねている
    <div className="relative w-full max-w-md">
      <Dialog>
        <DialogTrigger
          className="block w-full text-left cursor-pointer"
          aria-label={`${name}の詳細を見る`}
        >
          <div className="flex items-end gap-2">
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
            {updatedLabel && (
              <span className="pb-0.5 text-gray-400 text-xs">
                {updatedLabel}
              </span>
            )}
          </div>
          <div
            className={cn(
              "relative rounded-b-md rounded-r-md w-full h-30 bg-[#00B894] p-1 ",
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
                    // 上げるときに縮めてあるので、Vercel の画像変換を使わない
                    unoptimized
                    className="object-cover"
                  ></Image>
                )}
              </div>
              <div
                className={cn(
                  "flex flex-col mr-auto min-w-0",
                  // 右上に重ねるハートと文字が重ならないようにあける
                  likeBoothId !== undefined && "pr-10",
                )}
              >
                <span className="text-black">{name}</span>
                {/* 全文はタップで開く詳細ダイアログで読めるため、カードでは1行に抑える */}
                <span className="text-black text-sm line-clamp-1">
                  {description}
                </span>
                {(organizer || location) && (
                  <span className="text-black/60 text-xs">
                    {[organizer, location].filter(Boolean).join(" / ")}
                  </span>
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
                <div className="relative w-full aspect-square bg-gray-300 rounded-sm overflow-hidden">
                  {imageUrl && (
                    <Image
                      alt={imageAlt}
                      src={imageUrl}
                      fill
                      sizes="(min-width: 768px) 400px, 85vw"
                      unoptimized
                      className="object-cover"
                    ></Image>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-start gap-2">
                    <DialogTitle className="mr-auto text-black text-xl">
                      {name}
                    </DialogTitle>
                    {likeBoothId !== undefined && (
                      <LikeButton boothId={likeBoothId} />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-black/60 text-xs">
                    {organizer && <span>{organizer}</span>}
                    {location && <span>{location}</span>}
                  </div>
                </div>
                <DialogDescription className="text-black text-sm">
                  {description}
                </DialogDescription>
                {(mapHref ||
                  (latitude !== undefined && longitude !== undefined)) && (
                  // 説明文と重ならないよう、絶対配置ではなく最後の行として右に寄せる
                  <div className="flex items-center justify-end">
                    {mapHref && (
                      <Link
                        href={mapHref}
                        className="mr-auto flex items-center gap-1 rounded-full border border-black/20 px-3 py-1 text-sm"
                      >
                        <MapPin size={16} />
                        場所を見る
                      </Link>
                    )}
                    {latitude !== undefined && longitude !== undefined && (
                      <NaviButton
                        latitude={latitude}
                        longitude={longitude}
                        name={name}
                      />
                    )}
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
      {/* ナビボタンと同じく、詳細のトリガーの外に重ねる */}
      {likeBoothId !== undefined && (
        <LikeButton boothId={likeBoothId} className="absolute top-8 right-3" />
      )}
    </div>
  );
}

export { BoothCard };
