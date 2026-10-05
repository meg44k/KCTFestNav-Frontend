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

import { stepBlock } from "./stage";

// 戻り値を返すと vitest が後片付けの関数として呼んでしまうので、ブロックで書く
beforeEach(() => {
  manageRequest.mockReset();
  revalidatePath.mockReset();
});

describe("stepBlock", () => {
  it("次へは next、戻すは prev に POST し、更新後のブロックを返して画面を更新する", async () => {
    const block = { id: 3, current_order: 2 };
    manageRequest.mockResolvedValue({ ok: true, data: block });
    expect(await stepBlock(3, "next")).toEqual({ block });
    expect(manageRequest).toHaveBeenCalledWith("/manage/stage/blocks/3/next", {
      method: "POST",
    });
    await stepBlock(3, "prev");
    expect(manageRequest).toHaveBeenLastCalledWith(
      "/manage/stage/blocks/3/prev",
      { method: "POST" },
    );
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops", "layout");
  });

  it("想定外の向きや id は送らない", async () => {
    // クライアントから任意の値が来うるので、サーバー側で確かめる
    expect(
      (await stepBlock(3, "skip" as unknown as "next")).error,
    ).toBeTruthy();
    expect((await stepBlock(1.5, "next")).error).toBeTruthy();
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("消されたブロックは画面の更新を促す", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "rejected" });
    expect(await stepBlock(3, "next")).toEqual({
      error: "このブロックは削除されています。画面を更新してください。",
    });
  });

  it("接続できなければその旨、認証切れはログインし直し", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect((await stepBlock(3, "next")).error).toBe(
      "接続できませんでした。時間をおいて再度お試しください。",
    );
    manageRequest.mockResolvedValue({ ok: false, reason: "unauthorized" });
    await expect(stepBlock(3, "next")).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});
