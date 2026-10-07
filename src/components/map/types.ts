import type { Campus, XY } from "@/lib/map/campus";
import type { MapPin } from "@/lib/map/map-booths";

/** 色を付ける棟と階。floor 0 は棟全体(階を強調しない) */
export type MapFocus = { buildingId: string; floor: number } | null;

export type MapLocation = { xy: XY; accuracy: number; heading?: number } | null;

/** 3D と 2D が共通で受け取るもの */
export type MapProps = {
  campus: Campus;
  pins: MapPin[];
  selectedPinId: number | null;
  focus: MapFocus;
  location: MapLocation;
  onPickPin(id: number): void;
  onPickBuilding(id: string): void;
  onPickNothing(): void;
};

export const PIN_COLORS = { class: "#00B894", club: "#FDCB6E" } as const;
