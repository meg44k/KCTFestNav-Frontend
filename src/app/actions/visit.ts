"use server";

import { internalRequest } from "@/lib/api/internal";
import { isVisitorId } from "@/lib/visit";

/** 今日このブラウザが来たと知らせる。うまくいけば true(失敗しても画面には何も出さない) */
export async function recordVisit(visitor: string): Promise<boolean> {
  if (!isVisitorId(visitor)) return false;
  const res = await internalRequest("/internal/visits", {
    method: "POST",
    json: { visitor },
  });
  return res.status === 204;
}
