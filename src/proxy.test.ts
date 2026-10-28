import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
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

describe("proxy(メンテナンス)", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("メンテナンス中は、来場者のページを 503 でメンテナンス画面に差し替える", () => {
    vi.stubEnv("MAINTENANCE_MODE", "1");
    const res = proxy(request("/map"));
    expect(res.status).toBe(503);
    expect(res.headers.get("x-middleware-rewrite")).toBe(
      "https://localhost:3000/maintenance",
    );
    expect(res.headers.get("retry-after")).not.toBeNull();
  });

  it("メンテナンス中でも、管理画面はふだんどおり使える", () => {
    vi.stubEnv("MAINTENANCE_MODE", "1");
    const res = proxy(request("/manage/booths", "kct_manage_token=jwt"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("メンテナンス中でないときは、来場者のページをそのまま出す", () => {
    vi.stubEnv("MAINTENANCE_MODE", "0");
    const res = proxy(request("/map"));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("メンテナンス中でないときにメンテナンス画面を開いたら、トップへ戻す", () => {
    vi.stubEnv("MAINTENANCE_MODE", "0");
    const res = proxy(request("/maintenance"));
    expect(res.headers.get("location")).toBe("https://localhost:3000/");
  });
});
