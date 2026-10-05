import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { ManageUser, MenuItem } from "@/lib/manage/roles";
import { ConsoleNav } from "./ConsoleNav";

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
      <ConsoleNav menu={menu} />
      <form action={logoutAction} className="ml-auto">
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="cursor-pointer border-[#e54141] text-[#e54141] hover:bg-[#e54141] hover:text-white"
        >
          ログアウト
        </Button>
      </form>
    </header>
  );
}
