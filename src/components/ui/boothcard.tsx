import { Map as MapIcon, XIcon } from "lucide-react";
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
import { CARD_BUTTON } from "./card-button";
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
  floor,
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
  /** 階。0 は屋外(または未設定)。コンパスに「N号館 N階」を出すのに使う */
  floor?: number;
  /** 混雑度タブの横に出す「○分前に更新」。未更新なら出さない */
  updatedLabel?: string;
  /** 地図でこのブースを開くリンク。位置が無いブースや地図の上では渡さない */
  mapHref?: string;
  /** 投票できるブース(クラス展示)の ID。渡したときだけ投票のボタンを出す */
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

  const hasLocation = latitude !== undefined && longitude !== undefined;
  const showMap = mapHref !== undefined && hasLocation;
  const hasActions = hasLocation || likeBoothId !== undefined;
  // 右下のボタン。小さいカードと詳細のカードで同じ並びにする(右から コンパス・地図・イチオシ)
  const actions = (
    <div className="flex items-center gap-2">
      {likeBoothId !== undefined && <LikeButton boothId={likeBoothId} />}
      {/* 地図でこのブースを開く(地図の上のカードでは mapHref を渡さないので出さない) */}
      {showMap && (
        <Link
          href={mapHref}
          aria-label={`${name}を地図で見る`}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full",
            CARD_BUTTON,
          )}
        >
          <MapIcon size={18} strokeWidth={1.5} />
        </Link>
      )}
      {hasLocation && (
        <NaviButton
          latitude={latitude}
          longitude={longitude}
          name={name}
          floor={floor}
          location={location}
          mapHref={mapHref}
        />
      )}
    </div>
  );

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
              {/* 名前が長くても横に押しつぶされず、いつも正方形のまま */}
              <div className="relative aspect-square h-full shrink-0 bg-gray-300 overflow-hidden mr-2 rounded-sm">
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
              <div className="flex flex-col mr-auto min-w-0">
                {/* 長い名前は 1 行で切る(2 行になると下の行がボタンに隠れる)。全部は詳細で読める */}
                <span className="text-black font-bold line-clamp-1">
                  {name}
                </span>
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
                  <DialogTitle className="text-black text-xl font-bold">
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
                {/* ボタンは小さいカードと同じ並び(右下に イチオシ・地図・コンパス)。説明文と重ならないよう最後の行に置く */}
                {hasActions && (
                  <div className="flex justify-end">{actions}</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 詳細のトリガーの外に重ねる(中に入れるとボタンが入れ子になり、タップが両方に伝わる) */}
      {hasActions && <div className="absolute right-3 bottom-3">{actions}</div>}
    </div>
  );
}

export { BoothCard };
