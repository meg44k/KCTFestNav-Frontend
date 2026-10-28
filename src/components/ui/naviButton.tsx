"use client";

import { Navigation } from "lucide-react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import campusData from "@/data/campus.json";
import { useCompass } from "@/hooks/useCompass";
import { type Campus, type CampusData, loadCampus } from "@/lib/map/campus";
import { placeLabel } from "@/lib/map/place-label";
import { cn } from "@/lib/utils";

// カードの数だけ読み直さないよう、最初に要ったときに 1 度だけ作る
let campus: Campus | undefined;
const campusOnce = () => {
  campus ??= loadCampus(campusData as unknown as CampusData);
  return campus;
};

function NaviButton({
  latitude,
  longitude,
  name,
  floor = 0,
  location,
  className,
}: {
  className?: string;
  latitude: number;
  longitude: number;
  name: string;
  /** 階。0 は屋外(または未設定) */
  floor?: number;
  /** 場所の説明。屋外や棟が分からないときに出す */
  location?: string;
}) {
  const { angle, error, startCompass, stopCompass, distance } = useCompass(
    latitude,
    longitude,
  );
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const place = placeLabel(
    campusOnce(),
    { latitude, longitude, floor },
    location,
  );
  const isFacingTarget = normalizedAngle < 15 || normalizedAngle > 345; // 誤差±15度以内なら正解方向とみなす

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) {
          startCompass();
        } else {
          stopCompass();
        }
      }}
    >
      <DialogTrigger
        aria-label={`${name}への方角を見る`}
        className={cn(
          "flex border border-black rounded-full w-8 h-8 justify-center items-center",
          className,
        )}
      >
        <Navigation
          className="text-black -translate-x-0.5 translate-y-0.5 fill-current"
          strokeWidth={1}
          size={20}
        />
      </DialogTrigger>
      <DialogContent
        className={cn(
          "md:min-w-100 md:min-h-150 min-w-[80dvw] min-h-[80dvh] bg-black text-white transition-colors duration-300",
          {
            "bg-green-600 transition-colors duration-300": isFacingTarget,
          },
        )}
      >
        <div className="flex flex-col">
          <div className="h-1/3 relative">
            <div className="text-2xl text-white">目的地: {name}</div>
            {place && <div className="text-lg text-white/80">{place}</div>}
            {error && <div className="text-red-500 text-sm">{error}</div>}
          </div>
          <div className="flex justify-center">
            <div className="relative flex w-3/4 aspect-square items-center justify-center">
              {/* リング本体:上に丸い切れ込み(=目標スロット / A) */}
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
                role="presentation"
              >
                {/*
                  円周に沿った大きな弧を1本だけ描き、上だけを欠けさせて「切れ込み」にする。
                  弧の両端(P1・P2)に stroke-linecap="round" が付くので、切れ込みの縁が丸くなる。
                  P1=(66.86, 8.28) / P2=(33.14, 8.28) は、半径45・中心(50,50)の円上で
                  真上から左右に22°ずつ開いた点。large-arc=1, sweep=1 で下側を通る長い弧を描く。
                */}
                <path
                  d="M 66.86 8.28 A 45 45 0 1 1 33.14 8.28"
                  fill="none"
                  strokeWidth={6}
                  strokeLinecap="round"
                  className={cn(
                    "stroke-gray-500 transition-colors duration-300",
                    isFacingTarget && "stroke-green-500",
                  )}
                />
              </svg>

              {/* 回転レイヤー:矢印 + 動くマーカー(=現在の向き / B) */}
              <div
                className="absolute inset-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <Image
                  src="/Arrow.png"
                  alt=""
                  width={501}
                  height={521}
                  sizes="(min-width: 768px) 300px, 60vw"
                  className="w-full h-auto"
                />
                {/*
                  リングをくり抜くのではなく、不透明な丸をリングの上に「乗せる」だけ。
                  こうすると見えるのは丸自身の丸い縁だけになり、尖りが出ない。
                  位置(-top-2)はリムに乗る量を見ながら微調整可。
                */}
                <div
                  className={cn(
                    "absolute left-1/2 -top-2 -translate-x-1/2 h-6 w-6 rounded-full bg-gray-200 transition-colors duration-300",
                    isFacingTarget && "bg-green-500",
                  )}
                ></div>
              </div>

              {/* 中心の点 */}
              <div className="w-1 aspect-square rounded-full border-8"></div>
            </div>
          </div>
          {/* 距離は現在地がまだ取れていない間は 0 なので、そのあいだは数字を出さない */}
          <div className="mt-6 text-center text-white">
            {distance > 0 ? (
              <span className="text-4xl font-bold">
                {Math.floor(distance)}
                <span className="ml-1 text-2xl">m</span>
              </span>
            ) : (
              // 取れなかったときは上にエラーが出るので、こちらは消す
              !error && (
                <span className="text-lg text-white/70">
                  現在地を確かめています
                </span>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { NaviButton };
