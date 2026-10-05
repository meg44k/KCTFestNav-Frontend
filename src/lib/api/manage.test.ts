import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieValue = vi.hoisted(() => ({
  token: "jwt-token" as string | undefined,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kct_manage_token" && cookieValue.token
        ? { name, value: cookieValue.token }
        : undefined,
  }),
}));

import { failureMessage, manageRequest, toFailure } from "./manage";

const fetchMock = vi.fn();

beforeEach(() => {
  cookieValue.token = "jwt-token";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("toFailure", () => {
  it("ステータスを失敗の種類に分ける", () => {
    expect(toFailure(401)).toBe("unauthorized");
    expect(toFailure(403)).toBe("forbidden");
    expect(toFailure(400)).toBe("rejected");
    expect(toFailure(404)).toBe("rejected");
    expect(toFailure(500)).toBe("unavailable");
  });
});

describe("manageRequest", () => {
  it("Cookie の JWT を Authorization に付け、キャッシュしない", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ name: "管理者" }), { status: 200 }),
    );

    const res = await manageRequest<{ name: string }>("/auth/me");

    expect(res).toEqual({ ok: true, data: { name: "管理者" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/me$/);
    expect(init.headers.Authorization).toBe("Bearer jwt-token");
    expect(init.cache).toBe("no-store");
  });

  it("本文の無い 204 は data を undefined にする", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await manageRequest("/manage/booths/1", { method: "DELETE" }),
    ).toEqual({ ok: true, data: undefined });
  });

  it("Cookie が無いときは API を呼ばずに unauthorized", async () => {
    cookieValue.token = undefined;
    expect(await manageRequest("/auth/me")).toEqual({
      ok: false,
      reason: "unauthorized",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401（期限切れ・不正なトークン）は unauthorized", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await manageRequest("/auth/me")).toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("403 は forbidden", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 403 }));
    expect(await manageRequest("/manage/users")).toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("接続できないときは例外にせず unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await manageRequest("/auth/me")).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});

describe("failureMessage", () => {
  it("API が止まっているときの文言は来場者画面と同じ方針", () => {
    expect(failureMessage("unavailable")).toBe(
      "サーバーに接続できません。時間をおいて再度お試しください。",
    );
    expect(failureMessage("forbidden")).toBe("この操作の権限がありません。");
  });
});
