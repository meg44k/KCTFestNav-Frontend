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

import type { LiveResponse } from "@/lib/api/lives";
import {
  deleteLive,
  saveAnnouncement,
  saveLive,
  setBoothCongestion,
  setLiveStatus,
} from "./ops";

// 戻り値を返すと vitest が後片付けの関数として呼んでしまうので、ブロックで書く
beforeEach(() => {
  manageRequest.mockReset();
  revalidatePath.mockReset();
});

describe("setLiveStatus", () => {
  it("公演中にするとき、他の公演中を終了にしてから切り替える", async () => {
    manageRequest.mockImplementation(async (path: string) => {
      if (path === "/lives") {
        return {
          ok: true,
          data: {
            lives: [
              { id: 1, name: "A", status: 1 },
              { id: 2, name: "B", status: 0 },
              { id: 3, name: "C", status: 1 },
            ],
          },
        };
      }
      return { ok: true, data: undefined };
    });
    expect(await setLiveStatus(2, 1)).toEqual({});
    const patches = manageRequest.mock.calls
      .filter((c) => c[1]?.method === "PATCH")
      .map((c) => [c[0], JSON.parse(c[1].body).status]);
    expect(patches).toEqual([
      ["/manage/lives/1/status", 2],
      ["/manage/lives/3/status", 2],
      ["/manage/lives/2/status", 1],
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops");
  });

  it("前の公演中を終了にできなければ切り替えず、どれかを伝える", async () => {
    manageRequest.mockImplementation(async (path: string) => {
      if (path === "/lives") {
        return {
          ok: true,
          data: {
            lives: [
              { id: 1, name: "A", status: 1 },
              { id: 2, name: "B", status: 0 },
            ],
          },
        };
      }
      return { ok: false, reason: "unavailable" };
    });
    expect(await setLiveStatus(2, 1)).toEqual({
      error:
        "「A」を終了にできませんでした。サーバーに接続できません。時間をおいて再度お試しください。",
    });
    expect(
      manageRequest.mock.calls.some((c) => c[0] === "/manage/lives/2/status"),
    ).toBe(false);
  });

  it("開演前・終了への切り替えは他を触らない", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setLiveStatus(2, 2)).toEqual({});
    expect(manageRequest).toHaveBeenCalledTimes(1);
  });

  it("0/1/2 以外は送らない", async () => {
    expect(await setLiveStatus(2, 9)).toEqual({
      error: "状態を選び直してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("認証切れはログインし直し", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unauthorized" });
    await expect(setLiveStatus(2, 2)).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});

describe("setBoothCongestion", () => {
  it("PATCH して当日運営の画面を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setBoothCongestion(5, 1)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/5/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 1 }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops");
  });

  it("0/1/2 以外は送らない", async () => {
    expect(await setBoothCongestion(5, 3)).toEqual({
      error: "混雑度を選び直してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });
});

describe("saveLive", () => {
  const form = () => {
    const f = new FormData();
    f.set("name", "軽音部");
    f.set("startTime", "2026-10-31T13:00");
    f.set("endTime", "2026-10-31T13:30");
    f.set("sessionNumber", "1");
    return f;
  };

  it("新規は POST", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveLive(undefined, undefined, form())).toEqual({
      done: true,
    });
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/lives");
    expect(manageRequest.mock.calls[0][1].method).toBe("POST");
  });

  it("編集は PUT /manage/lives/:id", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    await saveLive({ id: 4, status: 1 } as LiveResponse, undefined, form());
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/lives/4");
    expect(manageRequest.mock.calls[0][1].method).toBe("PUT");
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).status).toBe(1);
  });

  it("入力エラーは送らない", async () => {
    const f = form();
    f.set("name", "");
    expect(await saveLive(undefined, undefined, f)).toEqual({
      error: "ライブ名を入力してください",
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

describe("deleteLive", () => {
  it("DELETE する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await deleteLive(4)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/lives/4", {
      method: "DELETE",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops");
  });
});
