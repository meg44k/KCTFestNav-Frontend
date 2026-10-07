import { describe, expect, it } from "vitest";
import { INTRO_COOKIE_SET, introSeen } from "./intro";

describe("タイトル画面を見たか", () => {
  it("Cookie が 1 のときだけ見たことにする", () => {
    expect(introSeen("1")).toBe(true);
    expect(introSeen(undefined)).toBe(false);
    expect(introSeen("")).toBe(false);
  });

  it("30 日、サイト全体で覚える", () => {
    expect(INTRO_COOKIE_SET).toBe(
      "kct_intro_seen=1; max-age=2592000; path=/; samesite=lax",
    );
  });
});
