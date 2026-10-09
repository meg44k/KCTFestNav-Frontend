import { describe, expect, it } from "vitest";
import { canLike, withLike } from "./likes";

describe("withLike", () => {
  it("押すと足し、取り消すと抜く。元は変えない", () => {
    const before = new Set([1]);
    expect([...withLike(before, 2, true)]).toEqual([1, 2]);
    expect([...withLike(before, 1, false)]).toEqual([]);
    expect([...before]).toEqual([1]);
  });

  it("同じ状態にしても変わらない", () => {
    expect([...withLike(new Set([1]), 1, true)]).toEqual([1]);
    expect([...withLike(new Set<number>(), 1, false)]).toEqual([]);
  });
});

describe("canLike", () => {
  it("クラス展示だけ", () => {
    expect(canLike("3-2")).toBe(true);
    expect(canLike("天文部")).toBe(false);
    expect(canLike("")).toBe(false);
  });
});
