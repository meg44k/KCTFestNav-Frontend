import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import {
  boothsWithoutAccount,
  generatePassword,
  loginIdForBooth,
  PASSWORD_CHARS,
  toCsv,
} from "./accounts";
import type { ManageUser } from "./roles";

describe("generatePassword", () => {
  it("紛らわしい文字を使わない", () => {
    for (const c of "0O1lI") expect(PASSWORD_CHARS).not.toContain(c);
  });

  it("渡された乱数で 10 文字を選ぶ", () => {
    let i = 0;
    const pw = generatePassword(() => i++);
    expect(pw).toBe(PASSWORD_CHARS.slice(0, 10));
  });
});

describe("loginIdForBooth", () => {
  it("booth-<ID>", () => expect(loginIdForBooth(12)).toBe("booth-12"));
});

describe("boothsWithoutAccount", () => {
  const booth = (id: number) => ({ id, name: `b${id}` }) as BoothResponse;
  const user = (role: ManageUser["role"], assigned_booth_id: number) =>
    ({
      id: "u",
      name: "n",
      login_id: "l",
      role,
      assigned_booth_id,
    }) as ManageUser;

  it("Student が担当しているブースを除く", () => {
    expect(
      boothsWithoutAccount([booth(1), booth(2)], [user("Student", 1)]).map(
        (b) => b.id,
      ),
    ).toEqual([2]);
  });

  it("Student 以外の担当や担当なし(0)は数えない", () => {
    expect(
      boothsWithoutAccount(
        [booth(1)],
        [user("Gakuseikai", 1), user("Student", 0)],
      ).map((b) => b.id),
    ).toEqual([1]);
  });
});

describe("toCsv", () => {
  it("BOM とヘッダーを付け、カンマや引用符を含む値は引用する", () => {
    expect(
      toCsv([
        { boothName: 'たこ焼き,"本店"', loginId: "booth-1", password: "abc" },
      ]),
    ).toBe(
      '﻿ブース,ログインID,パスワード\r\n"たこ焼き,""本店""",booth-1,abc\r\n',
    );
  });
});
