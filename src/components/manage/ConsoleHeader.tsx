import type { ManageUser, MenuItem } from "@/lib/manage/roles";
import { ConsoleNav } from "./ConsoleNav";
import { LogoutButton } from "./LogoutButton";

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
      <div className="ml-auto">
        <LogoutButton />
      </div>
    </header>
  );
}
