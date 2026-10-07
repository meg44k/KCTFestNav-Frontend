"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recordVisit, VISIT_KEY, type VisitHistory } from "@/lib/back";

/** このタブでサイトの中のどのページを見たかを覚える(戻るボタンの戻り先を決めるため) */
export function VisitTracker() {
  const pathname = usePathname();
  useEffect(() => {
    try {
      const h: VisitHistory = JSON.parse(
        sessionStorage.getItem(VISIT_KEY) ?? "{}",
      );
      sessionStorage.setItem(
        VISIT_KEY,
        JSON.stringify(recordVisit(h, pathname)),
      );
    } catch {
      // 保存できなくても戻るボタンはトップへ行くだけ
    }
  }, [pathname]);
  return null;
}
