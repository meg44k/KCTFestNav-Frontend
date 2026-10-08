"use client";

import {
  type BoothResponse,
  CONGESTION_LABELS,
  congestionLabel,
  toCongestionStatus,
} from "@/lib/api/booths";
import { BoothFormDialog } from "./BoothFormDialog";
import { DeleteBoothButton } from "./DeleteBoothButton";

// 来場者画面と同じ色
const CONGESTION = {
  preparing: { label: CONGESTION_LABELS.preparing, color: "bg-[#9CA3AF]" },
  empty: { label: CONGESTION_LABELS.empty, color: "bg-[#00B894]" },
  clouded: { label: CONGESTION_LABELS.clouded, color: "bg-[#FDCB6E]" },
  veryClouded: { label: CONGESTION_LABELS.veryClouded, color: "bg-[#e54141]" },
} as const;

function Congestion({
  status,
  organizer,
}: {
  status: number;
  organizer: string;
}) {
  const s = toCongestionStatus(status);
  const c = { ...CONGESTION[s], label: congestionLabel(s, organizer) };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-bold whitespace-nowrap text-black/70 ${c.color}`}
    >
      {c.label}
    </span>
  );
}

export function BoothList({
  booths,
  staffed,
}: {
  booths: BoothResponse[];
  staffed: number[];
}) {
  if (booths.length === 0) {
    return (
      <p className="text-gray-500">
        まだブースがありません。「ブースを追加」から登録してください。
      </p>
    );
  }
  const hasStaff = (id: number) => staffed.includes(id);
  const actions = (b: BoothResponse) => (
    <div className="flex gap-2">
      <BoothFormDialog current={b} />
      <DeleteBoothButton id={b.id} name={b.name} />
    </div>
  );

  return (
    <>
      {/* PC: 表 */}
      <table className="hidden w-full text-left md:table">
        <thead className="text-gray-500 text-sm">
          <tr className="border-b border-black/10">
            <th className="py-2">名前</th>
            <th>主催者</th>
            <th>場所</th>
            <th>混雑度</th>
            <th>担当</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {booths.map((b) => (
            <tr key={b.id} className="border-b border-black/10">
              <td className="py-3 pr-4 font-bold">{b.name}</td>
              <td className="pr-4">{b.organizer}</td>
              <td className="pr-4">{b.location}</td>
              <td className="pr-4">
                <Congestion
                  status={b.congestion_status}
                  organizer={b.organizer}
                />
              </td>
              <td className={`pr-4 ${hasStaff(b.id) ? "" : "text-gray-500"}`}>
                {hasStaff(b.id) ? "あり" : "なし"}
              </td>
              <td>{actions(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* スマホ: カード */}
      <ul className="flex flex-col gap-3 md:hidden">
        {booths.map((b) => (
          <li
            key={b.id}
            className="flex flex-col gap-2 rounded-lg border border-black/10 p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{b.name}</span>
              <Congestion
                status={b.congestion_status}
                organizer={b.organizer}
              />
            </div>
            <div className="text-gray-500 text-sm">
              {b.organizer} / {b.location || "場所未設定"} / 担当
              {hasStaff(b.id) ? "あり" : "なし"}
            </div>
            {actions(b)}
          </li>
        ))}
      </ul>
    </>
  );
}
