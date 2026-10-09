import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { TILE_ENTRANCES, TILE_MAP } from "@/lib/navigation";
import { SectionLabel } from "./SectionLabel";

// 色はデザインの案から読み取った値
const YELLOW = "#FFB100";
const TILE = "#0A0700";
// マップの高さ(案は 127。上に置くと黄色が強すぎるので低くして試す)
const MAP_H = 100;

// 小さいタイルは幅が狭いので、長い名前は区切りのいい所で折り返す(案のとおり)
const TILE_LINES: Record<string, string[]> = {
  ステージイベント: ["ステージ", "イベント"],
};

/**
 * 各ページへの入口(デザインの案: 幅 264)。
 * マップは 264×127 の黄色、その下に 84×88 の小さいタイルを 6 の間をあけて 3 つ
 */
export function EntranceTiles() {
  const { href, label, icon: MapIcon } = TILE_MAP;
  return (
    <nav aria-labelledby="entrance-heading" className="flex w-full flex-col">
      <SectionLabel id="entrance-heading">さがす</SectionLabel>
      <div className="flex flex-col" style={{ gap: u(7) }}>
        <Link
          href={href}
          className="relative block w-full active:brightness-95"
          style={{
            aspectRatio: `264 / ${MAP_H}`,
            background: YELLOW,
            borderRadius: u(10),
          }}
        >
          <MapIcon
            aria-hidden
            strokeWidth={1.6}
            color="#1E1E1E"
            className="absolute"
            style={{ left: u(11), top: u(10), width: u(30), height: u(30) }}
          />
          <ArrowUpRight
            aria-hidden
            strokeWidth={2.2}
            color="#000"
            className="absolute"
            style={{ right: u(6), top: u(6), width: u(28), height: u(28) }}
          />
          <span
            className="absolute font-black text-black"
            style={{
              left: u(15),
              // 下から測って置く(高さを変えても文字の大きさと下の余白は変わらない)
              bottom: u(28),
              fontSize: u(30),
              lineHeight: 1,
              letterSpacing: "0.02em",
            }}
          >
            {label}
          </span>
          <span
            className="absolute font-bold"
            style={{
              left: u(15.5),
              bottom: u(12),
              fontSize: u(10.2),
              lineHeight: 1,
              color: "#000",
            }}
          >
            展示・ゴミ箱・バザーの場所
          </span>
        </Link>
        <div className="grid grid-cols-3" style={{ gap: u(6) }}>
          {TILE_ENTRANCES.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="relative block active:brightness-150"
              style={{
                aspectRatio: "84 / 88",
                background: TILE,
                border: `1px solid ${YELLOW}`,
                borderRadius: u(10),
              }}
            >
              <Icon
                aria-hidden
                strokeWidth={2}
                color={YELLOW}
                className="absolute"
                style={{
                  left: u(8.5),
                  top: u(8.5),
                  width: u(20),
                  height: u(20),
                }}
              />
              <span
                className="absolute font-bold"
                style={{
                  left: u(8.5),
                  bottom: u(8),
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
      </div>
    </nav>
  );
}
