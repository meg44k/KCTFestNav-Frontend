import { describe, expect, it } from "vitest";
import { needsLogin } from "./proxy-rules";

describe("needsLogin", () => {
  it("Cookie が無ければ管理画面からログイン画面へ飛ばす", () => {
    expect(needsLogin("/manage", false)).toBe(true);
    expect(needsLogin("/manage/booths", false)).toBe(true);
  });

  it("ログイン画面とログアウトは飛ばさない（ループ防止）", () => {
    expect(needsLogin("/manage/login", false)).toBe(false);
    expect(needsLogin("/manage/logout", false)).toBe(false);
  });

  it("Cookie があれば通す（中身の正しさはバックエンドが判断する）", () => {
    expect(needsLogin("/manage/booths", true)).toBe(false);
  });
});
