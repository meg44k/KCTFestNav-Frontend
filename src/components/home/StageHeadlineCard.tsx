import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { BG, GRAY, LIVE_RED, OFF_WHITE } from "@/lib/home/palette";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";
import { FitText } from "./FitText";

const place = (location: string) => (location ? `（${location}）` : "");

/**
 * 入口ページの「いまのステージ」。2 行だけのシンプルな形。
 * 1 行目: 赤の「● LIVE」(点がゆっくり光る)とバンド名、2 行目: 会場と次のバンド(小さく灰色)。
 * 全体を押すとステージイベントへ(右上のメニューボタンと重なるので矢印は付けない)。出すものが無ければ何も出さない
 */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  const live = playing[0];
  return (
    // 文字の後ろに背景の星が見えないよう、背景の色を敷く(まわりにも少しはみ出させる)
    <section
      aria-label="いまのステージ"
      style={{ background: BG, boxShadow: `0 0 0 ${u(6)} ${BG}` }}
    >
      <Link
        href="/stage-event"
        className="flex items-center active:opacity-70"
        // 右上のメニューボタンと重ならないよう、右をあける
        style={{ paddingRight: u(40) }}
      >
        <span className="flex min-w-0 flex-1 flex-col" style={{ gap: u(3) }}>
          {live ? (
            <>
              <span className="flex min-w-0 items-center" style={{ gap: u(8) }}>
                <span
                  className="flex shrink-0 items-center font-bold"
                  style={{
                    gap: u(4),
                    color: LIVE_RED,
                    fontSize: u(10),
                    letterSpacing: "0.08em",
                  }}
                >
                  <span
                    aria-hidden
                    className="relative inline-flex"
                    // フォントの文字の箱は上に余白があり、そのままだと点が「LIVE」より上に見える。
                    // 大文字のまん中に来るよう少し下げる
                    style={{
                      width: u(6),
                      height: u(6),
                      transform: `translateY(${u(1)})`,
                    }}
                  >
                    <span
                      className="absolute inset-0 rounded-full opacity-70 motion-safe:animate-ping"
                      style={{ background: LIVE_RED }}
                    />
                    <span
                      className="relative rounded-full"
                      style={{
                        width: u(6),
                        height: u(6),
                        background: LIVE_RED,
                      }}
                    />
                  </span>
                  LIVE
                </span>
                {/* 長い名前は「…」で切らずに、入るまで小さくする */}
                <FitText
                  className="min-w-0 flex-1 font-bold"
                  fontSize={u(15)}
                  style={{ lineHeight: 1.2, color: OFF_WHITE }}
                >
                  {live.current.name}
                </FitText>
              </span>
              <FitText
                fontSize={u(10)}
                style={{ lineHeight: 1.3, color: GRAY }}
              >
                {[
                  live.section.location || live.section.name,
                  live.next
                    ? `次: ${live.next.name}`
                    : "このブロックの最後です",
                ].join(" ・ ")}
              </FitText>
            </>
          ) : (
            <span
              className="flex flex-col"
              style={{ fontSize: u(11), lineHeight: 1.5, color: OFF_WHITE }}
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
      </Link>
    </section>
  );
}
