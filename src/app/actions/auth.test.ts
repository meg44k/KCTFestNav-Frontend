import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.hoisted(() => vi.fn());
const checkBotId = vi.hoisted(() => vi.fn());
vi.mock("botid/server", () => ({ checkBotId }));
const requestHeaders = vi.hoisted(() => new Headers());
vi.mock("next/headers", () => ({
  cookies: async () => ({ set: cookieSet }),
  headers: async () => requestHeaders,
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
  vi.stubEnv("INTERNAL_API_KEY", "test-key");
  for (const k of [...requestHeaders.keys()]) requestHeaders.delete(k);
  requestHeaders.set("x-forwarded-for", "203.0.113.1, 10.0.0.1");
  checkBotId.mockReset();
  checkBotId.mockResolvedValue({ isBot: false });
  cookieSet.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
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
    // 合言葉と、ログインした人の接続元(回数の上限を数える)をバックエンドに渡す
    expect(init.headers).toMatchObject({
      "X-Internal-Key": "test-key",
      "X-Client-IP": "203.0.113.1",
    });
    expect(cookieSet).toHaveBeenCalledWith("kct_manage_token", "jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/manage",
      maxAge: 60 * 60 * 72,
    });
  });

  it("応答が返らないまま待ち続けないよう、タイムアウトを付ける", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await loginAction(undefined, form("booth-1", "pass"));
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
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

  it("パスワード違いで残りの回数が分かれば「あと N 回」と出す", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "unauthorized", remaining: 3 }), {
        status: 401,
      }),
    );
    expect(await loginAction(undefined, form("booth-1", "wrong"))).toEqual({
      error: "ID かパスワードが違います(あと 3 回)",
      loginId: "booth-1",
    });
  });

  it("合言葉が設定されていなければ、バックエンドを呼ばずに案内を出す", async () => {
    vi.stubEnv("INTERNAL_API_KEY", "");
    const res = await loginAction(undefined, form("booth-1", "pass"));
    expect(res?.error).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("パスワード違い(401)はエラー文言を返し、Cookie は保存しない", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await loginAction(undefined, form("booth-1", "wrong"))).toEqual({
      error: "ID かパスワードが違います",
      loginId: "booth-1",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("失敗が続いて止められた(429)ときは、待ってから試すよう伝える", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 429 }));
    expect(await loginAction(undefined, form("booth-1", "wrong"))).toEqual({
      error:
        "ログインに続けて失敗したため、しばらく止めています。10 分ほど待ってからもう一度お試しください",
      loginId: "booth-1",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("ボットと見分けたら、パスワードを試させずに断る(総当たりを入口で止める)", async () => {
    checkBotId.mockResolvedValue({ isBot: true });
    const res = await loginAction(undefined, form("booth-1", "guess"));
    expect(res?.error).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("BotID 自体が失敗したときは止めない(本人が締め出されないように)", async () => {
    checkBotId.mockRejectedValue(new Error("x-vercel-oidc-token missing"));
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await loginAction(undefined, form("booth-1", "wrong"));
    expect(fetchMock).toHaveBeenCalled();
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
      error: "接続できませんでした。時間をおいて再度お試しください。",
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
