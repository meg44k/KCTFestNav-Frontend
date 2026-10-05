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
  deleteStageItem,
  movePerformer,
  saveBlock,
  savePerformer,
  saveSection,
  stepBlock,
} from "./stage";

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

describe("番組表の編集", () => {
  const fd = (fields: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };
  const ok = () =>
    manageRequest.mockResolvedValue({ ok: true, data: { id: 9 } });
  const lastCall = () => manageRequest.mock.lastCall;

  it("セクション: 新規は POST、編集は PUT", async () => {
    ok();
    expect(
      await saveSection(undefined, undefined, fd({ name: "Live1" })),
    ).toEqual({ done: true });
    expect(lastCall()).toEqual([
      "/manage/stage/sections",
      {
        method: "POST",
        body: JSON.stringify({ name: "Live1", location: "", sort_order: 0 }),
      },
    ]);
    await saveSection(4, undefined, fd({ name: "Live1" }));
    expect(lastCall()?.[0]).toBe("/manage/stage/sections/4");
    expect(lastCall()?.[1].method).toBe("PUT");
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops", "layout");
  });

  it("ブロック: 新規はセクションの下に POST、編集は PUT", async () => {
    ok();
    const times = {
      startTime: "2026-10-31T13:00",
      endTime: "2026-10-31T13:50",
    };
    await saveBlock(4, undefined, undefined, fd(times));
    expect(lastCall()?.[0]).toBe("/manage/stage/sections/4/blocks");
    expect(lastCall()?.[1].method).toBe("POST");
    await saveBlock(4, 7, undefined, fd(times));
    expect(lastCall()?.[0]).toBe("/manage/stage/blocks/7");
    expect(lastCall()?.[1].method).toBe("PUT");
  });

  it("出演者: 新規はブロックの下に POST、編集は PUT", async () => {
    ok();
    await savePerformer(7, undefined, undefined, fd({ name: "バンドA" }));
    expect(lastCall()?.[0]).toBe("/manage/stage/blocks/7/performers");
    await savePerformer(7, 12, undefined, fd({ name: "バンドA" }));
    expect(lastCall()?.[0]).toBe("/manage/stage/performers/12");
    expect(lastCall()?.[1].method).toBe("PUT");
  });

  it("入力が正しくなければ送らない", async () => {
    expect(await saveSection(undefined, undefined, fd({ name: "" }))).toEqual({
      error: "セクション名を入力してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("断られたら消された可能性を伝える", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "rejected" });
    expect(
      (await savePerformer(7, 12, undefined, fd({ name: "a" })))?.error,
    ).toBe(
      "見つかりませんでした。削除されている可能性があります。画面を更新してください。",
    );
  });

  it("削除と並べ替え", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await deleteStageItem("block", 7)).toEqual({});
    expect(lastCall()).toEqual([
      "/manage/stage/blocks/7",
      { method: "DELETE" },
    ]);
    await deleteStageItem("section", 4);
    expect(lastCall()?.[0]).toBe("/manage/stage/sections/4");
    await deleteStageItem("performer", 12);
    expect(lastCall()?.[0]).toBe("/manage/stage/performers/12");
    expect(await movePerformer(12, "down")).toEqual({});
    expect(lastCall()).toEqual([
      "/manage/stage/performers/12/move",
      { method: "POST", body: JSON.stringify({ direction: "down" }) },
    ]);
  });

  it("想定外の種類・向きは送らない", async () => {
    expect((await deleteStageItem("user" as "block", 1)).error).toBeTruthy();
    expect((await movePerformer(1, "left" as "up")).error).toBeTruthy();
    expect(manageRequest).not.toHaveBeenCalled();
  });
});
