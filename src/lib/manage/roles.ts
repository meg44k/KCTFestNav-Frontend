// 管理画面のロール。バックエンドの domain.Role と同じ文字列
export type Role = "Admin" | "Gakuseikai" | "Student" | "Member";

/** GET /auth/me の応答 */
export type ManageUser = {
  id: string;
  name: string;
  login_id: string;
  assigned_booth_id: number;
  role: Role;
};

export type MenuItem = { href: string; label: string };

const BOOTHS: MenuItem = { href: "/manage/booths", label: "ブース管理" };
const ACCOUNTS: MenuItem = {
  href: "/manage/accounts",
  label: "アカウント管理",
};
const OPS: MenuItem = { href: "/manage/ops", label: "当日運営" };

/** ログイン後に最初に開く画面。管理画面を使えないロールは null */
export function homePathFor(role: Role): string | null {
  switch (role) {
    case "Admin":
      return BOOTHS.href;
    case "Gakuseikai":
      return OPS.href;
    case "Student":
      return "/manage/my-booth";
    default:
      return null;
  }
}

/** ヘッダーに出すメニュー。企画担当は使う画面が1つなので出さない */
export function menuFor(role: Role): MenuItem[] {
  switch (role) {
    case "Admin":
      return [BOOTHS, ACCOUNTS, OPS];
    case "Gakuseikai":
      return [OPS];
    default:
      return [];
  }
}
