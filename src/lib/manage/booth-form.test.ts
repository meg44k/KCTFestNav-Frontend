import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import { parseBoothForm, parseDetailForm } from "./booth-form";

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
  it("階を読む。空は 0、負や小数は断る", () => {
    const form = (floor: string) => {
      const f = new FormData();
      f.set("name", "3-1 展示");
      f.set("floor", floor);
      return f;
    };
    expect(parseBoothForm(form("2"))).toMatchObject({
      ok: true,
      payload: { floor: 2 },
    });
    expect(parseBoothForm(form(""))).toMatchObject({
      ok: true,
      payload: { floor: 0 },
    });
    expect(parseBoothForm(form("-1"))).toEqual({
      ok: false,
      error: "階は 0 以上の整数で入力してください",
    });
    expect(parseBoothForm(form("1.5"))).toEqual({
      ok: false,
      error: "階は 0 以上の整数で入力してください",
    });
  });

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
        floor: 0,
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

describe("parseDetailForm", () => {
  const current = {
    id: 3,
    name: "たこ焼き",
    organizer: "1-1",
    detail: "古い説明",
    location: "中庭",
    image_url: "",
    congestion_status: 1,
    congestion_updated_at: "2026-10-31T03:00:00Z",
    x: 1,
    y: 2,
    z: 3,
    latitude: 33.8,
    longitude: 130.8,
  } as BoothResponse;

  it("説明と画像だけを変え、他は今の値のまま", () => {
    const res = parseDetailForm(
      fd({ detail: " 新しい説明 ", imageUrl: "https://example.com/a.jpg" }),
      current,
    );
    expect(res).toEqual({
      ok: true,
      payload: {
        name: "たこ焼き",
        organizer: "1-1",
        detail: "新しい説明",
        location: "中庭",
        image_url: "https://example.com/a.jpg",
        latitude: 33.8,
        longitude: 130.8,
        x: 1,
        y: 2,
        z: 3,
      },
    });
  });

  it("画像 URL は http(s) のみ", () => {
    expect(
      parseDetailForm(fd({ detail: "", imageUrl: "ftp://x" }), current),
    ).toEqual({
      ok: false,
      error: "展示物画像は http:// か https:// で始まる URL を入力してください",
    });
  });
});
