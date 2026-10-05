import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { loginAction, logoutAction } from "./auth";

const fetchMock = vi.fn();
const form = (loginId: string, password: string) => {
  const fd = new FormData();
  fd.set("loginId", loginId);
  fd.set("password", password);
  return fd;
};

beforeEach(() => {
  cookieSet.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("loginAction", () => {
  it("成功したら JWT を Cookie に保存して /manage へ", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt" }), { status: 200 }),
    );

    await expect(
      loginAction(undefined, form("booth-1", "pass")),
    ).rejects.toThrow("REDIRECT:/manage");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(init.body)).toEqual({
      login_id: "booth-1",
      password: "pass",
    });
    expect(cookieSet).toHaveBeenCalledWith("kct_manage_token", "jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/manage",
      maxAge: 60 * 60 * 72,
    });
  });

  it("ID の前後の空白は取り除く", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ token: "jwt" }), { status: 200 }),
    );
    await expect(
      loginAction(undefined, form("  booth-1 ", "pass")),
    ).rejects.toThrow();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).login_id).toBe(
      "booth-1",
    );
  });

  it("パスワード違い(401)はエラー文言を返し、Cookie は保存しない", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await loginAction(undefined, form("booth-1", "wrong"))).toEqual({
      error: "ID かパスワードが違います",
      loginId: "booth-1",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("未入力なら API を呼ばない", async () => {
    expect(await loginAction(undefined, form("", ""))).toEqual({
      error: "ID とパスワードを入力してください",
      loginId: "",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("バックエンドが止まっていても例外にしない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await loginAction(undefined, form("booth-1", "pass"))).toEqual({
      error: "サーバーに接続できません。時間をおいて再度お試しください。",
      loginId: "booth-1",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  it("Cookie を消してログイン画面へ", async () => {
    await expect(logoutAction()).rejects.toThrow("REDIRECT:/manage/login");
    expect(cookieSet).toHaveBeenCalledWith("kct_manage_token", "", {
      path: "/manage",
      maxAge: 0,
    });
  });
});
