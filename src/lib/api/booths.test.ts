import { describe, expect, it } from "vitest";
import { type BoothResponse, toBooth, toCongestionStatus } from "./booths";

const baseResponse: BoothResponse = {
  id: 1,
  name: "たこ焼き",
  organizer: "1-1",
  detail: "アツアツのたこ焼きです",
  location: "第一体育館",
  image_url: "https://example.com/takoyaki.jpg",
  congestion_status: 0,
  x: 0,
  y: 0,
  z: 0,
  latitude: 33.816853,
  longitude: 130.871808,
};

describe("toCongestionStatus", () => {
  it("0/1/2 を画面で使う文字列に変換する", () => {
    expect(toCongestionStatus(0)).toBe("empty");
    expect(toCongestionStatus(1)).toBe("clouded");
    expect(toCongestionStatus(2)).toBe("veryClouded");
  });

  it("想定外の値は空き扱いにフォールバックする", () => {
    expect(toCongestionStatus(99)).toBe("empty");
    expect(toCongestionStatus(-1)).toBe("empty");
  });
});

describe("toBooth", () => {
  it("バックエンドのフィールド名を画面側の名前に移し替える", () => {
    expect(toBooth(baseResponse)).toEqual({
      id: 1,
      name: "たこ焼き",
      description: "アツアツのたこ焼きです",
      organizer: "1-1",
      location: "第一体育館",
      imageUrl: "https://example.com/takoyaki.jpg",
      congestionStatus: "empty",
      latitude: 33.816853,
      longitude: 130.871808,
    });
  });

  it("画像が未設定(空文字)のときは undefined にする", () => {
    const booth = toBooth({ ...baseResponse, image_url: "" });
    expect(booth.imageUrl).toBeUndefined();
  });

  it("座標が未設定(0,0)のときは undefined にする", () => {
    const booth = toBooth({ ...baseResponse, latitude: 0, longitude: 0 });
    expect(booth.latitude).toBeUndefined();
    expect(booth.longitude).toBeUndefined();
  });

  it("片方だけ 0 の座標は未設定とみなさない", () => {
    const booth = toBooth({ ...baseResponse, latitude: 0 });
    expect(booth.latitude).toBe(0);
    expect(booth.longitude).toBe(130.871808);
  });
});
