import { parseGrade } from "@/lib/booth-grade";

const collate = new Intl.Collator("ja", { numeric: true }).compare;

/**
 * ブース管理の表を、クラス展示(主催者がクラス表記)とクラブバザー(それ以外)に分ける。
 * どちらも主催者の順(クラスは 1-2 の次に 1-10)に並べる
 */
export function splitBoothsByKind<T extends { id: number; organizer: string }>(
  booths: T[],
): { classes: T[]; clubs: T[] } {
  const sorted = [...booths].sort(
    (a, b) => collate(a.organizer, b.organizer) || a.id - b.id,
  );
  return {
    classes: sorted.filter((b) => parseGrade(b.organizer) !== null),
    clubs: sorted.filter((b) => parseGrade(b.organizer) === null),
  };
}
