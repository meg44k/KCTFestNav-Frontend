import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";
import { FitText } from "./FitText";
import { SectionLabel } from "./SectionLabel";

// 入口ページの黄色と灰色(タイル・マップと同じ)
const YELLOW = "#FFB100";
const GRAY = "#9E9E9E";

const place = (location: string) => (location ? `（${location}）` : "");

/**
 * 入口ページの「いまのステージ」。枠で囲まず、星空の上に左の黄色の線 1 本でまとめる。
 * 演奏中は黄色の「● LIVE」(点がゆっくり光る)と会場、大きくバンド名、灰色で次。
 * 全体を押すとステージイベントへ。出すものが無ければ何も出さない
 */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  const live = playing[0];
  return (
    <section>
      <SectionLabel>いまのステージ</SectionLabel>
      <Link
        href="/stage-event"
        className="flex items-center active:opacity-70"
        style={{
          borderLeft: `${u(2)} solid ${YELLOW}`,
          paddingLeft: u(12),
          paddingBlock: u(4),
          gap: u(8),
        }}
      >
        <span className="flex min-w-0 flex-1 flex-col" style={{ gap: u(4) }}>
          {live ? (
            <>
              <span
                className="flex items-center"
                style={{ gap: u(6), fontSize: u(10), lineHeight: 1.2 }}
              >
                <span
                  className="flex items-center font-bold"
                  style={{ gap: u(4), color: YELLOW, letterSpacing: "0.08em" }}
                >
                  <span
                    aria-hidden
                    className="relative inline-flex"
                    style={{ width: u(6), height: u(6) }}
                  >
                    <span
                      className="absolute inset-0 rounded-full opacity-70 motion-safe:animate-ping"
                      style={{ background: YELLOW }}
                    />
                    <span
                      className="relative rounded-full"
                      style={{ width: u(6), height: u(6), background: YELLOW }}
                    />
                  </span>
                  LIVE
                </span>
                <span className="truncate" style={{ color: GRAY }}>
                  {live.section.location || live.section.name}
                </span>
              </span>
              {/* 長い名前は「…」で切らずに、入るまで小さくする */}
              <FitText
                className="font-semibold text-white"
                fontSize={u(28)}
                style={{ lineHeight: 1.15 }}
              >
                {live.current.name}
              </FitText>
              <FitText
                fontSize={u(13)}
                style={{ lineHeight: 1.25, color: GRAY }}
              >
                {live.next ? `次: ${live.next.name}` : "このブロックの最後です"}
              </FitText>
            </>
          ) : (
            <span
              className="flex flex-col text-white"
              style={{ fontSize: u(11), lineHeight: 1.5, gap: u(2) }}
            >
              {starting.map(({ section, block }) => (
                <span key={block.id}>
                  まもなく始まります: <b>{section.name}</b>
                  {place(section.location)}
                </span>
              ))}
              {next && (
                <span>
                  次は{" "}
                  <b>
                    {blockTimeRange(next.block).split("〜")[0]}〜{" "}
                    {next.section.name}
                  </b>
                  {place(next.section.location)}
                </span>
              )}
            </span>
          )}
        </span>
        <ChevronRight
          aria-hidden
          strokeWidth={2}
          color={YELLOW}
          style={{ width: u(18), height: u(18), flexShrink: 0 }}
        />
      </Link>
    </section>
  );
}
