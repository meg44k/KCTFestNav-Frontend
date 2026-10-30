"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { recordVisit } from "@/app/actions/visit";
import {
  countsVisit,
  jstDay,
  shouldReport,
  VISIT_DAY_KEY,
  VISITOR_ID_KEY,
} from "@/lib/visit";

/**
 * 何人が来たかを数える(負荷モニターで見る)。ブラウザごとに名前の無い番号を 1 つ持ち、
 * その日にまだ知らせていなければ 1 回だけサーバーに知らせる。Vercel の呼び出しは 1 人 1 日 1 回だけ。
 * 端末に覚えておけない(プライベートモードなど)ときは数えない。何も表示しない
 */
export function VisitCounter() {
  const pathname = usePathname();
  useEffect(() => {
    if (!countsVisit(pathname)) return;
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const today = jstDay(new Date());
    if (!shouldReport(storage.getItem(VISIT_DAY_KEY), today)) return;
    let id = storage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      storage.setItem(VISITOR_ID_KEY, id);
    }
    // 知らせられたときだけ「今日は済み」にする(失敗したら次のページで試す)
    recordVisit(id)
      .then((ok) => {
        if (ok) storage.setItem(VISIT_DAY_KEY, today);
      })
      .catch(() => {});
  }, [pathname]);
  return null;
}
