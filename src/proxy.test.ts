import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { proxy } from "./proxy";

const request = (path: string, cookie?: string) =>
  new NextRequest(`https://localhost:3000${path}`, {
    headers: cookie ? { cookie } : {},
  });

describe("proxy", () => {
  it("未ログインならログイン画面へ", () => {
    const res = proxy(request("/manage/booths"));
    expect(res.headers.get("location")).toBe(
      "https://localhost:3000/manage/login",
    );
  });

  it("管理画面はブラウザに保存させない（ログアウト後に戻るボタンで見えないように）", () => {
    const res = proxy(request("/manage/booths", "kct_manage_token=jwt"));
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
  });
});
