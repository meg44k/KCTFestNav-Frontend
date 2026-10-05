import type { ManageUser } from "@/lib/manage/roles";
import { ResetPasswordButton } from "./ResetPasswordButton";

const ROLE_LABEL: Record<ManageUser["role"], string> = {
  Admin: "管理者",
  Gakuseikai: "学生会",
  Student: "担当",
  Member: "一般",
};

export function AccountList({
  users,
  booths,
}: {
  users: ManageUser[];
  /** ブース ID → ブース名と担当者(主催者) */
  booths: Record<number, { name: string; organizer: string }>;
}) {
  // ブースの担当 → 学生会・管理者 → その他 の順に並べる
  // 担当ブースが無い(削除済み)ものは最後に回す
  const boothOrder = (u: ManageUser) =>
    booths[u.assigned_booth_id] ? u.assigned_booth_id : Infinity;
  const staff = users
    .filter((u) => u.role === "Student")
    .sort((a, b) => boothOrder(a) - boothOrder(b));
  const operators = users.filter(
    (u) => u.role === "Gakuseikai" || u.role === "Admin",
  );
  const others = users.filter((u) => u.role === "Member");

  const boothOf = (u: ManageUser) =>
    booths[u.assigned_booth_id]?.name ?? "担当ブースなし";
  // 担当者(1-1 など)はブースの主催者。ブースが削除済みならアカウントの名前
  const organizerOf = (u: ManageUser) =>
    booths[u.assigned_booth_id]?.organizer || u.name;

  const section = (title: string, list: ManageUser[], showBooth: boolean) =>
    list.length > 0 && (
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-xl">{title}</h2>
        {/* スマホ幅で入りきらないときは表だけ横にスクロールする */}
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="text-gray-500 text-sm">
              <tr className="border-b border-black/10">
                {showBooth ? (
                  <>
                    <th className="py-2 pr-4">担当者</th>
                    <th className="pr-4">ブース</th>
                    <th className="pr-4">ログインID</th>
                  </>
                ) : (
                  <>
                    <th className="py-2 pr-4">ログインID</th>
                    <th className="pr-4">名前</th>
                    <th className="pr-4">役職</th>
                  </>
                )}
                <th className="text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-black/10">
                  {showBooth ? (
                    <>
                      <td className="py-2 pr-4 font-bold">{organizerOf(u)}</td>
                      <td
                        className={`pr-4 ${booths[u.assigned_booth_id] ? "" : "text-gray-500"}`}
                      >
                        {boothOf(u)}
                      </td>
                      <td className="pr-4 font-mono text-gray-500">
                        {u.login_id}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-2 pr-4 font-mono">{u.login_id}</td>
                      <td className="pr-4">{u.name}</td>
                      <td className="pr-4 text-gray-500">
                        {ROLE_LABEL[u.role]}
                      </td>
                    </>
                  )}
                  <td className="text-right">
                    <ResetPasswordButton
                      userId={u.id}
                      loginId={u.login_id}
                      label={showBooth ? boothOf(u) : u.name}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    );

  return (
    <div className="flex flex-col gap-6 print:hidden">
      {section("ブースの担当", staff, true)}
      {section("学生会・管理者", operators, false)}
      {section("その他", others, false)}
    </div>
  );
}
