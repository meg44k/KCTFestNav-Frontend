"use client";

import { MapPin, Navigation, TriangleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import campusData from "@/data/campus.json";
import { useCompass } from "@/hooks/useCompass";
import { useWakeLock } from "@/hooks/useWakeLock";
import { hasArrived } from "@/lib/compass";
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
  mapHref,
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
  /** 地図でこのブースを開くリンク。地図の上では渡さない */
  mapHref?: string;
}) {
  const {
    angle,
    error,
    hasHeading,
    isActive,
    startCompass,
    stopCompass,
    distance,
  } = useCompass(latitude, longitude);
  // コンパスを見ている間は画面が暗くならないようにする
  useWakeLock(isActive);
  const normalizedAngle = ((angle % 360) + 360) % 360;
  const place = placeLabel(
    campusOnce(),
    { latitude, longitude, floor },
    location,
  );
  const arrived = hasArrived(distance);
  // 誤差±15度以内なら正解方向とみなす。着いたら矢印はあてにならないので合わせない
  const isFacingTarget =
    hasHeading && !arrived && (normalizedAngle < 15 || normalizedAngle > 345);

  // 向きが合った瞬間に短く震わせる(震わせられるのは Android だけ。iPhone では何もしない)
  useEffect(() => {
    if (isFacingTarget) navigator.vibrate?.(80);
  }, [isFacingTarget]);

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
            {/* 緑の背景でも読めるよう、暗い地に白い字で出す */}
            {error && (
              <div className="mt-2 rounded-md bg-black/60 px-3 py-2 text-sm text-white">
                {error}
              </div>
            )}
          </div>
          {arrived ? (
            // GPS は 10〜20m ずれるので、近くでは矢印でなく建物と階で探してもらう
            <div className="flex w-full aspect-square flex-col items-center justify-center gap-3 text-center">
              <MapPin size={56} className="text-green-500" />
              <div className="text-3xl font-bold">このあたりです</div>
              <div className="text-lg text-white/80">
                {place ? `${place}で` : ""}「{name}」を探してください
              </div>
            </div>
          ) : (
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

                {/*
                切れ込みの真ん中に置く動かない的(=目標 / A)。中を空けた輪にして、
                動くマーカーがぴったり重なると埋まって見える。位置と大きさはマーカーと同じ
              */}
                <div
                  className={cn(
                    "absolute left-1/2 top-[5%] -translate-x-1/2 -translate-y-1/2 w-[10%] aspect-square rounded-full border-2 border-gray-500 transition-colors duration-300",
                    isFacingTarget && "border-green-500",
                  )}
                />

                {/* 回転レイヤー:矢印 + 動くマーカー(=現在の向き / B) */}
                <div
                  className="absolute inset-0"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  {/* 矢印はリングに付かないよう少し小さくし、コンパスの真ん中を中心に置く */}
                  <Image
                    src="/Arrow.png"
                    alt=""
                    width={501}
                    height={521}
                    sizes="(min-width: 768px) 240px, 48vw"
                    className="absolute left-1/2 top-1/2 w-[80%] h-auto -translate-x-1/2 -translate-y-1/2"
                  />
                  {/*
                  リングをくり抜くのではなく、不透明な丸をリングの上に「乗せる」だけ。
                  こうすると見えるのは丸自身の丸い縁だけになり、尖りが出ない。
                  リングの線は viewBox 100 の y=5(半径 45)にあるので、丸の真ん中を上から 5% に置く。
                  px で置くとコンパスの大きさが変わったときに線から外れるため、位置も大きさも % にする
                */}
                  <div
                    className={cn(
                      "absolute left-1/2 top-[5%] -translate-x-1/2 -translate-y-1/2 w-[10%] aspect-square rounded-full bg-gray-200 transition-colors duration-300",
                      isFacingTarget && "bg-green-500",
                    )}
                  ></div>
                </div>

                {/* 中心の点 */}
                <div className="w-1 aspect-square rounded-full border-8"></div>
              </div>
            </div>
          )}
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
          {/* 建物の中では GPS がずれ、矢印は建物を突っ切る向きを指すので、地図に逃がす */}
          {mapHref && (
            <Link
              href={mapHref}
              className="mx-auto mt-6 flex items-center gap-1 rounded-full border border-white/60 px-4 py-2 text-sm"
            >
              <MapPin size={16} />
              地図で場所を見る
            </Link>
          )}
          <p className="mt-6 flex items-start justify-center gap-1 text-xs text-white/70">
            <TriangleAlert size={14} className="mt-px shrink-0" />
            画面を見ながら歩かず、前と周りに気をつけてください
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { NaviButton };
