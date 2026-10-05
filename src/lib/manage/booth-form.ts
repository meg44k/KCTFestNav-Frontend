import type { BoothResponse } from "@/lib/api/booths";

/** POST/PUT /manage/booths に送る形。混雑度は別の API で変えるので含めない */
export type BoothPayload = Omit<
  BoothResponse,
  "id" | "congestion_status" | "congestion_updated_at"
>;

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

// 空欄は未設定(0)。数字でなければ null
function coordinate(value: string): number | null {
  if (value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseBoothForm(
  formData: FormData,
  current?: BoothResponse,
): { ok: true; payload: BoothPayload } | { ok: false; error: string } {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "ブース名を入力してください" };

  const imageUrl = text(formData, "imageUrl");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return {
      ok: false,
      error: "画像 URL は http:// か https:// で始めてください",
    };
  }

  const latitude = coordinate(text(formData, "latitude"));
  const longitude = coordinate(text(formData, "longitude"));
  if (latitude === null || longitude === null) {
    return { ok: false, error: "緯度・経度は数字で入力してください" };
  }

  return {
    ok: true,
    payload: {
      name,
      organizer: text(formData, "organizer"),
      detail: text(formData, "detail"),
      location: text(formData, "location"),
      image_url: imageUrl,
      latitude,
      longitude,
      // x/y/z は使っていないが DB では必須。編集では今の値を保つ
      x: current?.x ?? 0,
      y: current?.y ?? 0,
      z: current?.z ?? 0,
    },
  };
}

/** 企画担当が直せるのは説明と画像だけ。他の項目は今の値をそのまま送る */
export function parseDetailForm(
  formData: FormData,
  current: BoothResponse,
): { ok: true; payload: BoothPayload } | { ok: false; error: string } {
  const imageUrl = text(formData, "imageUrl");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return {
      ok: false,
      error: "画像 URL は http:// か https:// で始めてください",
    };
  }
  const {
    id: _id,
    congestion_status: _status,
    congestion_updated_at: _updatedAt,
    ...rest
  } = current;
  return {
    ok: true,
    payload: { ...rest, detail: text(formData, "detail"), image_url: imageUrl },
  };
}
