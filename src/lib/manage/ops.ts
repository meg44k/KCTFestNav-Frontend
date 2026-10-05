import type { BoothResponse } from "@/lib/api/booths";
import type { LiveResponse } from "@/lib/api/lives";

export const LIVE_STATUSES = [
  { value: 0, label: "開演前" },
  { value: 1, label: "公演中" },
  { value: 2, label: "終了" },
] as const;

// 未更新は最も古い扱い
const updatedMs = (b: BoothResponse) =>
  b.congestion_updated_at
    ? new Date(b.congestion_updated_at).getTime()
    : Number.NEGATIVE_INFINITY;

/** 混雑度の監視用。更新が止まっているブースほど上に来る */
export function sortForMonitor(booths: BoothResponse[]): BoothResponse[] {
  return [...booths].sort((a, b) => updatedMs(a) - updatedMs(b) || a.id - b.id);
}

export function sortLives(lives: LiveResponse[]): LiveResponse[] {
  return [...lives].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

/** POST/PUT /manage/lives に送る形 */
export type LivePayload = Omit<LiveResponse, "id">;

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
// datetime-local は秒もタイムゾーンも持たないので、日本時間として扱う
const jst = (local: string) => `${local}:00+09:00`;

export function parseLiveForm(
  formData: FormData,
  current?: LiveResponse,
): { ok: true; payload: LivePayload } | { ok: false; error: string } {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "ライブ名を入力してください" };

  const start = text(formData, "startTime");
  const end = text(formData, "endTime");
  if (!start || !end) {
    return { ok: false, error: "開始と終了の時刻を入力してください" };
  }
  if (new Date(jst(end)) <= new Date(jst(start))) {
    return { ok: false, error: "終了時刻は開始時刻より後にしてください" };
  }

  const session = Number(text(formData, "sessionNumber"));
  if (!Number.isInteger(session) || session < 1) {
    return { ok: false, error: "回数は 1 以上の整数で入力してください" };
  }

  const thumbnail = text(formData, "thumbnailUrl");
  if (thumbnail && !/^https?:\/\//.test(thumbnail)) {
    return {
      ok: false,
      error: "サムネイル URL は http:// か https:// で始めてください",
    };
  }

  return {
    ok: true,
    payload: {
      name,
      detail: text(formData, "detail"),
      thumbnail_url: thumbnail,
      start_time: jst(start),
      end_time: jst(end),
      session_number: session,
      // 状態は別の操作で変える。編集では今の値を保つ
      status: current?.status ?? 0,
    },
  };
}

/** API の時刻を、日本時間の datetime-local の値(YYYY-MM-DDTHH:mm)にする */
export function toLocalInput(iso: string): string {
  const jstMs = new Date(iso).getTime() + 9 * 60 * 60_000;
  return new Date(jstMs).toISOString().slice(0, 16);
}
