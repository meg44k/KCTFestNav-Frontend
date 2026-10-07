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

export const NAV_HOME: NavItem = {
  label: "トップ",
  href: "/main",
  icon: House,
};
