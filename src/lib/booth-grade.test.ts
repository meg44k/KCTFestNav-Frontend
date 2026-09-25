import { describe, expect, it } from "vitest";
import type { Booth } from "@/lib/api/booths";
import { groupBoothsByGrade, parseGrade } from "./booth-grade";

function booth(name: string, organizer: string): Booth {
  return {
    id: 1,
    name,
    description: "",
    organizer,
    location: "",
    congestionStatus: "empty",
  };
}

describe("parseGrade", () => {
  it("クラス表記から学年を取り出す", () => {
    expect(parseGrade("1-1")).toBe(1);
    expect(parseGrade("5-2")).toBe(5);
  });

  it("前後や区切りの空白を許容する", () => {
    expect(parseGrade(" 3 - 1 ")).toBe(3);
  });

  it("部活などクラス表記でない主催者は null", () => {
    expect(parseGrade("天文部")).toBeNull();
    expect(parseGrade("")).toBeNull();
    expect(parseGrade("1年1組")).toBeNull();
  });

  it("高専に存在しない学年は null", () => {
    expect(parseGrade("0-1")).toBeNull();
    expect(parseGrade("6-1")).toBeNull();
  });
});

describe("groupBoothsByGrade", () => {
  it("学年ごとにまとめ、学年の昇順で返す", () => {
    const groups = groupBoothsByGrade([
      booth("たこ焼き", "3-1"),
      booth("焼きそば", "1-2"),
      booth("クレープ", "3-2"),
    ]);

    expect(groups.map((g) => g.grade)).toEqual([1, 3]);
    expect(groups[1].booths.map((b) => b.name)).toEqual([
      "たこ焼き",
      "クレープ",
    ]);
  });

  it("ブースが無い学年は含めない", () => {
    const groups = groupBoothsByGrade([booth("たこ焼き", "2-1")]);
    expect(groups).toHaveLength(1);
    expect(groups[0].grade).toBe(2);
  });

  it("部活のブースは除外する(クラス展示のページなので)", () => {
    const groups = groupBoothsByGrade([
      booth("プラネタリウム", "天文部"),
      booth("たこ焼き", "1-1"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].booths.map((b) => b.name)).toEqual(["たこ焼き"]);
  });

  it("空配列を渡しても落ちない", () => {
    expect(groupBoothsByGrade([])).toEqual([]);
  });
});
