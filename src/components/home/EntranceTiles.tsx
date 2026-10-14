import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { GRAY, ICON_LINE, ICON_STROKE, TILE, YELLOW } from "@/lib/home/palette";
import { TILE_ENTRANCES, TILE_MAP } from "@/lib/navigation";
import { SectionLabel } from "./SectionLabel";

// 小さいタイルは幅が狭いので、長い名前は区切りのいい所で折り返す(案のとおり)
const TILE_LINES: Record<string, string[]> = {
  ステージイベント: ["ステージ", "イベント"],
};

// 枠線は付けず、黒っぽい地だけで区切る(詰まって見えないように)
const tileStyle = { background: TILE, borderRadius: u(10) };

/**
 * 各ページへの入口(デザインの案: 幅 264)。
 * 小さいタイル 3 つを上に、その下に横長のマップ(アイコン・名前・矢印を 1 列に並べる)
 */
export function EntranceTiles() {
  const { href, label, icon: MapIcon } = TILE_MAP;
  return (
    <nav aria-labelledby="entrance-heading" className="flex w-full flex-col">
      <SectionLabel id="entrance-heading">さがす</SectionLabel>
      <div className="flex flex-col" style={{ gap: u(10) }}>
        <div className="grid grid-cols-3" style={{ gap: u(10) }}>
          {TILE_ENTRANCES.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              // 高さの低い画面では、ロゴに場所をゆずるため少し低くする
              className="relative block aspect-[80/76] active:brightness-150 [@media(max-height:720px)]:aspect-[80/70]"
              style={tileStyle}
            >
              <Icon
                aria-hidden
                strokeWidth={ICON_STROKE}
                color={YELLOW}
                className={`absolute ${ICON_LINE}`}
                style={{
                  left: u(10),
                  top: u(10),
                  width: u(20),
                  height: u(20),
                }}
              />
              <span
                className="absolute font-bold"
                style={{
                  left: u(10),
                  bottom: u(9),
                  fontSize: u(10),
                  lineHeight: 1.4,
                  color: YELLOW,
                }}
              >
                {(TILE_LINES[label] ?? [label]).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href={href}
          className="flex w-full items-center active:brightness-150"
          style={{ ...tileStyle, padding: `${u(16)} ${u(14)}`, gap: u(12) }}
        >
          <MapIcon
            aria-hidden
            strokeWidth={ICON_STROKE}
            color={YELLOW}
            className={`shrink-0 ${ICON_LINE}`}
            style={{ width: u(26), height: u(26) }}
          />
          <span className="flex min-w-0 flex-1 flex-col" style={{ gap: u(4) }}>
            <span
              className="font-bold"
              style={{
                fontSize: u(20),
                lineHeight: 1,
                letterSpacing: "0.04em",
                color: YELLOW,
              }}
            >
              {label}
            </span>
            <span style={{ fontSize: u(10), lineHeight: 1.2, color: GRAY }}>
              展示・ゴミ箱・バザーの場所
            </span>
          </span>
          <ArrowUpRight
            aria-hidden
            strokeWidth={ICON_STROKE}
            color={YELLOW}
            className={`shrink-0 ${ICON_LINE}`}
            style={{ width: u(20), height: u(20) }}
          />
        </Link>
      </div>
    </nav>
  );
}
