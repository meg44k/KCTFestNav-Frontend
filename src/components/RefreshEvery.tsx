"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 来場者のページを開いたままにしたとき、読み直す間隔(秒)。
 * 読み直すたびに Vercel でページを作り直し、無料プランの CPU の上限(月 4 時間)を使うので、長めにしている
 */
export const VISITOR_REFRESH_SECONDS = 180;

/** 画面を開いたままでも最新になるよう、一定間隔でサーバーから読み直す(裏にある間は休む) */
export function RefreshEvery({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
