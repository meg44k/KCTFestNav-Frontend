import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
  requireRole,
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
import { loadMyBooth, saveDetail, setCongestion } from "./my-booth";

// 戻り値を返すと vitest が後片付けの関数として呼んでしまうので、ブロックで書く
beforeEach(() => {
  manageRequest.mockReset();
  requireRole.mockReset();
  revalidatePath.mockReset();
});

const student = (assigned_booth_id: number) => ({
  ok: true,
  user: {
    id: "u",
    name: "1-1",
    login_id: "booth-3",
    role: "Student",
    assigned_booth_id,
  },
});

describe("setCongestion", () => {
  it("PATCH して画面を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setCongestion(3, 2)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/3/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 2 }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/my-booth");
  });

  it("0/1/2 以外は送らない", async () => {
    expect(await setCongestion(3, 5)).toEqual({
      error: "混雑度を選び直してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("失敗は文言で返す", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await setCongestion(3, 1)).toEqual({
      error: "この操作の権限がありません。",
    });
  });

  it("認証切れはログインし直し", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unauthorized" });
    await expect(setCongestion(3, 1)).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});

describe("saveDetail", () => {
  it("今の値に説明と画像を重ねて PUT する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    const f = new FormData();
    f.set("detail", "新しい説明");
    f.set("imageUrl", "");
    const current = {
      id: 3,
      name: "たこ焼き",
      x: 0,
      y: 0,
      z: 0,
    } as BoothResponse;
    expect(await saveDetail(current, undefined, f)).toEqual({ saved: true });
    const [path, init] = manageRequest.mock.calls[0];
    expect(path).toBe("/manage/booths/3");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toMatchObject({
      name: "たこ焼き",
      detail: "新しい説明",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/my-booth");
  });
});

describe("loadMyBooth", () => {
  it("担当ブースを返す", async () => {
    requireRole.mockResolvedValue(student(3));
    manageRequest.mockResolvedValue({
      ok: true,
      data: { id: 3, name: "たこ焼き" },
    });
    expect(await loadMyBooth()).toEqual({
      ok: true,
      booth: { id: 3, name: "たこ焼き" },
    });
    expect(manageRequest).toHaveBeenCalledWith("/booths/3");
    expect(requireRole).toHaveBeenCalledWith(["Student"]);
  });

  it("担当ブースが無い(0)ときは案内", async () => {
    requireRole.mockResolvedValue(student(0));
    expect(await loadMyBooth()).toEqual({
      ok: false,
      message: "担当ブースが見つかりません。管理者に連絡してください。",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("担当ブースが削除済み(404)のときも同じ案内", async () => {
    requireRole.mockResolvedValue(student(9));
    manageRequest.mockResolvedValue({ ok: false, reason: "rejected" });
    expect(await loadMyBooth()).toEqual({
      ok: false,
      message: "担当ブースが見つかりません。管理者に連絡してください。",
    });
  });

  it("Student 以外は requireRole の文言", async () => {
    requireRole.mockResolvedValue({
      ok: false,
      message: "この操作の権限がありません。",
    });
    expect(await loadMyBooth()).toEqual({
      ok: false,
      message: "この操作の権限がありません。",
    });
  });
});
