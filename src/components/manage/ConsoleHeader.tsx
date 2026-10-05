import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { ManageUser, MenuItem } from "@/lib/manage/roles";

export function ConsoleHeader({
  user,
  menu,
}: {
  user: ManageUser;
  menu: MenuItem[];
}) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-white/10 print:hidden">
      <span className="font-bold">{user.name}</span>
      <nav className="flex gap-4 text-gray-300">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={logoutAction} className="ml-auto">
        <Button type="submit" variant="outline" size="sm">
          ログアウト
        </Button>
      </form>
    </header>
  );
}
