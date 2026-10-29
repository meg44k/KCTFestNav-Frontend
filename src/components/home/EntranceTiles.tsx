import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { ICON_LINE, ICON_STROKE, TILE, YELLOW } from "@/lib/home/palette";
import { TILE_ENTRANCES, TILE_MAP } from "@/lib/navigation";
import { SectionLabel } from "./SectionLabel";

// 小さいタイルは幅が狭いので、長い名前は区切りのいい所で折り返す(案のとおり)
const TILE_LINES: Record<string, string[]> = {
  ステージイベント: ["ステージ", "イベント"],
};

/**
 * 各ページへの入口(デザインの案: 幅 264)。
 * 小さいタイル 3 つ(6 の間をあける)を上に、その下に黄色のマップ(本人の希望で入れ替えて試す)
 */
export function EntranceTiles() {
  const { href, label, icon: MapIcon } = TILE_MAP;
  return (
    <nav aria-labelledby="entrance-heading" className="flex w-full flex-col">
      <SectionLabel id="entrance-heading">さがす</SectionLabel>
      <div className="flex flex-col" style={{ gap: u(7) }}>
        <div className="grid grid-cols-3" style={{ gap: u(6) }}>
          {TILE_ENTRANCES.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              // 先回りの読み込みはしない。このサイトのページは開くたびに中身を作るので骨組みしか先に取れず、
              // 入口を開くたびに 4 ページ分の問い合わせが Vercel の回数の上限(CDN Requests・関数)を使うだけになる
              prefetch={false}
              // 高さの低い画面では、ロゴに場所をゆずるため少し低くする
              className="relative block aspect-[84/84] active:brightness-150 [@media(max-height:720px)]:aspect-[84/68]"
              style={{
                background: TILE,
                borderRadius: u(10),
              }}
            >
              <Icon
                aria-hidden
                strokeWidth={ICON_STROKE}
                color={YELLOW}
                className={`absolute ${ICON_LINE}`}
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
        <Link
          href={href}
          prefetch={false}
          // 上の 3 つと同じ見た目(黒地・黄色のアイコンと文字)。大きさはそのまま
          className="relative block aspect-[264/88] w-full active:brightness-150"
          style={{
            background: TILE,
            borderRadius: u(10),
          }}
        >
          <MapIcon
            aria-hidden
            strokeWidth={ICON_STROKE}
            color={YELLOW}
            className={`absolute ${ICON_LINE}`}
            style={{ left: u(11), top: u(10), width: u(30), height: u(30) }}
          />
          <ArrowUpRight
            aria-hidden
            strokeWidth={ICON_STROKE}
            color={YELLOW}
            className={`absolute ${ICON_LINE}`}
            style={{ right: u(6), top: u(6), width: u(28), height: u(28) }}
          />
          {/*
            下から測って置く(高さを変えても文字の大きさと下の余白は変わらない)。
            マップが低いので、説明は名前の下ではなく右に、文字の下の線をそろえて並べる
          */}
          <span
            className="absolute flex items-baseline font-bold"
            style={{ left: u(15), bottom: u(12), gap: u(10), color: YELLOW }}
          >
            <span
              style={{
                fontSize: u(30),
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </span>
            {/* 名前より目立たないよう、細い文字にする */}
            <span
              className="font-normal"
              style={{ fontSize: u(10.2), lineHeight: 1 }}
            >
              展示・バザーの場所
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
