import { describe, expect, it } from "vitest";
import {
  type BoothResponse,
  CONGESTION_LABELS,
  congestionLabel,
  toBooth,
  toCongestionStatus,
} from "./booths";

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
    expect(toCongestionStatus(3)).toBe("preparing");
  });

  it("想定外の値は準備中扱いにする(分からないときに「空いています」と言わない)", () => {
    expect(toCongestionStatus(99)).toBe("preparing");
    expect(toCongestionStatus(-1)).toBe("preparing");
  });
});

describe("CONGESTION_LABELS", () => {
  it("来場者にも運営にも同じことばで出す", () => {
    expect(CONGESTION_LABELS).toEqual({
      preparing: "準備中",
      empty: "すぐ入れる",
      clouded: "少し待つ",
      veryClouded: "かなり待つ",
    });
  });
});

describe("congestionLabel", () => {
  it("クラブバザーは「すぐ買える」、クラス展示は「すぐ入れる」。ほかは同じ", () => {
    expect(congestionLabel("empty", "1-1")).toBe("すぐ入れる");
    expect(congestionLabel("empty", "天文部")).toBe("すぐ買える");
    expect(congestionLabel("clouded", "天文部")).toBe("少し待つ");
    expect(congestionLabel("preparing", "1-1")).toBe("準備中");
  });
});

describe("toBooth", () => {
  it("階を受け取る。古いバックエンド(floor なし)は 0", () => {
    expect(toBooth({ ...baseResponse, floor: 2 }).floor).toBe(2);
    const { floor: _floor, ...old } = { ...baseResponse, floor: 1 };
    expect(toBooth(old).floor).toBe(0);
  });

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
      floor: 0,
    });
  });

  it("混雑度の更新時刻を移し替える(未更新や古いバックエンドでは undefined)", () => {
    expect(
      toBooth({
        ...baseResponse,
        congestion_updated_at: "2026-10-31T03:00:00Z",
      }).congestionUpdatedAt,
    ).toBe("2026-10-31T03:00:00Z");
    expect(
      toBooth({ ...baseResponse, congestion_updated_at: null })
        .congestionUpdatedAt,
    ).toBeUndefined();
    expect(toBooth(baseResponse).congestionUpdatedAt).toBeUndefined();
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
