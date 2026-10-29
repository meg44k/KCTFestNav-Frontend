import { describe, expect, it } from "vitest";
import { shouldAutoLocate } from "./auto-locate";

describe("shouldAutoLocate(地図を開いたとき自動で現在地を取りにいくか)", () => {
  it("許可済みなら取りにいく", () => {
    expect(shouldAutoLocate("granted")).toBe(true);
  });

  it("まだ聞いていないなら取りにいく(許可の確認が出る)", () => {
    expect(shouldAutoLocate("prompt")).toBe(true);
  });

  it("許可しないを選んでいた人には、開くたびに取りにいかない", () => {
    expect(shouldAutoLocate("denied")).toBe(false);
  });

  it("許可の状態が分からないブラウザでは取りにいく", () => {
    expect(shouldAutoLocate(undefined)).toBe(true);
  });
});
