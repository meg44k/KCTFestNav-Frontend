"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { INTRO_COOKIE_SET } from "@/lib/intro";

/**
 * タイトルを少し見せてから入口ページへ。戻るでタイトルに戻らないよう履歴は置き換える。
 * 移る間だけ html に data-intro を付け、入口ページの中身を下から出すアニメーションを有効にする
 * (他のページから入口へ戻るときには動かさない)
 */
export function IntroRedirect({
  to,
  afterMs,
  reducedMotionMs = afterMs,
}: {
  to: string;
  afterMs: number;
  /** 「視差効果を減らす」の端末で待つ時間(アニメーションを流さないので短くてよい) */
  reducedMotionMs?: number;
}) {
  const router = useRouter();
  useEffect(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: 一度見たことを覚えるだけの値
    document.cookie = INTRO_COOKIE_SET;
    const html = document.documentElement;
    html.dataset.intro = "";
    router.prefetch(to);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(
      () => router.replace(to),
      reduce ? reducedMotionMs : afterMs,
    );
    return () => {
      clearTimeout(timer);
      // 入口ページが出てアニメーションが終わるまで待ってから外す
      setTimeout(() => delete html.dataset.intro, 2500);
    };
  }, [router, to, afterMs, reducedMotionMs]);
  return null;
}
