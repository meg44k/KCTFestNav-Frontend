"use client";

import { useEffect } from "react";
import { loadFontAfterPageLoad } from "@/lib/font/lazy-font";

/** Zen Kaku Gothic New をページの読み込みが終わってから読む(それまでは端末のフォント) */
export function LazyFont() {
  useEffect(() => loadFontAfterPageLoad<HTMLLinkElement>(document, window), []);
  return null;
}
