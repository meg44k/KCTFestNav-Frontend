import type { LiveResponse } from "@/lib/api/lives";
import { sortLives } from "@/lib/manage/ops";

/** お知らせが空・取得できないときに帯に出す文 */
export const DEFAULT_ANNOUNCEMENT = "2026 高専祭開催中!!";

export function announcementOrDefault(content: string | undefined): string {
  return content?.trim() ? content : DEFAULT_ANNOUNCEMENT;
}

const TZ = "Asia/Tokyo";

// 日本時間の日付。並べ替えにも使うので YYYY-MM-DD
const dayKey = (iso: string) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const md = d.toLocaleDateString("ja-JP", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
  });
  const wd = d.toLocaleDateString("ja-JP", { timeZone: TZ, weekday: "short" });
  return `${md}（${wd}）`;
};

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });

export type LiveDay = { key: string; label: string; lives: LiveResponse[] };

/** ライブを日本時間の日付ごとに分ける(バックエンドのライブにはステージの項目が無いため) */
export function groupLivesByDay(lives: LiveResponse[]): LiveDay[] {
  const days = new Map<string, LiveDay>();
  for (const live of sortLives(lives)) {
    const key = dayKey(live.start_time);
    if (!days.has(key)) {
      days.set(key, { key, label: dayLabel(live.start_time), lives: [] });
    }
    days.get(key)?.lives.push(live);
  }
  return [...days.values()].sort((a, b) => a.key.localeCompare(b.key));
}

const STATES = ["upcoming", "ongoing", "finished"] as const;

/** BandBar にそのまま渡せる形 */
export function toBandBar(live: LiveResponse) {
  return {
    bandName: live.name,
    startTime: hm(live.start_time),
    endTime: hm(live.end_time),
    thumbnail: live.thumbnail_url,
    description: live.detail,
    // 想定外の値は開演前扱いにして画面を壊さない
    state: STATES[live.status] ?? "upcoming",
  };
}
