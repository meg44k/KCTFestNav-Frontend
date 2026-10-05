import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import { parseBoothForm } from "./booth-form";

const fd = (v: Record<string, string>) => {
  const f = new FormData();
  for (const [k, x] of Object.entries(v)) f.set(k, x);
  return f;
};
const base = {
  name: " たこ焼き ",
  organizer: "1-1",
  detail: "説明",
  location: "中庭",
  imageUrl: "",
  latitude: "33.8168",
  longitude: "130.8718",
};

describe("parseBoothForm", () => {
  it("前後の空白を取り、緯度経度を数値にし、新規の x/y/z は 0", () => {
    expect(parseBoothForm(fd(base))).toEqual({
      ok: true,
      payload: {
        name: "たこ焼き",
        organizer: "1-1",
        detail: "説明",
        location: "中庭",
        image_url: "",
        latitude: 33.8168,
        longitude: 130.8718,
        x: 0,
        y: 0,
        z: 0,
      },
    });
  });

  it("名前が空なら保存しない", () => {
    expect(parseBoothForm(fd({ ...base, name: "  " }))).toEqual({
      ok: false,
      error: "ブース名を入力してください",
    });
  });

  it("緯度経度の空欄は 0（未設定）", () => {
    const res = parseBoothForm(fd({ ...base, latitude: "", longitude: "" }));
    expect(res.ok && [res.payload.latitude, res.payload.longitude]).toEqual([
      0, 0,
    ]);
  });

  it("数字でない緯度経度は保存しない", () => {
    expect(parseBoothForm(fd({ ...base, latitude: "北" }))).toEqual({
      ok: false,
      error: "緯度・経度は数字で入力してください",
    });
  });

  it("画像 URL は http(s) のみ", () => {
    expect(
      parseBoothForm(fd({ ...base, imageUrl: "javascript:alert(1)" })),
    ).toEqual({
      ok: false,
      error: "画像 URL は http:// か https:// で始めてください",
    });
  });

  it("編集では x/y/z を今の値のまま送る", () => {
    const current = { x: 1, y: 2, z: 3 } as BoothResponse;
    const res = parseBoothForm(fd(base), current);
    expect(res.ok && [res.payload.x, res.payload.y, res.payload.z]).toEqual([
      1, 2, 3,
    ]);
  });
});
