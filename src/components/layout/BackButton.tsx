"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { canGoBack, VISIT_KEY, type VisitHistory } from "@/lib/back";
import { cn } from "@/lib/utils";

/**
 * 左上の戻るボタン。サイトの中で前に見たページがあればそこへ戻り、
 * QR などから直接開いたときはトップ(/main)へ。トップでは出さない
 */
export function BackButton({ className }: { className?: string }) {
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
      className={cn(
        "z-50 flex h-10 w-10 items-center justify-center rounded-full glass text-white",
        className,
      )}
    >
      <ChevronLeft size={22} />
    </button>
  );
}
