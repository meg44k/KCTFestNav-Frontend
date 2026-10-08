import { LocateFixed } from "lucide-react";
import type { CurrentLocation } from "@/hooks/useCurrentLocation";

const MESSAGES: Partial<Record<CurrentLocation["status"] | "outside", string>> =
  {
    locating: "現在地を探しています…",
    denied: "位置情報が使えません。設定から許可してください",
    unavailable: "現在地を取得できませんでした",
    outside: "会場の外にいます",
  };

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
  return (
    <div className="flex items-center gap-2">
      {message && (
        <span className="rounded-md bg-black/80 px-2 py-1 text-gray-200 text-xs">
          {message}
        </span>
      )}
      <button
        type="button"
        onClick={onStart}
        aria-label="現在地を表示"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/80"
      >
        <LocateFixed
          size={20}
          className={status === "active" ? "text-[#4f8cff]" : ""}
        />
      </button>
    </div>
  );
}
