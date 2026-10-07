"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { INTRO_COOKIE_SET } from "@/lib/intro";
import { INTRO_TRANSITION } from "./FestivalTitle";

/** タイトルを少し見せてから入口ページへ。戻るでタイトルに戻らないよう履歴は置き換える */
export function IntroRedirect({
  to,
  afterMs,
}: {
  to: string;
  afterMs: number;
}) {
  const router = useRouter();
  useEffect(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: 一度見たことを覚えるだけの値
    document.cookie = INTRO_COOKIE_SET;
    router.prefetch(to);
    const timer = setTimeout(
      () => router.replace(to, { transitionTypes: [INTRO_TRANSITION] }),
      afterMs,
    );
    return () => clearTimeout(timer);
  }, [router, to, afterMs]);
  return null;
}
