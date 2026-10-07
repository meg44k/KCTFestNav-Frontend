import { describe, expect, it } from "vitest";
import type { Booth } from "@/lib/api/booths";
import {
  applyFilters,
  type BoothFilters,
  filtersToQuery,
  gradeCounts,
  parseFilters,
  updatedLabel,
} from "./booth-browser";

const booth = (
  id: number,
  organizer: string,
  congestionStatus: Booth["congestionStatus"] = "empty",
  extra: Partial<Booth> = {},
): Booth => ({
  id,
  name: `ブース${id}`,
  description: "",
  organizer,
  location: "",
  congestionStatus,
  floor: 0,
  ...extra,
});

const booths = [
  booth(1, "2-1", "veryClouded", { name: "たこ焼き" }),
  booth(2, "1-10", "empty", { name: "お化け屋敷", description: "こわい" }),
  booth(3, "1-2", "clouded", { name: "クレープ", location: "中庭" }),
  booth(4, "天文部", "empty", { name: "プラネタリウム" }),
  booth(5, "PC部", "clouded", { name: "VR体験" }),
];

const base: BoothFilters = {
  type: "class",
  grade: "all",
  sort: "class",
  onlyEmpty: false,
  q: "",
};
const ids = (f: Partial<BoothFilters>) =>
  applyFilters(booths, { ...base, ...f }).map((b) => b.id);

describe("applyFilters", () => {
  it("クラス順は数字を数として並べる(1-2 は 1-10 の前)", () => {
    expect(ids({})).toEqual([3, 2, 1]);
    expect(ids({ type: "club" })).toEqual([5, 4]);
  });

  it("クラス展示だけ・クラブバザーだけ", () => {
    expect(ids({ type: "class" })).toEqual([3, 2, 1]);
    expect(ids({ type: "club" })).toEqual([5, 4]);
  });

  it("学年で絞るのはクラス展示のときだけ", () => {
    expect(ids({ type: "class", grade: 1 })).toEqual([3, 2]);
    expect(ids({ type: "club", grade: 1 })).toEqual([5, 4]);
  });

  it("混雑度順は空いているものから、同じならクラス順", () => {
    expect(ids({ sort: "empty" })).toEqual([2, 3, 1]);
    expect(ids({ type: "club", sort: "empty" })).toEqual([4, 5]);
  });

  it("空いているブースだけ", () => {
    expect(ids({ onlyEmpty: true })).toEqual([2]);
    expect(ids({ type: "club", onlyEmpty: true })).toEqual([4]);
  });

  it("キーワードは名前・説明・主催者・場所から探し、全角半角や大文字小文字を区別しない", () => {
    expect(ids({ q: "たこ" })).toEqual([1]);
    expect(ids({ q: "こわい" })).toEqual([2]);
    expect(ids({ q: "中庭" })).toEqual([3]);
    expect(ids({ type: "club", q: "ｖｒ" })).toEqual([5]);
    expect(ids({ q: "１－２" })).toEqual([3]);
  });

  it("空白で区切った語はすべて含むものだけ", () => {
    expect(ids({ q: "1- 屋敷" })).toEqual([2]);
  });
});

describe("gradeCounts", () => {
  it("学年ごとの件数。キーワードと空いているだけの条件は反映し、学年の条件は無視する", () => {
    expect(gradeCounts(booths, { ...base, type: "class", grade: 2 })).toEqual([
      { grade: 1, count: 2 },
      { grade: 2, count: 1 },
    ]);
    expect(
      gradeCounts(booths, { ...base, type: "class", onlyEmpty: true }),
    ).toEqual([{ grade: 1, count: 1 }]);
  });
});

describe("parseFilters / filtersToQuery", () => {
  it("URL から読み、不正な値は既定に戻す", () => {
    expect(
      parseFilters(
        { type: "club", grade: "3", sort: "empty", empty: "1", q: "たこ" },
        "class",
      ),
    ).toEqual({
      type: "club",
      grade: 3,
      sort: "empty",
      onlyEmpty: true,
      q: "たこ",
    });
    // 「すべて」は無くしたので、type=all もそのページの既定の種類にする
    expect(parseFilters({ type: "all" }, "club").type).toBe("club");
    expect(parseFilters({ type: "x", grade: "9", sort: "y" }, "class")).toEqual(
      {
        ...base,
        type: "class",
      },
    );
  });

  it("既定と同じ値は URL に書かない", () => {
    expect(filtersToQuery({ ...base, type: "class" }, "class")).toBe("");
    expect(
      filtersToQuery(
        {
          ...base,
          type: "club",
          grade: 2,
          sort: "empty",
          onlyEmpty: true,
          q: "たこ 焼き",
        },
        "class",
      ),
    ).toBe(
      "?type=club&grade=2&sort=empty&empty=1&q=%E3%81%9F%E3%81%93+%E7%84%BC%E3%81%8D",
    );
  });
});

describe("updatedLabel", () => {
  const now = new Date("2026-10-31T12:00:00+09:00").getTime();
  it("来場者向けに更新からの時間を出す。未更新・読めないときは出さない", () => {
    expect(updatedLabel("2026-10-31T11:48:00+09:00", now)).toBe("12分前に更新");
    expect(updatedLabel("2026-10-31T11:59:40+09:00", now)).toBe("たった今更新");
    expect(updatedLabel(undefined, now)).toBeUndefined();
    expect(updatedLabel("x", now)).toBeUndefined();
  });
});
