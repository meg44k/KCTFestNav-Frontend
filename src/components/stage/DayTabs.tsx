import Link from "next/link";
import type { StageDay } from "@/lib/stage-schedule";
import { cn } from "@/lib/utils";

/** 日付のタブ。選んだ日は URL(?day=)に残す */
export function DayTabs({
  days,
  selected,
}: {
  days: StageDay[];
  selected: string;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto" role="tablist">
      {days.map((d) => {
        const active = d.key === selected;
        return (
          <Link
            key={d.key}
            href={`?day=${d.key}`}
            replace
            scroll={false}
            role="tab"
            aria-selected={active}
            aria-label={d.label}
            className={cn(
              "flex h-10 shrink-0 items-center rounded-full border px-4 font-bold text-sm",
              active
                ? "border-white bg-white text-black"
                : "border-white/30 text-gray-300",
            )}
          >
            {d.short}
          </Link>
        );
      })}
    </div>
  );
}
