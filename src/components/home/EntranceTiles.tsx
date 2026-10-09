import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { TILE_ENTRANCES, TILE_MAP } from "@/lib/navigation";

// 小さいタイルは幅が狭いので、長い名前は区切りのいい所で折り返す(デザインの案のとおり)
const TILE_LINES: Record<string, string[]> = {
  ステージイベント: ["ステージ", "イベント"],
};

/** 各ページへの入口。マップを黄色で大きく、その下に小さい 3 つ(デザインの案) */
export function EntranceTiles() {
  const { href, label, icon: MapIcon } = TILE_MAP;
  return (
    <nav className="flex w-full max-w-md flex-col gap-3">
      <Link
        href={href}
        className="relative flex min-h-44 flex-col justify-between rounded-xl bg-[#ffb100] p-4 text-black active:brightness-95"
      >
        <MapIcon size={32} strokeWidth={1.5} aria-hidden />
        <ArrowUpRight
          size={28}
          strokeWidth={2}
          aria-hidden
          className="absolute top-4 right-4"
        />
        <div>
          <span className="block font-black text-4xl tracking-wide">
            {label}
          </span>
          <span className="block pt-1 font-bold text-sm">
            展示・ゴミ箱・バザーの場所
          </span>
        </div>
      </Link>
      <div className="grid grid-cols-3 gap-2">
        {TILE_ENTRANCES.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex aspect-square flex-col justify-between rounded-xl border-2 border-[#ffb100] bg-[#0a0700] p-3 text-white active:bg-white/10"
          >
            <Icon
              size={28}
              strokeWidth={1.5}
              aria-hidden
              className="text-[#ffb100]"
            />
            <span className="font-bold text-sm leading-tight">
              {(TILE_LINES[label] ?? [label]).map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
