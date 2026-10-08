import {
  House,
  type LucideIcon,
  Map as MapIcon,
  MicVocal,
  Store,
  Utensils,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/** 入口ページのタイルとメニューに並べる行き先(同じ順で出す) */
export const NAV_ENTRANCES: NavItem[] = [
  { label: "マップ", href: "/map", icon: MapIcon },
  { label: "クラス展示", href: "/class-booth", icon: Store },
  { label: "クラブバザー", href: "/bazaar", icon: Utensils },
  { label: "ステージイベント", href: "/stage-event", icon: MicVocal },
];

/** トップの 2×2 のタイルの並び。クラブバザーを左上にする(本人の希望)。メニューは NAV_ENTRANCES の順 */
const byHref = (href: string) =>
  NAV_ENTRANCES.find((n) => n.href === href) as NavItem;
export const TILE_ENTRANCES: NavItem[] = [
  byHref("/bazaar"),
  byHref("/class-booth"),
  byHref("/map"),
  byHref("/stage-event"),
];

export const NAV_HOME: NavItem = {
  label: "トップ",
  href: "/main",
  icon: House,
};
