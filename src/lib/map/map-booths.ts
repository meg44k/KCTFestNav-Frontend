import type { Booth, CongestionStatus } from "@/lib/api/booths";
import { parseGrade } from "@/lib/booth-grade";
import { type Campus, placeOnFloor, type XY } from "./campus";

export type MapType = "all" | "class" | "club";
export type MapView = "3d" | "2d";
export type MapQuery = { type: MapType; view?: MapView; boothId?: number };
export type MapState = { type: MapType; view: MapView; boothId: number | null };
export type MapPin = {
  id: number;
  /** 拡大したときにピンの横に出す名前 */
  name: string;
  xy: XY;
  elevation: number;
  floor: number;
  kind: "class" | "club";
  /** ピンの色に使う */
  congestion: CongestionStatus;
  buildingId?: string;
};

const TYPES: MapType[] = ["all", "class", "club"];
const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

export function parseMapQuery(
  p: Record<string, string | string[] | undefined>,
): MapQuery {
  const type = TYPES.find((t) => t === one(p.type)) ?? "all";
  const view =
    one(p.view) === "2d" || one(p.view) === "3d"
      ? (one(p.view) as MapView)
      : undefined;
  const id = Number(one(p.booth));
  return {
    type,
    ...(view && { view }),
    ...(Number.isInteger(id) && id > 0 && { boothId: id }),
  };
}

const hasLocation = (b: Booth) =>
  b.latitude !== undefined && b.longitude !== undefined;

/**
 * 開いたときの状態。指定されたブースが選べなければ選ばずに全体を出す。
 * 既定は 2D(本人の希望)。建物の中のブースを指定されたときだけ、階が分かる 3D で開く
 */
export function resolveInitial(q: MapQuery, booths: Booth[]): MapState {
  const booth = booths.find((b) => b.id === q.boothId && hasLocation(b));
  const view = q.view ?? (booth && booth.floor > 0 ? "3d" : "2d");
  return { type: q.type, view, boothId: booth?.id ?? null };
}

/**
 * URL の ?以降。既定値(全部・2D・選択なし)は書かない。
 * ブースを選んでいるときは 2D でも書く(書かないと、開き直したとき建物の中のブースは 3D になる)
 */
export function mapQuery(s: MapState): string {
  const p = new URLSearchParams();
  if (s.type !== "all") p.set("type", s.type);
  if (s.view !== "2d" || s.boothId !== null) p.set("view", s.view);
  if (s.boothId !== null) p.set("booth", String(s.boothId));
  const q = p.toString();
  return q ? `?${q}` : "";
}

/** クラス展示は主催者が「学年-組」 */
export const boothKind = (b: Booth): "class" | "club" =>
  parseGrade(b.organizer) !== null ? "class" : "club";

export function mapPins(
  campus: Campus,
  booths: Booth[],
  type: MapType,
): MapPin[] {
  return booths
    .filter((b) => hasLocation(b) && (type === "all" || boothKind(b) === type))
    .map((b) => {
      const xy = campus.toXY(b.longitude as number, b.latitude as number);
      const place = placeOnFloor(campus, xy, b.floor);
      return {
        id: b.id,
        name: b.name,
        xy,
        elevation: place.elevation,
        floor: place.floor,
        kind: boothKind(b),
        congestion: b.congestionStatus,
        buildingId: place.building?.id,
      };
    });
}

/** 棟の中のブースを階の低い順に */
export function boothsByFloor(
  pins: MapPin[],
  booths: Booth[],
  buildingId: string,
): { floor: number; booths: Booth[] }[] {
  const groups = new Map<number, Booth[]>();
  for (const pin of pins) {
    if (pin.buildingId !== buildingId) continue;
    const booth = booths.find((b) => b.id === pin.id);
    if (booth) groups.set(pin.floor, [...(groups.get(pin.floor) ?? []), booth]);
  }
  return [...groups]
    .sort(([a], [b]) => a - b)
    .map(([floor, list]) => ({ floor, booths: list }));
}
