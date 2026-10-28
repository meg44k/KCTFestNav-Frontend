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

import type { BoothResponse } from "@/lib/api/booths";
import { deleteBooth, moveBooths, saveBooth } from "./manage-booths";

const form = (name: string) => {
  const f = new FormData();
  f.set("name", name);
  return f;
};

beforeEach(() => {
  manageRequest.mockReset();
  revalidatePath.mockReset();
});

describe("saveBooth", () => {
  it("新規は POST して一覧を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveBooth(undefined, undefined, form("たこ焼き"))).toEqual({
      done: true,
    });
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/booths");
    expect(manageRequest.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).name).toBe(
      "たこ焼き",
    );
    expect(revalidatePath).toHaveBeenCalledWith("/manage/booths");
  });

  it("編集は PUT /manage/booths/:id", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    await saveBooth(
      { id: 7, x: 0, y: 0, z: 0 } as BoothResponse,
      undefined,
      form("x"),
    );
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/booths/7");
    expect(manageRequest.mock.calls[0][1].method).toBe("PUT");
  });

  it("入力エラーは API を呼ばずに返す", async () => {
    expect(await saveBooth(undefined, undefined, form(""))).toEqual({
      error: "ブース名を入力してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("API の失敗は文言にして返す", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await saveBooth(undefined, undefined, form("x"))).toEqual({
      error: "この操作の権限がありません。",
    });
  });

  it("認証切れはログインし直し", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unauthorized" });
    await expect(saveBooth(undefined, undefined, form("x"))).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});

describe("deleteBooth", () => {
  it("DELETE して一覧を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await deleteBooth(3)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/3", {
      method: "DELETE",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/booths");
  });
});

describe("moveBooths(地図でピンを動かしたブースの位置だけを保存する)", () => {
  const latest: BoothResponse = {
    id: 5,
    name: "たこ焼き",
    organizer: "1-1",
    detail: "おいしい",
    location: "中庭",
    image_url: "https://img/a.webp",
    congestion_status: 2,
    x: 0,
    y: 0,
    z: 0,
    latitude: 33.1,
    longitude: 130.1,
    floor: 0,
  };

  it("最新の内容を読み直し、位置と階だけを書き換えて保存する", async () => {
    manageRequest
      .mockResolvedValueOnce({ ok: true, data: latest })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    expect(
      await moveBooths([{ id: 5, latitude: 33.2, longitude: 130.2, floor: 3 }]),
    ).toEqual({ saved: 1 });

    expect(manageRequest.mock.calls[0][0]).toBe("/booths/5");
    const [path, init] = manageRequest.mock.calls[1];
    expect(path).toBe("/manage/booths/5");
    expect(init.method).toBe("PUT");
    // ほかの項目(名前・混雑度・写真など)は最新のまま
    expect(JSON.parse(init.body)).toEqual({
      name: "たこ焼き",
      organizer: "1-1",
      detail: "おいしい",
      location: "中庭",
      image_url: "https://img/a.webp",
      congestion_status: 2,
      x: 0,
      y: 0,
      z: 0,
      latitude: 33.2,
      longitude: 130.2,
      floor: 3,
    });
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("途中で失敗したら止めて、何件保存できたかとエラーを返す", async () => {
    manageRequest
      .mockResolvedValueOnce({ ok: true, data: latest })
      .mockResolvedValueOnce({ ok: true, data: undefined })
      .mockResolvedValueOnce({ ok: false, reason: "unavailable" });
    const res = await moveBooths([
      { id: 5, latitude: 33.2, longitude: 130.2, floor: 0 },
      { id: 6, latitude: 33.3, longitude: 130.3, floor: 0 },
    ]);
    expect(res.saved).toBe(1);
    expect(res.error).toBeTruthy();
  });

  it("おかしな値は送らない", async () => {
    const res = await moveBooths([
      { id: 5, latitude: Number.NaN, longitude: 130.2, floor: 0 },
    ]);
    expect(res.error).toBeTruthy();
    expect(manageRequest).not.toHaveBeenCalled();
  });
});
