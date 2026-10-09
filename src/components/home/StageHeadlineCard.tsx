import Link from "next/link";
import { u } from "@/lib/home/design-unit";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";

// 色はデザインの案から読み取った値
const YELLOW = "#FFB100";
const STAR = "#FFC107";
const CARD = "#1C1C1C";
const GRAY = "#9E9E9E";

const place = (location: string) => (location ? `（${location}）` : "");

/** 4 つの角の星(案の座標) */
function Star({ x, y, r }: { x: number; y: number; r: number }) {
  const k = r * 0.25;
  return (
    <path
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`}
    />
  );
}

/** チケットの飾り(流れ星・切り取り線・「>」)。案と同じ 264×112 の座標で描く */
function TicketDecoration({ live }: { live: boolean }) {
  return (
    <svg
      viewBox="0 0 264 112"
      aria-hidden="true"
      // 枠線を含めた大きさに合わせる(座標を案とそろえる)
      className="pointer-events-none absolute"
      style={{
        inset: -1,
        width: "calc(100% + 2px)",
        height: "calc(100% + 2px)",
      }}
    >
      {live && (
        <g stroke={STAR} fill={STAR} strokeWidth="0.7">
          <line x1="155" y1="39" x2="190" y2="0" />
          <line x1="190" y1="19" x2="206" y2="0" />
          <g stroke="none">
            <Star x={155} y={39} r={6} />
            <Star x={190} y={19} r={4} />
          </g>
        </g>
      )}
      <line
        x1="211"
        y1="0"
        x2="211"
        y2="112"
        stroke="#5D5D5D"
        strokeWidth="0.8"
        strokeDasharray="2.5 2"
      />
      <polyline
        points="243.5,49 250,55.5 243.5,62"
        fill="none"
        stroke="#E3E3E3"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * 入口ページのステージのチケット(デザインの案: 264×112)。全体を押すとステージイベントへ。
 * 演奏中は左に黄色の「LIVE!」の帯と流れ星。出すものが無ければ何も出さない
 */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  const live = playing[0];
  return (
    <Link
      href="/stage-event"
      className="relative block w-full overflow-hidden active:brightness-125"
      style={{
        aspectRatio: "264 / 112",
        background: CARD,
        border: "1px solid #595959",
        borderRadius: u(10),
        marginBottom: u(22),
      }}
    >
      {live && (
        <span
          // 枠線の上にかぶせる(案では帯の左には線が無い)
          className="absolute flex items-center justify-center"
          style={{
            top: -1,
            bottom: -1,
            left: -1,
            width: u(17),
            background: YELLOW,
          }}
        >
          <span
            className="-rotate-90 whitespace-nowrap font-bold"
            style={{ fontSize: u(8.5), lineHeight: 1, color: "#201700" }}
          >
            LIVE!
          </span>
        </span>
      )}
      <span
        className="absolute flex flex-col"
        style={{ left: u(27.5), right: u(60), top: u(12), bottom: u(12) }}
      >
        {live ? (
          <>
            <span
              className="truncate"
              style={{ fontSize: u(10), lineHeight: 1.2, color: GRAY }}
            >
              {live.section.location || live.section.name}
            </span>
            <span
              className="mt-auto truncate font-semibold text-white"
              style={{ fontSize: u(30), lineHeight: 1.1 }}
            >
              {live.current.name}
            </span>
            <span
              className="truncate"
              style={{ fontSize: u(15), lineHeight: 1.2, color: GRAY }}
            >
              {live.next ? `次: ${live.next.name}` : "このブロックの最後です"}
            </span>
          </>
        ) : (
          <span
            className="my-auto flex flex-col gap-1 text-white"
            style={{ fontSize: u(11), lineHeight: 1.4 }}
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
      <TicketDecoration live={Boolean(live)} />
    </Link>
  );
}
