import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import type { ManageUser } from "@/lib/manage/roles";
import { BoothFormDialog } from "./BoothFormDialog";
import { BoothList } from "./BoothList";

export default async function BoothsPage() {
  const auth = await requireRole(["Admin"]);
  if (!auth.ok) {
    return <ConsoleMessage title="ブース管理">{auth.message}</ConsoleMessage>;
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
      <ConsoleMessage title="ブース管理">
        {failureMessage(reason)}
      </ConsoleMessage>
    );
  }

  // 担当(Student)アカウントがいるブース。Client Component に渡すので配列にする
  const staffed = [
    ...new Set(
      users.data.users
        .filter((u) => u.role === "Student" && u.assigned_booth_id)
        .map((u) => u.assigned_booth_id),
    ),
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-3xl">
          ブース管理{" "}
          <span className="text-base text-gray-400">
            {booths.data.booths.length}件
          </span>
        </h1>
        <BoothFormDialog />
      </div>
      <BoothList booths={booths.data.booths} staffed={staffed} />
    </div>
  );
}
