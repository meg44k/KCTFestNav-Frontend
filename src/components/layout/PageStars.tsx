"use client";

import { usePathname } from "next/navigation";
import { showsPageStars } from "@/lib/home/page-stars";

/**
 * 来場者の一覧や説明のページの後ろに、画面に固定した星を出すかを決める。
 * 星(children)はサーバーで描いたものをそのまま使う。ブラウザで計算し直すと、
 * 小数の最後の桁がサーバーとずれてハイドレーションの食い違いになるため
 */
export function PageStars({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return showsPageStars(pathname) ? children : null;
}
