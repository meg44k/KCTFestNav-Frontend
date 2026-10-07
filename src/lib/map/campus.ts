/**
 * キャンパスの建物データ(campus-3d/viewer.html で書き出した GeoJSON)と、地図の計算。
 * 座標は「原点(建物全体の範囲の中心)からのメートル」。x は東、y は北
 */

export type LonLat = [number, number];
export type XY = [number, number];

type RingLL = number[][];
type Geometry =
  | { type: "Polygon"; coordinates: RingLL[] }
  | { type: "MultiPolygon"; coordinates: RingLL[][] };

export type CampusData = {
  features: {
    geometry: Geometry;
    properties: {
      buildingId: string;
      buildingName: string | null;
      /** PLATEAU の実測(m)。地面からの高さ */
      height: number | null;
      /** viewer で使った高さ(m) */
      heightUsed: number;
      storeys: number | null;
      storeysManual: number | null;
      baseFloor: number | null;
      baseHeight: number;
    };
  }[];
};

/** 建物の 1 部分。polygons は [外周, ...穴] の配列 */
export type Part = {
  polygons: XY[][][];
  /** 下端の高さ(m)。渡り廊下など浮いた部分は 0 より大きい */
  bottom: number;
  height: number;
  storeys: number;
  /** この部分の一番下の階 */
  baseFloor: number;
};

export type Building = {
  id: string;
  name?: string;
  parts: Part[];
  /** 棟の階数(部分のうち最も上の階) */
  floors: number;
  /** ラベルを置く位置(一番大きい部分の外周の頂点の平均) */
  center: XY;
  /** 一番高い所(m) */
  top: number;
};

export type Campus = {
  buildings: Building[];
  toXY(lon: number, lat: number): XY;
  toLonLat(x: number, y: number): LonLat;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

const polygonsOf = (g: Geometry): RingLL[][] =>
  g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];

function area(ring: XY[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

export function loadCampus(data: CampusData): Campus {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  for (const f of data.features) {
    for (const [outer] of polygonsOf(f.geometry)) {
      for (const [lon, lat] of outer) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
    }
  }
  const lat0 = (minLat + maxLat) / 2;
  const lon0 = (minLon + maxLon) / 2;
  // viewer.html と同じ平面近似(キャンパス程度の範囲なら十分)
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  const toXY = (lon: number, lat: number): XY => [
    (lon - lon0) * kx,
    (lat - lat0) * ky,
  ];
  const toLonLat = (x: number, y: number): LonLat => [
    lon0 + x / kx,
    lat0 + y / ky,
  ];

  const byId = new Map<string, { name?: string; parts: Part[] }>();
  for (const f of data.features) {
    const p = f.properties;
    const floating = p.baseHeight > 0;
    // 浮いた部分の実測は地面からの値なので使わない。実測の無い部分は viewer の高さ
    const height =
      !floating && p.height != null && p.height > 0 ? p.height : p.heightUsed;
    const part: Part = {
      polygons: polygonsOf(f.geometry).map((poly) =>
        poly.map((ring) => ring.map(([lon, lat]) => toXY(lon, lat))),
      ),
      bottom: p.baseHeight,
      height,
      storeys: Math.max(1, p.storeysManual ?? p.storeys ?? 1),
      baseFloor: p.baseFloor ?? 1,
    };
    const entry = byId.get(p.buildingId) ?? {
      name: p.buildingName ?? undefined,
      parts: [],
    };
    entry.parts.push(part);
    byId.set(p.buildingId, entry);
  }

  const buildings: Building[] = [...byId].map(([id, { name, parts }]) => {
    const main = parts.reduce((a, b) =>
      area(a.polygons[0][0]) >= area(b.polygons[0][0]) ? a : b,
    );
    const outer = main.polygons[0][0].slice(0, -1);
    return {
      id,
      name,
      parts,
      floors: Math.max(...parts.map((p) => p.baseFloor + p.storeys - 1)),
      center: [
        outer.reduce((s, [x]) => s + x, 0) / outer.length,
        outer.reduce((s, [, y]) => s + y, 0) / outer.length,
      ],
      top: Math.max(...parts.map((p) => p.bottom + p.height)),
    };
  });

  const [x0, y0] = toXY(minLon, minLat);
  const [x1, y1] = toXY(maxLon, maxLat);
  return {
    buildings,
    toXY,
    toLonLat,
    bounds: { minX: x0, maxX: x1, minY: y0, maxY: y1 },
  };
}

function inRing([x, y]: XY, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 点がこの部分の中か(穴の中は外) */
export const inPart = (xy: XY, part: Part) =>
  part.polygons.some(
    ([outer, ...holes]) =>
      inRing(xy, outer) && !holes.some((h) => inRing(xy, h)),
  );

/** 点を含む棟と、その点を含む部分(下の部分から順) */
export function buildingAt(
  campus: Campus,
  xy: XY,
): { building: Building; parts: Part[] } | undefined {
  for (const building of campus.buildings) {
    const parts = building.parts
      .filter((p) => inPart(xy, p))
      .sort((a, b) => a.baseFloor - b.baseFloor);
    if (parts.length > 0) return { building, parts };
  }
  return undefined;
}

/** その部分のその階の床と天井の高さ。その部分に無い階は undefined */
export function floorBand(
  part: Part,
  floor: number,
): { bottom: number; top: number } | undefined {
  if (floor < part.baseFloor || floor > part.baseFloor + part.storeys - 1)
    return undefined;
  const h = part.height / part.storeys;
  const bottom = part.bottom + (floor - part.baseFloor) * h;
  return { bottom, top: bottom + h };
}

/**
 * ブースを置く高さ。建物の中ならその階の床、外(または階 0)なら地面。
 * その点の部分にその階が無いとき(統合した棟の低い部分など)は、その点の部分の最上階の床
 */
export function placeOnFloor(
  campus: Campus,
  xy: XY,
  floor: number,
): { elevation: number; building?: Building; floor: number } {
  const hit = floor > 0 ? buildingAt(campus, xy) : undefined;
  if (!hit) return { elevation: 0, building: undefined, floor: 0 };
  for (const part of hit.parts) {
    const band = floorBand(part, floor);
    if (band) return { elevation: band.bottom, building: hit.building, floor };
  }
  const top = hit.parts[hit.parts.length - 1];
  const band = floorBand(top, top.baseFloor + top.storeys - 1);
  return { elevation: band?.bottom ?? 0, building: hit.building, floor };
}

/** 建物全体の範囲 + margin の内側か */
export function nearCampus(campus: Campus, [x, y]: XY, marginM = 100): boolean {
  const { minX, maxX, minY, maxY } = campus.bounds;
  return (
    x >= minX - marginM &&
    x <= maxX + marginM &&
    y >= minY - marginM &&
    y <= maxY + marginM
  );
}

export const floorLabel = (floor: number) => (floor > 0 ? `${floor}F` : "屋外");
