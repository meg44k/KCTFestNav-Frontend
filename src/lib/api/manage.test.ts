import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieValue = vi.hoisted(() => ({
  token: "jwt-token" as string | undefined,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kct_manage_token" && cookieValue.token
        ? { name, value: cookieValue.token }
        : undefined,
  }),
}));

import {
  failureMessage,
  fetchMe,
  manageRequest,
  requireRole,
  toFailure,
} from "./manage";

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

  it("応答が返らないまま待ち続けないよう、タイムアウトを付ける", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await manageRequest("/auth/me");
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
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
      "接続できませんでした。時間をおいて再度お試しください。",
    );
    expect(failureMessage("forbidden")).toBe("この操作の権限がありません。");
  });
});

describe("fetchMe", () => {
  it("アカウントが削除されていて 404 のときもログインし直してもらう", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 404 }));
    expect(await fetchMe()).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("成功時はユーザーを返す", async () => {
    const user = {
      id: "u",
      name: "管理者",
      login_id: "a",
      assigned_booth_id: 0,
      role: "Admin",
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(user), { status: 200 }),
    );
    expect(await fetchMe()).toEqual({ ok: true, data: user });
  });
});

describe("manageRequest の本文", () => {
  it("本文が空の 200 / 201 も成功として扱う", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    expect(await manageRequest("/manage/booths/1", { method: "PUT" })).toEqual({
      ok: true,
      data: undefined,
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
    expect(await manageRequest("/manage/booths", { method: "POST" })).toEqual({
      ok: true,
      data: undefined,
    });
  });
});

describe("requireRole", () => {
  const me = (role: string) =>
    new Response(
      JSON.stringify({
        id: "u",
        name: "n",
        login_id: "l",
        assigned_booth_id: 0,
        role,
      }),
      { status: 200 },
    );

  it("許可されたロールならユーザーを返す", async () => {
    fetchMock.mockResolvedValue(me("Admin"));
    const res = await requireRole(["Admin"]);
    expect(res.ok && res.user.role).toBe("Admin");
  });

  it("ロール外は権限なし", async () => {
    fetchMock.mockResolvedValue(me("Student"));
    expect(await requireRole(["Admin"])).toEqual({
      ok: false,
      message: "この操作の権限がありません。",
    });
  });

  it("期限切れはログインし直してもらう", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(requireRole(["Admin"])).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });

  it("サーバーに繋がらないときは案内を返す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await requireRole(["Admin"])).toEqual({
      ok: false,
      message: "接続できませんでした。時間をおいて再度お試しください。",
    });
  });
});
