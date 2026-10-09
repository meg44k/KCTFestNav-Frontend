import { parseGrade } from "@/lib/booth-grade";

export const TOO_MANY =
  "混み合っています。少し待ってからもう一度押してください";
export const FAILED = "いいねできませんでした。もう一度押してください";

/** 自分のいいねの集まりに、押した(on)・取り消したを反映した新しい集まり */
export function withLike(
  liked: ReadonlySet<number>,
  boothId: number,
  on: boolean,
): Set<number> {
  const next = new Set(liked);
  if (on) next.add(boothId);
  else next.delete(boothId);
  return next;
}

/** いいねできるのはクラス展示だけ(主催者が "1-1" のようなクラス表記) */
export function canLike(organizer: string): boolean {
  return parseGrade(organizer) !== null;
}
