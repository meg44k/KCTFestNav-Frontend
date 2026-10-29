import { LocateFixed } from "lucide-react";
import { useEffect, useState } from "react";
import type { CurrentLocation } from "@/hooks/useCurrentLocation";

const MESSAGES: Partial<Record<CurrentLocation["status"] | "outside", string>> =
  {
    locating: "現在地を探しています…",
    denied: "位置情報が使えません。設定から許可してください",
    unavailable: "現在地を取得できませんでした",
    outside: "会場の外にいます",
  };

// 文を出しておく長さ。地図を開くと自動で現在地を取りにいくので、屋内などで取れないと
// 文が出たままになって邪魔になる。取れたかどうかはボタンの色でも分かる
const MESSAGE_MS = 4000;

export function LocationButton({
  status,
  outside,
  onStart,
}: {
  status: CurrentLocation["status"];
  outside: boolean;
  onStart(): void;
}) {
  const message = outside ? MESSAGES.outside : MESSAGES[status];
  // 文が変わったとき・ボタンを押したときに数を増やし、その時から数秒だけ出す
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: 文が変わったとき・押したときに出し直す
  useEffect(() => {
    if (!message) return setVisible(false);
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), MESSAGE_MS);
    return () => clearTimeout(timer);
  }, [message, shown]);

  return (
    <div className="flex items-center gap-2">
      {message && visible && (
        <output className="rounded-md bg-black/80 px-2 py-1 text-gray-200 text-xs">
          {message}
        </output>
      )}
      <button
        type="button"
        onClick={() => {
          setShown((n) => n + 1);
          onStart();
        }}
        aria-label="現在地を表示"
        className="flex h-11 w-11 items-center justify-center rounded-full glass"
      >
        <LocateFixed
          size={20}
          className={status === "active" ? "text-[#4f8cff]" : ""}
        />
      </button>
    </div>
  );
}
