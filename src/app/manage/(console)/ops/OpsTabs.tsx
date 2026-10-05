"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

export type Tab = "congestion" | "lives" | "announcement";

const LABELS: Record<Tab, string> = {
  congestion: "混雑度",
  lives: "ライブ",
  announcement: "お知らせ",
};

/**
 * 3 つのタブ。選んだタブは URL の ?tab= に残し、
 * 再読み込みや自動更新でも同じタブのままにする
 */
export function OpsTabs({
  initialTab,
  ...panels
}: { initialTab: Tab } & Record<Tab, ReactNode>) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();

  const choose = (next: Tab) => {
    setTab(next);
    router.replace(`?tab=${next}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2" role="tablist">
        {(Object.keys(LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => choose(t)}
            className={cn(
              "h-12 rounded-lg border border-white/20 font-bold",
              tab === t ? "bg-white text-black" : "text-gray-300",
            )}
          >
            {LABELS[t]}
          </button>
        ))}
      </div>
      <div role="tabpanel">{panels[tab]}</div>
    </div>
  );
}
