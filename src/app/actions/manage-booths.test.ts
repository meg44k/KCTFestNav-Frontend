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
import { deleteBooth, saveBooth } from "./manage-booths";

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
