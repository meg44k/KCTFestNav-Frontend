import { CONGESTION_LABELS } from "@/lib/api/booths";

/** これ以上更新が無いと「更新してください」と促す(担当者画面と学生会の監視で共通) */
export const STALE_MINUTES = 30;

/** 混雑度。色は来場者画面と同じ。ボタンは開場の流れの順(準備中 → 空き → …) */
export const CONGESTION_LEVELS = [
  { value: 3, label: CONGESTION_LABELS.preparing, color: "#9CA3AF" },
  { value: 0, label: CONGESTION_LABELS.empty, color: "#00B894" },
  { value: 1, label: CONGESTION_LABELS.clouded, color: "#FDCB6E" },
  { value: 2, label: CONGESTION_LABELS.veryClouded, color: "#e54141" },
] as const;

/**
 * 経過時間の計算に使う「今」。端末の時計はずれていることがあるので、
 * ページを描画したときのサーバーの時刻に、画面を開いてからの経過時間を足す
 */
export function serverClockNow(
  serverNow: number,
  mountedAt: number,
  perfNow: number,
): Date {
  return new Date(serverNow + (perfNow - mountedAt));
}

const NEVER = { label: "まだ更新されていません", stale: true };

export function updatedAgo(
  updatedAt: string | null | undefined,
  now: Date,
): { label: string; stale: boolean } {
  if (!updatedAt) return NEVER;
  const at = new Date(updatedAt).getTime();
  if (Number.isNaN(at)) return NEVER;

  // 端末の時計がずれて未来になっても負の値は出さない
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60_000));
  const stale = minutes >= STALE_MINUTES;
  if (minutes < 1) return { label: "たった今", stale };
  if (minutes < 60) return { label: `${minutes}分前`, stale };
  return {
    label: `${Math.floor(minutes / 60)}時間${minutes % 60}分前`,
    stale,
  };
}
