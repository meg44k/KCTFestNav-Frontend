import type { ManageUser } from "@/lib/manage/roles";
import { DeleteAccountButton } from "./DeleteAccountButton";
import { EditAccountButton } from "./EditAccountButton";
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
  meId,
}: {
  users: ManageUser[];
  /** ログイン中の自分。自分のアカウントは削除できない */
  meId: string;
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
  // 担当者はアカウントの名前(編集で変えられる)。名前が無ければブースの主催者(1-1 など)
  const organizerOf = (u: ManageUser) =>
    u.name || booths[u.assigned_booth_id]?.organizer || "";
  // 編集で選べるブースと、ブースごとの担当
  const boothChoices = Object.entries(booths)
    .map(([id, b]) => ({ id: Number(id), name: b.name }))
    .sort((a, b) => a.id - b.id);
  const boothOwners: Record<number, string[]> = {};
  for (const u of staff) {
    boothOwners[u.assigned_booth_id] = [
      ...(boothOwners[u.assigned_booth_id] ?? []),
      u.login_id,
    ];
  }

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
                  <td>
                    <div className="flex justify-end gap-2">
                      <ResetPasswordButton
                        userId={u.id}
                        loginId={u.login_id}
                        label={showBooth ? boothOf(u) : u.name}
                      />
                      <EditAccountButton
                        user={u}
                        booths={boothChoices}
                        boothOwners={boothOwners}
                      />
                      {u.id !== meId && (
                        <DeleteAccountButton
                          userId={u.id}
                          loginId={u.login_id}
                          label={showBooth ? organizerOf(u) : u.name}
                          boothName={
                            showBooth && booths[u.assigned_booth_id]
                              ? boothOf(u)
                              : undefined
                          }
                        />
                      )}
                    </div>
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
