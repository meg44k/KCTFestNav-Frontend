"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
