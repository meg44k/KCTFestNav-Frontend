import type { BoothResponse } from "@/lib/api/booths";
import type { ManageUser } from "./roles";

/** 紙に書き写しても読み間違えないよう 0 O 1 l I を除く */
export const PASSWORD_CHARS =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** randomInt は 0 以上 max 未満の整数を返す関数(サーバーでは crypto.randomInt を渡す) */
export function generatePassword(
  randomInt: (max: number) => number,
  length = 10,
): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }
  return out;
}

export const loginIdForBooth = (boothId: number) => `booth-${boothId}`;

/** 担当の Student アカウントがまだ無いブース */
export function boothsWithoutAccount(
  booths: BoothResponse[],
  users: ManageUser[],
): BoothResponse[] {
  const covered = new Set(
    users
      .filter((u) => u.role === "Student" && u.assigned_booth_id)
      .map((u) => u.assigned_booth_id),
  );
  return booths.filter((b) => !covered.has(b.id));
}

export type IssuedAccount = {
  boothName: string;
  loginId: string;
  password: string;
};

const csvCell = (v: string) =>
  /[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;

/** Excel で開いても文字化けしないよう BOM を付ける */
export function toCsv(rows: IssuedAccount[]): string {
  const lines = [
    ["ブース", "ログインID", "パスワード"],
    ...rows.map((r) => [r.boothName, r.loginId, r.password]),
  ];
  return `﻿${lines.map((l) => l.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
