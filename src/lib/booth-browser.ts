import type { Booth } from "@/lib/api/booths";
import { parseGrade } from "@/lib/booth-grade";
import { updatedAgo } from "@/lib/manage/congestion";

/** 来場者のブース一覧の絞り込みと並び順。URL のクエリにも同じものを持つ */
export type BoothType = "class" | "club";
export type BoothSort = "class" | "empty";
export type BoothFilters = {
  type: BoothType;
  /** 学年(クラス展示のときだけ使う) */
  grade: number | "all";
  sort: BoothSort;
  /** 空いているブースだけを出す */
  onlyEmpty: boolean;
  q: string;
};

export const BOOTH_TYPES: { value: BoothType; label: string }[] = [
  { value: "class", label: "クラス展示" },
  { value: "club", label: "クラブバザー" },
];

export const BOOTH_SORTS: { value: BoothSort; label: string }[] = [
  { value: "class", label: "クラス順" },
  // 空いているものから先に並べる
  { value: "empty", label: "待ち時間順" },
];

// 1-2 が 1-10 より前に来るよう、数字は数として比べる
const collate = new Intl.Collator("ja", { numeric: true }).compare;

// クラス展示(1-1 など)を先に、部活を後に。それぞれの中は主催者の名前順
function byClass(a: Booth, b: Booth): number {
  const aClub = parseGrade(a.organizer) === null;
  const bClub = parseGrade(b.organizer) === null;
  if (aClub !== bClub) return aClub ? 1 : -1;
  return collate(a.organizer, b.organizer) || a.id - b.id;
}

const CROWD_RANK: Record<Booth["congestionStatus"], number> = {
  empty: 0,
  clouded: 1,
  veryClouded: 2,
  // 準備中は空いているかどうか分からないので最後
  preparing: 3,
};

// 全角・半角、大文字・小文字の違いを無視して比べる
const normalize = (s: string) => s.normalize("NFKC").toLowerCase();

function matches(booth: Booth, q: string): boolean {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalize(
    [booth.name, booth.description, booth.organizer, booth.location].join(" "),
  );
  return words.every((w) => text.includes(w));
}

function matchesType(booth: Booth, type: BoothType): boolean {
  const isClass = parseGrade(booth.organizer) !== null;
  return type === "class" ? isClass : !isClass;
}

/** 学年以外の条件(種類・空いているだけ・キーワード)で絞る */
function baseFilter(booths: Booth[], f: BoothFilters): Booth[] {
  return booths.filter(
    (b) =>
      matchesType(b, f.type) &&
      (!f.onlyEmpty || b.congestionStatus === "empty") &&
      matches(b, f.q),
  );
}

export function applyFilters(booths: Booth[], f: BoothFilters): Booth[] {
  const filtered = baseFilter(booths, f).filter(
    (b) =>
      f.type !== "class" ||
      f.grade === "all" ||
      parseGrade(b.organizer) === f.grade,
  );
  return filtered.sort((a, b) =>
    f.sort === "empty"
      ? CROWD_RANK[a.congestionStatus] - CROWD_RANK[b.congestionStatus] ||
        byClass(a, b)
      : byClass(a, b),
  );
}

/** 学年タブに出す件数。学年の条件以外は反映する */
export function gradeCounts(
  booths: Booth[],
  f: BoothFilters,
): { grade: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const b of baseFilter(booths, { ...f, type: "class" })) {
    const grade = parseGrade(b.organizer);
    if (grade !== null) counts.set(grade, (counts.get(grade) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([grade, count]) => ({ grade, count }));
}

export function parseFilters(
  params: Record<string, string | undefined>,
  defaultType: BoothType,
): BoothFilters {
  const type = BOOTH_TYPES.some((t) => t.value === params.type)
    ? (params.type as BoothType)
    : defaultType;
  const grade = Number(params.grade);
  return {
    type,
    grade: Number.isInteger(grade) && grade >= 1 && grade <= 5 ? grade : "all",
    sort: params.sort === "empty" ? "empty" : "class",
    onlyEmpty: params.empty === "1",
    q: params.q ?? "",
  };
}

/** 既定と違うものだけを URL のクエリにする。何も無ければ空文字 */
export function filtersToQuery(
  f: BoothFilters,
  defaultType: BoothType,
): string {
  const params = new URLSearchParams();
  if (f.type !== defaultType) params.set("type", f.type);
  if (f.grade !== "all") params.set("grade", String(f.grade));
  if (f.sort !== "class") params.set("sort", f.sort);
  if (f.onlyEmpty) params.set("empty", "1");
  if (f.q) params.set("q", f.q);
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** カードに出す「○分前に更新」。未更新や読めないときは出さない */
export function updatedLabel(
  updatedAt: string | null | undefined,
  nowMs: number,
): string | undefined {
  if (!updatedAt || Number.isNaN(new Date(updatedAt).getTime())) {
    return undefined;
  }
  const { label } = updatedAgo(updatedAt, new Date(nowMs));
  return label === "たった今" ? "たった今更新" : `${label}に更新`;
}

/** カードに出す「○分前に更新」。準備中のブースには出さない(まだ開いていないので) */
export function cardUpdatedLabel(
  booth: Pick<Booth, "congestionStatus" | "congestionUpdatedAt">,
  nowMs: number,
): string | undefined {
  if (booth.congestionStatus === "preparing") return undefined;
  return updatedLabel(booth.congestionUpdatedAt, nowMs);
}
