"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BoothCard } from "@/components/ui/boothcard";
import campusData from "@/data/campus.json";
import type { Booth } from "@/lib/api/booths";
import { type CampusData, loadCampus } from "@/lib/map/campus";
import {
  boothsByFloor,
  type MapState,
  type MapType,
  mapPins,
  mapQuery,
} from "@/lib/map/map-booths";
import { cn } from "@/lib/utils";
import { BuildingSheet } from "./BuildingSheet";
import { Map2D } from "./Map2D";
import type { MapFocus, MapLocation } from "./types";

const Map3D = dynamic(() => import("./Map3D"), {
  ssr: false,
  loading: () => (
    <p className="p-6 text-center text-gray-400">地図を読み込んでいます…</p>
  ),
});

const TYPES: { value: MapType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "class", label: "クラス展示" },
  { value: "club", label: "クラブバザー" },
];

export function CampusMap({
  booths,
  initial,
  loadFailed,
  location = null,
  locationControl,
}: {
  booths: Booth[];
  initial: MapState;
  loadFailed: boolean;
  /** 現在地(Task 8 で渡す) */
  location?: MapLocation;
  locationControl?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const campus = useMemo(
    () => loadCampus(campusData as unknown as CampusData),
    [],
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
      {state.view === "3d" ? <Map3D {...props} /> : <Map2D {...props} />}

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

      {loadFailed && (
        <p className="absolute top-14 left-3 right-3 z-40 rounded-md bg-black/80 p-2 text-center text-gray-300 text-sm">
          ブースの情報を読み込めませんでした。地図だけ表示しています。
        </p>
      )}

      <div className="absolute right-4 bottom-6 z-40 flex flex-col items-end gap-3">
        {locationControl}
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
        {selectedBooth && (
          <div className="relative pb-4">
            <button
              type="button"
              aria-label="選択を外す"
              onClick={() => update({ boothId: null })}
              className="absolute -top-3 right-0 z-10 rounded-full bg-black/80 p-1 text-gray-300"
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
        )}
        {!selectedBooth && building && (
          <BuildingSheet
            name={building.name ?? "建物"}
            groups={boothsByFloor(pins, booths, building.id)}
            onPick={(id) => props.onPickPin(id)}
            onClose={() => setBuildingId(null)}
          />
        )}
      </div>
    </div>
  );
}
