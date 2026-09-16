import { apiFetch } from "./client";

/** バックエンドが返す生のブース。docs/openapi.yaml の Booth に対応する */
export type BoothResponse = {
  id: number;
  name: string;
  organizer: string;
  detail: string;
  location: string;
  image_url: string;
  congestion_status: number;
  x: number;
  y: number;
  z: number;
  latitude: number;
  longitude: number;
};

export type CongestionStatus = "empty" | "clouded" | "veryClouded";

/** 画面側で扱うブース。BoothCard にそのまま渡せる形にしてある */
export type Booth = {
  id: number;
  name: string;
  description: string;
  organizer: string;
  location: string;
  /** 未設定のときは undefined (バックエンドは空文字を返す) */
  imageUrl?: string;
  congestionStatus: CongestionStatus;
  /** 未設定のときは undefined (バックエンドは 0 を返す) */
  latitude?: number;
  longitude?: number;
};

const CONGESTION_STATUS_MAP: Record<number, CongestionStatus> = {
  0: "empty",
  1: "clouded",
  2: "veryClouded",
};

export function toCongestionStatus(raw: number): CongestionStatus {
  // 想定外の値が来ても画面を壊さないよう、空き扱いにフォールバックする
  return CONGESTION_STATUS_MAP[raw] ?? "empty";
}

export function toBooth(res: BoothResponse): Booth {
  // バックエンドは未設定の座標を 0 として返すため、
  // 緯度経度がどちらも 0 のときは「座標なし」として扱う
  const hasLocation = res.latitude !== 0 || res.longitude !== 0;

  return {
    id: res.id,
    name: res.name,
    description: res.detail,
    organizer: res.organizer,
    location: res.location,
    imageUrl: res.image_url === "" ? undefined : res.image_url,
    congestionStatus: toCongestionStatus(res.congestion_status),
    latitude: hasLocation ? res.latitude : undefined,
    longitude: hasLocation ? res.longitude : undefined,
  };
}

export async function fetchBooths(init?: RequestInit): Promise<Booth[]> {
  const { booths } = await apiFetch<{ booths: BoothResponse[] }>(
    "/booths",
    init,
  );
  return booths.map(toBooth);
}

export async function fetchBooth(
  id: number,
  init?: RequestInit,
): Promise<Booth> {
  return toBooth(await apiFetch<BoothResponse>(`/booths/${id}`, init));
}
