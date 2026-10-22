import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`REDIRECT:${p}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import {
  removeAllLikes,
  removeLikes,
  saveAnnouncement,
  setBoothCongestion,
} from "./ops";

// 戻り値を返すと vitest が後片付けの関数として呼んでしまうので、ブロックで書く
beforeEach(() => {
  manageRequest.mockReset();
  revalidatePath.mockReset();
});

describe("setBoothCongestion", () => {
  it("PATCH して当日運営の画面を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setBoothCongestion(5, 1)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/5/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 1 }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops", "layout");
  });

  it("準備中(3)も送れる", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setBoothCongestion(5, 3)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/5/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 3 }),
    });
  });

  it("0〜3 以外は送らない", async () => {
    manageRequest.mockReset();
    expect(await setBoothCongestion(5, 4)).toEqual({
      error: "混雑度を選び直してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });
});

describe("saveAnnouncement", () => {
  it("空なら送らない", async () => {
    const f = new FormData();
    f.set("content", "  ");
    expect(await saveAnnouncement(undefined, f)).toEqual({
      error: "お知らせを入力してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("PUT して保存した旨を返す", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    const f = new FormData();
    f.set("content", " 13時から体育館でライブ ");
    expect(await saveAnnouncement(undefined, f)).toEqual({ saved: true });
    expect(manageRequest).toHaveBeenCalledWith("/manage/announcements", {
      method: "PUT",
      body: JSON.stringify({ content: "13時から体育館でライブ" }),
    });
  });
});

describe("removeLikes", () => {
  it("時間帯を付けて DELETE し、消した件数を返す", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: { removed: 4 } });
    expect(
      await removeLikes(3, "2026-10-31T01:00:00Z", "2026-10-31T01:20:00Z"),
    ).toEqual({ removed: 4 });
    expect(manageRequest).toHaveBeenCalledWith(
      "/manage/likes/3?from=2026-10-31T01%3A00%3A00Z&to=2026-10-31T01%3A20%3A00Z",
      { method: "DELETE" },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops", "layout");
  });

  it("失敗は文言にする", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "forbidden" });
    const res = await removeLikes(3, "a", "b");
    expect(res.error).toBeTruthy();
  });
});

describe("removeAllLikes", () => {
  it("全部消す", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: { removed: 9 } });
    expect(await removeAllLikes()).toEqual({ removed: 9 });
    expect(manageRequest).toHaveBeenCalledWith("/manage/likes", {
      method: "DELETE",
    });
  });
});
