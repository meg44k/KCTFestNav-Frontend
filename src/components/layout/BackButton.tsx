"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { canGoBack, VISIT_KEY, type VisitHistory } from "@/lib/back";

/**
 * 左上の戻るボタン。サイトの中で前に見たページがあればそこへ戻り、
 * QR などから直接開いたときはトップ(/main)へ。トップでは出さない
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  if (pathname === "/main") return null;

  const back = () => {
    let h: VisitHistory = {};
    try {
      h = JSON.parse(sessionStorage.getItem(VISIT_KEY) ?? "{}");
    } catch {}
    if (canGoBack(h, pathname)) router.back();
    else router.push("/main");
  };

  return (
    <button
      type="button"
      onClick={back}
      aria-label="戻る"
      className="absolute top-13 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-black/80 text-white"
    >
      <ChevronLeft size={22} />
    </button>
  );
}
