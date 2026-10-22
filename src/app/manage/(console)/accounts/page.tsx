import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import { boothsWithoutAccount } from "@/lib/manage/accounts";
import type { ManageUser } from "@/lib/manage/roles";
import { AccountList } from "./AccountList";
import { AddAccountDialog } from "./AddAccountDialog";
import { IssueAccounts } from "./IssueAccounts";

export default async function AccountsPage() {
  const auth = await requireRole(["Admin"]);
  if (!auth.ok) {
    return (
      <ConsoleMessage title="アカウント管理">{auth.message}</ConsoleMessage>
    );
  }

  const [booths, users] = await Promise.all([
    manageRequest<{ booths: BoothResponse[] }>("/booths"),
    manageRequest<{ users: ManageUser[] }>("/manage/users"),
  ]);
  if (!booths.ok || !users.ok) {
    const reason = !booths.ok
      ? booths.reason
      : !users.ok
        ? users.reason
        : "unavailable";
    return (
      <ConsoleMessage title="アカウント管理">
        {failureMessage(reason)}
      </ConsoleMessage>
    );
  }

  const boothsById = Object.fromEntries(
    booths.data.booths.map((b) => [
      b.id,
      { name: b.name, organizer: b.organizer },
    ]),
  );
  const missing = boothsWithoutAccount(booths.data.booths, users.data.users);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <h1 className="font-extrabold text-3xl">アカウント管理</h1>
        <AddAccountDialog />
      </div>
      <IssueAccounts missing={missing.length} />
      <AccountList
        users={users.data.users}
        booths={boothsById}
        meId={auth.user.id}
      />
    </div>
  );
}
