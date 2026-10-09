import { beforeEach, describe, expect, it, vi } from "vitest";

// cookie の作りもの
const jar = vi.hoisted(() => new Map<string, string>());
const setCookie = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      jar.has(name) ? { name, value: jar.get(name) } : undefined,
    set: (name: string, value: string, opts: unknown) => {
      jar.set(name, value);
      setCookie(name, value, opts);
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);
vi.stubEnv("INTERNAL_API_KEY", "key");

import { FAILED, TOO_MANY, VOTER_COOKIE } from "@/lib/api/internal";
import { myLikes, toggleLike } from "./likes";

const res = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status });

// 呼ばれた URL・メソッド・ヘッダー
const calls = () =>
  fetchMock.mock.calls.map(([url, init]) => ({
    url: String(url).replace(/^https?:\/\/[^/]+/, ""),
    method: init?.method ?? "GET",
    headers: init?.headers as Record<string, string>,
  }));

beforeEach(() => {
  jar.clear();
  setCookie.mockReset();
  fetchMock.mockReset();
});

describe("toggleLike", () => {
  it("番号が無ければもらって cookie に入れてから押す", async () => {
    fetchMock
      .mockResolvedValueOnce(res(201, { voter: "v.sig" }))
      .mockResolvedValueOnce(res(204));
    expect(await toggleLike(5, true)).toEqual({});
    expect(setCookie).toHaveBeenCalledWith(VOTER_COOKIE, "v.sig", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    const [issue, put] = calls();
    expect(issue).toMatchObject({ url: "/internal/voters", method: "POST" });
    expect(issue.headers["X-Internal-Key"]).toBe("key");
    expect(put).toMatchObject({ url: "/internal/likes/5", method: "PUT" });
    expect(put.headers).toMatchObject({
      "X-Internal-Key": "key",
      "X-Voter": "v.sig",
    });
  });

  it("番号があればそのまま使う。取り消しは DELETE", async () => {
    jar.set(VOTER_COOKIE, "old.sig");
    fetchMock.mockResolvedValueOnce(res(204));
    expect(await toggleLike(5, false)).toEqual({});
    expect(calls()).toHaveLength(1);
    expect(calls()[0]).toMatchObject({
      url: "/internal/likes/5",
      method: "DELETE",
    });
    expect(calls()[0].headers["X-Voter"]).toBe("old.sig");
  });

  it("番号が通らなければ作り直して 1 回だけやり直す", async () => {
    jar.set(VOTER_COOKIE, "stale.sig");
    fetchMock
      .mockResolvedValueOnce(res(401))
      .mockResolvedValueOnce(res(201, { voter: "new.sig" }))
      .mockResolvedValueOnce(res(204));
    expect(await toggleLike(5, true)).toEqual({});
    expect(calls()[2].headers["X-Voter"]).toBe("new.sig");
    expect(jar.get(VOTER_COOKIE)).toBe("new.sig");
  });

  it("やり直しても 401 なら失敗", async () => {
    jar.set(VOTER_COOKIE, "stale.sig");
    fetchMock
      .mockResolvedValueOnce(res(401))
      .mockResolvedValueOnce(res(201, { voter: "new.sig" }))
      .mockResolvedValueOnce(res(401));
    expect(await toggleLike(5, true)).toEqual({ error: FAILED });
    expect(calls()).toHaveLength(3);
  });

  it("混み合っていれば専用の文言", async () => {
    fetchMock.mockResolvedValueOnce(res(429));
    expect(await toggleLike(5, true)).toEqual({ error: TOO_MANY });
    jar.set(VOTER_COOKIE, "v.sig");
    fetchMock.mockResolvedValueOnce(res(429));
    expect(await toggleLike(5, true)).toEqual({ error: TOO_MANY });
  });

  it("そのほかの失敗とつながらないときは FAILED", async () => {
    jar.set(VOTER_COOKIE, "v.sig");
    fetchMock.mockResolvedValueOnce(res(400));
    expect(await toggleLike(5, true)).toEqual({ error: FAILED });
    fetchMock.mockRejectedValueOnce(new Error("down"));
    expect(await toggleLike(5, true)).toEqual({ error: FAILED });
  });

  it("ID が数でなければ送らない", async () => {
    expect(await toggleLike(Number.NaN, true)).toEqual({ error: FAILED });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("myLikes", () => {
  it("番号が無ければ問い合わせない", async () => {
    expect(await myLikes()).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("番号があれば押したブースを返す", async () => {
    jar.set(VOTER_COOKIE, "v.sig");
    fetchMock.mockResolvedValueOnce(res(200, { booth_ids: [3, 8] }));
    expect(await myLikes()).toEqual([3, 8]);
    expect(calls()[0]).toMatchObject({
      url: "/internal/likes/mine",
      method: "GET",
    });
    expect(calls()[0].headers["X-Voter"]).toBe("v.sig");
  });

  it("失敗したら空", async () => {
    jar.set(VOTER_COOKIE, "v.sig");
    fetchMock.mockResolvedValueOnce(res(500));
    expect(await myLikes()).toEqual([]);
  });
});
