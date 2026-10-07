"use client";

import { LocateFixed } from "lucide-react";
import { useMemo, useState } from "react";
import campusData from "@/data/campus.json";
import {
  buildingAt,
  type CampusData,
  loadCampus,
  type XY,
} from "@/lib/map/campus";
import { Map2D } from "./Map2D";

const POOR_ACCURACY_M = 30;
const fmt = (n: number) => n.toFixed(7);

/**
 * ブースの場所と階を地図で選ぶ。フォームには latitude・longitude・floor として入る。
 * 建物の中を押したらその棟の階から選び、外なら屋外(0)
 */
export function LocationPicker({
  latitude,
  longitude,
  floor,
}: {
  latitude?: number;
  longitude?: number;
  floor?: number;
}) {
  const campus = useMemo(
    () => loadCampus(campusData as unknown as CampusData),
    [],
  );
  const has =
    latitude !== undefined &&
    longitude !== undefined &&
    (latitude !== 0 || longitude !== 0);
  const [lat, setLat] = useState(has ? fmt(latitude) : "");
  const [lon, setLon] = useState(has ? fmt(longitude as number) : "");
  const [floorValue, setFloorValue] = useState(floor ?? 0);
  const [gps, setGps] = useState<
    "locating" | "denied" | { accuracy: number } | null
  >(null);

  const xy: XY | null =
    lat !== "" &&
    lon !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lon))
      ? campus.toXY(Number(lon), Number(lat))
      : null;
  const hit = xy ? buildingAt(campus, xy) : undefined;

  const place = (p: XY) => {
    const [lo, la] = campus.toLonLat(...p);
    setLat(fmt(la));
    setLon(fmt(lo));
    const b = buildingAt(campus, p)?.building;
    // 建物の中なら今の階(範囲外なら 1 階)、外なら屋外
    setFloorValue((f) => (b ? Math.min(Math.max(f, 1), b.floors) : 0));
  };

  const useHere = () => {
    setGps("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place(campus.toXY(p.coords.longitude, p.coords.latitude));
        setGps({ accuracy: p.coords.accuracy });
      },
      () => setGps("denied"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">場所（地図を押して置く）</span>
      <div className="h-64 overflow-hidden rounded-md border">
        <Map2D
          campus={campus}
          pins={
            xy
              ? [{ id: 0, xy, elevation: 0, floor: floorValue, kind: "class" }]
              : []
          }
          selectedPinId={0}
          focus={hit ? { buildingId: hit.building.id, floor: 0 } : null}
          location={null}
          onPickPin={() => {}}
          onPickBuilding={() => {}}
          onPickNothing={() => {}}
          onPickPoint={place}
        />
      </div>
      <p className="text-sm">
        {!xy
          ? "未設定"
          : hit
            ? `${hit.building.name ?? "建物"}（${hit.building.floors}階建て）`
            : "屋外"}
      </p>
      {hit ? (
        <label className="flex items-center gap-2 text-sm">
          階
          <select
            name="floor"
            value={floorValue}
            onChange={(e) => setFloorValue(Number(e.target.value))}
            className="h-9 rounded-md border px-2"
          >
            {Array.from({ length: hit.building.floors }, (_, i) => i + 1).map(
              (n) => (
                <option key={n} value={n}>
                  {n}階
                </option>
              ),
            )}
          </select>
        </label>
      ) : (
        <input type="hidden" name="floor" value={0} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={useHere}
          className="flex items-center gap-1 rounded-md border px-3 py-1 text-sm"
        >
          <LocateFixed size={16} />
          今いる場所を入れる
        </button>
        {gps === "locating" && (
          <span className="text-gray-500 text-xs">取得しています…</span>
        )}
        {gps === "denied" && (
          <span className="text-red-600 text-xs">位置情報が使えません</span>
        )}
        {gps && typeof gps === "object" && (
          <span
            className={
              gps.accuracy > POOR_ACCURACY_M
                ? "text-red-600 text-xs"
                : "text-gray-500 text-xs"
            }
          >
            精度 ±{Math.round(gps.accuracy)}m
            {gps.accuracy > POOR_ACCURACY_M &&
              "。誤差が大きいので地図で確かめてください"}
          </span>
        )}
      </div>
      <details>
        <summary className="cursor-pointer text-gray-500 text-xs">
          数字で入力
        </summary>
        <div className="flex gap-2 pt-2">
          <input
            name="latitude"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="緯度"
            inputMode="decimal"
            className="h-9 w-full rounded-md border px-2 text-sm"
          />
          <input
            name="longitude"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            placeholder="経度"
            inputMode="decimal"
            className="h-9 w-full rounded-md border px-2 text-sm"
          />
        </div>
      </details>
    </div>
  );
}
