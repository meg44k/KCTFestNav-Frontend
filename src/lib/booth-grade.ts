import type { Booth } from "@/lib/api/booths";

/** クラス展示の1学年分 */
export type GradeGroup = {
  grade: number;
  booths: Booth[];
};

/**
 * 主催者名から学年を取り出す。
 * クラス展示の主催者は "1-1" のようなクラス表記で、部活の場合は "天文部" のような
 * 名前になっているため、クラス表記でないものは null を返す。
 */
export function parseGrade(organizer: string): number | null {
  const matched = organizer.trim().match(/^(\d+)\s*-\s*\d+$/);
  if (!matched) return null;

  const grade = Number(matched[1]);
  // 高専は1〜5年
  if (grade < 1 || grade > 5) return null;
  return grade;
}

/**
 * ブースを学年ごとにまとめる。学年の昇順で、ブースが1件も無い学年は含めない。
 * 部活など学年を持たない主催者のブースは除外する(クラス展示のページなので)。
 */
export function groupBoothsByGrade(booths: Booth[]): GradeGroup[] {
  const byGrade = new Map<number, Booth[]>();

  for (const booth of booths) {
    const grade = parseGrade(booth.organizer);
    if (grade === null) continue;

    const bucket = byGrade.get(grade);
    if (bucket) {
      bucket.push(booth);
    } else {
      byGrade.set(grade, [booth]);
    }
  }

  return [...byGrade.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, gradeBooths]) => ({ grade, booths: gradeBooths }));
}

/**
 * 部活など、主催者が学年を持たないブースだけを返す。
 * クラブバザーのページで使う。groupBoothsByGrade が拾うブースの補集合になる。
 */
export function filterClubBooths(booths: Booth[]): Booth[] {
  return booths.filter((booth) => parseGrade(booth.organizer) === null);
}
