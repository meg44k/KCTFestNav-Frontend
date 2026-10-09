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
// 企画担当は混雑度とブースの説明を別のページにしてヘッダーから開く
const MY_BOOTH: MenuItem[] = [
  { href: "/manage/my-booth/congestion", label: "混雑度" },
  { href: "/manage/my-booth/detail", label: "ブースの説明" },
];
// 当日運営はページに分けてヘッダーから直接開く
const OPS: MenuItem[] = [
  { href: "/manage/ops/congestion", label: "混雑度" },
  { href: "/manage/ops/lives", label: "ライブ" },
  { href: "/manage/ops/announcement", label: "お知らせ" },
  { href: "/manage/ops/likes", label: "いいね" },
];

/** ログイン後に最初に開く画面。管理画面を使えないロールは null */
export function homePathFor(role: Role): string | null {
  switch (role) {
    case "Admin":
      return BOOTHS.href;
    case "Gakuseikai":
      return OPS[0].href;
    case "Student":
      return MY_BOOTH[0].href;
    default:
      return null;
  }
}

/** ヘッダーに出すメニュー */
export function menuFor(role: Role): MenuItem[] {
  switch (role) {
    case "Admin":
      return [BOOTHS, ACCOUNTS, ...OPS];
    case "Gakuseikai":
      return OPS;
    case "Student":
      return MY_BOOTH;
    default:
      return [];
  }
}
