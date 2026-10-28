import { buildingAt, type Campus, shortName } from "./campus";

/**
 * コンパスに出す場所(ex. 6号館 2階)。ピンの位置と階から棟を引く(場所の説明の文字は
 * ピンを動かしても変わらないため)。屋外や名前の無い棟では場所の説明(fallback)を出す
 */
export function placeLabel(
  campus: Campus,
  booth: { latitude: number; longitude: number; floor: number },
  fallback?: string,
): string | undefined {
  const hit =
    booth.floor > 0
      ? buildingAt(campus, campus.toXY(booth.longitude, booth.latitude))
      : undefined;
  const name = hit?.building.name;
  if (!name) return fallback || undefined;
  return `${shortName(name.normalize("NFKC"))} ${booth.floor}階`;
}
