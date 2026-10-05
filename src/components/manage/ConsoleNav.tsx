"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MenuItem } from "@/lib/manage/roles";
import { cn } from "@/lib/utils";

/** ヘッダーのメニュー。今開いているページを白く強調する */
export function ConsoleNav({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400">
      {menu.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "hover:text-white",
              active && "font-bold text-white underline underline-offset-4",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
