import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
}));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`REDIRECT:${p}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import { uploadImage } from "./images";

const form = (
  target: string,
  file: Blob | null = new Blob(["x"], { type: "image/webp" }),
) => {
  const f = new FormData();
  f.set("target", target);
  if (file) f.set("file", file, "photo.webp");
  return f;
};

beforeEach(() => {
  manageRequest.mockReset();
});

describe("uploadImage", () => {
  it("multipart でそのまま送り、URL を返す", async () => {
    manageRequest.mockResolvedValue({
      ok: true,
      data: { url: "https://img/booths/3/a.webp" },
    });
    const body = form("booth:3");
    expect(await uploadImage(body)).toEqual({
      url: "https://img/booths/3/a.webp",
    });
    expect(manageRequest).toHaveBeenCalledWith("/manage/images", {
      method: "POST",
      body,
    });
  });

  it("写真か target が無い・形が違うときは送らない", async () => {
    for (const bad of [
      form("booth:3", null),
      form("user:1"),
      form("booth:x"),
      form(""),
    ]) {
      expect((await uploadImage(bad)).error).toBeTruthy();
    }
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("失敗は分かる文言にする", async () => {
    const cases: [string, string][] = [
      [
        "rejected",
        "この写真は使えません。JPEG・PNG・WebP の写真を選んでください",
      ],
      ["forbidden", "この写真を変える権限がありません"],
      ["unavailable", "アップロードできませんでした。もう一度お試しください"],
    ];
    for (const [reason, message] of cases) {
      manageRequest.mockResolvedValueOnce({ ok: false, reason });
      expect(await uploadImage(form("booth:3"))).toEqual({ error: message });
    }
  });

  it("ログインが切れていればログインし直し", async () => {
    manageRequest.mockResolvedValueOnce({ ok: false, reason: "unauthorized" });
    await expect(uploadImage(form("booth:3"))).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});
