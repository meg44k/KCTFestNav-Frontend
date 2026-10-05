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
  boothNames,
}: {
  users: ManageUser[];
  boothNames: Record<number, string>;
}) {
  // ブースの担当 → 学生会・管理者 → その他 の順に並べる
  // 担当ブースが無い(削除済み)ものは最後に回す
  const boothOrder = (u: ManageUser) =>
    boothNames[u.assigned_booth_id] ? u.assigned_booth_id : Infinity;
  const staff = users
    .filter((u) => u.role === "Student")
    .sort((a, b) => boothOrder(a) - boothOrder(b));
  const operators = users.filter(
    (u) => u.role === "Gakuseikai" || u.role === "Admin",
  );
  const others = users.filter((u) => u.role === "Member");

  const boothOf = (u: ManageUser) =>
    boothNames[u.assigned_booth_id] ?? "担当ブースなし";

  const section = (title: string, list: ManageUser[], showBooth: boolean) =>
    list.length > 0 && (
      <section className="flex flex-col gap-2">
        <h2 className="font-bold text-xl">{title}</h2>
        <ul className="flex flex-col">
          {list.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-white/10 py-2"
            >
              {showBooth && (
                <span
                  className={`min-w-32 font-bold ${boothNames[u.assigned_booth_id] ? "" : "text-gray-500"}`}
                >
                  {boothOf(u)}
                </span>
              )}
              <span className="font-mono">{u.login_id}</span>
              <span className="text-gray-400">
                {u.name}（{ROLE_LABEL[u.role]}）
              </span>
              <span className="ml-auto">
                <ResetPasswordButton
                  userId={u.id}
                  loginId={u.login_id}
                  label={showBooth ? boothOf(u) : u.name}
                />
              </span>
            </li>
          ))}
        </ul>
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
