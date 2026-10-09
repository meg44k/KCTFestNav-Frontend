import { describe, expect, it } from "vitest";
import { fitScale } from "./fit-text";

describe("fitScale(はみ出さない大きさの割合)", () => {
  it("入るときはそのまま", () => {
    expect(fitScale(200, 150)).toBe(1);
    expect(fitScale(200, 200)).toBe(1);
  });
  it("はみ出すときは入るまで小さくする", () => {
    expect(fitScale(200, 400)).toBe(0.5);
  });
  it("小さくしすぎない(読めなくなるので下限で止める)", () => {
    expect(fitScale(100, 1000)).toBe(0.4);
    expect(fitScale(100, 1000, 0.6)).toBe(0.6);
  });
  it("幅がまだ測れないときはそのまま", () => {
    expect(fitScale(0, 100)).toBe(1);
    expect(fitScale(100, 0)).toBe(1);
  });
});
