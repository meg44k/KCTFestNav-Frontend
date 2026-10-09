// 管理画面のいいね(順位・10 分ごとの推移・時間帯の取り消し)で使う計算

export type LikeBucket = { start: string; count: number; burst: boolean };
export type BoothLikes = {
  booth_id: number;
  name: string;
  organizer: string;
  total: number;
  burst: boolean;
  buckets: LikeBucket[];
};
export type LikesResponse = { booths: BoothLikes[] };

export type LikeRow = {
  rank: number;
  boothId: number;
  name: string;
  organizer: string;
  total: number;
  burst: boolean;
  buckets: LikeBucket[];
};

/** 表の行。バックエンドが多い順に返すので、同じ数は同じ順位にする(1, 1, 3) */
export function rankRows(res: LikesResponse): LikeRow[] {
  return res.booths.map((b, _, all) => {
    const first = all.findIndex((x) => x.total === b.total);
    return {
      rank: first + 1,
      boothId: b.booth_id,
      name: b.name,
      organizer: b.organizer,
      total: b.total,
      burst: b.burst,
      buckets: b.buckets,
    };
  });
}

const JST = 9 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

/** UTC の時刻を日本時間の HH:MM に */
export function toJstTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + JST);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

const isoZ = (ms: number) => new Date(ms).toISOString().replace(".000Z", "Z");

/** 選んだ 2 本の棒(順不同)の範囲。from 以上 to 未満で、to は後ろの棒の 10 分後 */
export function rangeOf(
  starts: string[],
  a: number,
  b: number,
): { from: string; to: string } {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return {
    from: isoZ(new Date(starts[lo]).getTime()),
    to: isoZ(new Date(starts[hi]).getTime() + TEN_MINUTES),
  };
}
