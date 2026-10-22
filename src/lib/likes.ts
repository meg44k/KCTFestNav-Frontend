import { parseGrade } from "@/lib/booth-grade";

export const TOO_MANY =
  "混み合っています。少し待ってからもう一度押してください";
export const FAILED = "投票できませんでした。もう一度押してください";

/**
 * 展示を押したあとの自分の票(1 人 1 票)。入れている展示を押すと取り消し、
 * ほかの展示に入れていれば押した展示へ移す
 */
export function nextVote(current: number | null, boothId: number) {
  return current === boothId ? null : boothId;
}

/** その展示のボタンの見た目。入れていない・この展示に入れている・ほかの展示に入れている */
export function voteState(
  current: number | null,
  boothId: number,
): "none" | "mine" | "other" {
  if (current === null) return "none";
  return current === boothId ? "mine" : "other";
}

/** 押したあとに出す一言(text)と、添える小さい注意(note)。選んだ・移したときは 1 人 1 つまでであることも知らせる */
export function voteMessage(
  current: number | null,
  boothId: number,
  name: string,
): { text: string; note?: string } {
  const state = voteState(current, boothId);
  if (state === "mine") return { text: "イチオシを取り消しました" };
  const note = "イチオシは 1 人 1 つまでです";
  if (state === "other")
    return { text: `イチオシを「${name}」に移しました`, note };
  return { text: `「${name}」をイチオシにしました`, note };
}

/** 投票できるのはクラス展示だけ(主催者が "1-1" のようなクラス表記) */
export function canLike(organizer: string): boolean {
  return parseGrade(organizer) !== null;
}
