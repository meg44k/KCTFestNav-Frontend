"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BoothCard } from "@/components/ui/boothcard";
import campusData from "@/data/campus.json";
import { useCurrentLocation } from "@/hooks/useCurrentLocation";
import type { Booth } from "@/lib/api/booths";
import { type CampusData, loadCampus, nearCampus } from "@/lib/map/campus";
import {
  boothsByFloor,
  type MapState,
  type MapType,
  mapPins,
  mapQuery,
} from "@/lib/map/map-booths";
import { TILE_CREDIT, TILE_CREDIT_URL } from "@/lib/map/tiles";
import { cn } from "@/lib/utils";
import { BottomPanel } from "./BottomPanel";
import { BuildingSheet } from "./BuildingSheet";
import { LocationButton } from "./LocationButton";
import { Map2D } from "./Map2D";
import { type MapFocus, type MapLocation, PIN_COLORS } from "./types";

const Map3D = dynamic(() => import("./Map3D"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-center text-gray-400">地図を読み込んでいます…</p>
  ),
});

const CONGESTION_LEGEND = [
  { status: "empty", label: "空いています" },
  { status: "clouded", label: "少し混んでいます" },
  { status: "veryClouded", label: "混んでいます" },
] as const;

const TYPES: { value: MapType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "class", label: "クラス展示" },
  { value: "club", label: "クラブバザー" },
];

export function CampusMap({
  booths,
  initial,
  loadFailed,
}: {
  booths: Booth[];
  initial: MapState;
  loadFailed: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const campus = useMemo(
    () => loadCampus(campusData as unknown as CampusData),
    [],
  );
  const { location: current, start } = useCurrentLocation();
  // 位置の値が変わったときだけ作り直す(地図が毎回描き直さないように)
  const active = current.status === "active" ? current : null;
  const lat = active?.latitude;
  const lon = active?.longitude;
  const accuracy = active?.accuracy;
  const heading = active?.heading;
  const here = useMemo(
    () =>
      lat !== undefined && lon !== undefined ? campus.toXY(lon, lat) : null,
    [campus, lat, lon],
  );
  const outside = here !== null && !nearCampus(campus, here);
  const location: MapLocation = useMemo(
    () =>
      here && !outside && accuracy !== undefined
        ? { xy: here, accuracy, heading }
        : null,
    [here, outside, accuracy, heading],
  );
  const [state, setState] = useState(initial);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  const update = (patch: Partial<MapState>) => {
    const next = { ...state, ...patch };
    setState(next);
    router.replace(`${pathname}${mapQuery(next)}`, { scroll: false });
  };

  const pins = useMemo(
    () => mapPins(campus, booths, state.type),
    [campus, booths, state.type],
  );
  const selectedPin = pins.find((p) => p.id === state.boothId);
  const selectedBooth = booths.find((b) => b.id === state.boothId);
  const focusKey = selectedPin?.buildingId
    ? `${selectedPin.buildingId}:${selectedPin.floor}`
    : buildingId
      ? `${buildingId}:0`
      : "";
  // 同じ選択のままならカメラを動かさないよう、文字列が変わったときだけ作り直す
  const focus: MapFocus = useMemo(() => {
    if (!focusKey) return null;
    const [id, floor] = focusKey.split(":");
    return { buildingId: id, floor: Number(floor) };
  }, [focusKey]);

  const props = {
    campus,
    pins,
    selectedPinId: state.boothId,
    focus,
    location,
    onPickPin: (id: number) => {
      setBuildingId(null);
      update({ boothId: id });
    },
    onPickBuilding: (id: string) => {
      setBuildingId(id);
      update({ boothId: null });
    },
    onPickNothing: () => {
      setBuildingId(null);
      if (state.boothId !== null) update({ boothId: null });
    },
  };
  const building = buildingId
    ? campus.buildings.find((b) => b.id === buildingId)
    : undefined;

  return (
    <div className="fixed inset-0 bg-black">
      {state.view === "3d" ? (
        <Map3D {...props} />
      ) : (
        <Map2D {...props} controlsClassName="right-4 bottom-[140px]" />
      )}

      {/* 絞り込み(右上はメニューのボタンがあるので空ける) */}
      <div className="absolute top-3 left-3 right-16 z-40 flex gap-2 overflow-x-auto">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={state.type === t.value}
            onClick={() =>
              update({
                type: t.value,
                boothId: null,
                // バザーは屋外なので 2D が分かりやすい
                ...(t.value === "club" && { view: "2d" }),
              })
            }
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-sm font-bold",
              state.type === t.value
                ? "border-white bg-white text-black"
                : "border-white/30 bg-black/70 text-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {state.view === "3d" && (
        // 地理院タイルの利用規約による出典の表示(3D の地面の航空写真)
        <a
          href={TILE_CREDIT_URL}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-1 left-2 z-40 text-[10px] text-gray-300 underline"
        >
          {TILE_CREDIT}
        </a>
      )}

      {/* ピンの色の凡例。カードや棟の一覧と重ならないよう、出している間は隠す */}
      {!selectedBooth && !building && (
        <ul
          aria-label="ピンの色(混雑度)"
          className="absolute bottom-6 left-3 z-40 flex flex-col gap-1 rounded-lg bg-black/75 px-2.5 py-2 text-[11px] text-gray-200"
        >
          {CONGESTION_LEGEND.map(({ status, label }) => (
            <li key={status} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full border border-white"
                style={{ background: PIN_COLORS[status] }}
              />
              {label}
            </li>
          ))}
        </ul>
      )}

      {loadFailed && (
        <p className="absolute top-14 left-3 right-3 z-40 rounded-md bg-black/80 p-2 text-center text-gray-300 text-sm">
          ブースの情報を読み込めませんでした。地図だけ表示しています。
        </p>
      )}

      <div className="absolute right-4 bottom-6 z-40 flex flex-col items-end gap-3">
        <LocationButton
          status={current.status}
          outside={outside}
          onStart={start}
        />
        <button
          type="button"
          onClick={() => update({ view: state.view === "3d" ? "2d" : "3d" })}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/80 font-bold"
          aria-label={
            state.view === "3d" ? "2D に切り替える" : "3D に切り替える"
          }
        >
          {state.view === "3d" ? "2D" : "3D"}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-md pr-16 pl-3">
        <BottomPanel>
          {selectedBooth ? (
            // 右上の × がはみ出さないよう、上に少し余白をとる
            <div className="relative pt-4 pb-4">
              <button
                type="button"
                aria-label="選択を外す"
                onClick={() => update({ boothId: null })}
                className="absolute top-1 right-0 z-10 rounded-full bg-black/80 p-1 text-gray-300"
              >
                <X size={18} />
              </button>
              <BoothCard
                name={selectedBooth.name}
                description={selectedBooth.description}
                organizer={selectedBooth.organizer}
                location={selectedBooth.location}
                imageUrl={selectedBooth.imageUrl}
                imageAlt={selectedBooth.name}
                congestionStatus={selectedBooth.congestionStatus}
                latitude={selectedBooth.latitude}
                longitude={selectedBooth.longitude}
              />
            </div>
          ) : building ? (
            <BuildingSheet
              name={building.name ?? "建物"}
              groups={boothsByFloor(pins, booths, building.id)}
              onPick={(id) => props.onPickPin(id)}
              onClose={() => setBuildingId(null)}
            />
          ) : null}
        </BottomPanel>
      </div>
    </div>
  );
}
