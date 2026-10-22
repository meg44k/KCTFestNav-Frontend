import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`REDIRECT:${p}`);
  },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

import {
  addAccount,
  deleteAccount,
  issueMissingAccounts,
  resetPassword,
  updateAccount,
} from "./manage-accounts";

const ok = (data?: unknown) => ({ ok: true, data });

// 戻り値を返すと vitest が後片付けの関数として呼んでしまうので、ブロックで書く
beforeEach(() => {
  manageRequest.mockReset();
});

describe("issueMissingAccounts", () => {
  it("未発行のブースだけに作り、1件失敗しても続ける", async () => {
    manageRequest.mockImplementation(
      async (path: string, init?: RequestInit) => {
        if (path === "/booths") {
          return ok({
            booths: [
              { id: 1, name: "たこ焼き", organizer: "1-1" },
              { id: 2, name: "焼きそば", organizer: "" },
              { id: 3, name: "済み", organizer: "3-1" },
            ],
          });
        }
        if (path === "/manage/users" && !init) {
          return ok({ users: [{ role: "Student", assigned_booth_id: 3 }] });
        }
        const body = JSON.parse(String(init?.body));
        if (body.login_id === "booth-2") {
          return { ok: false, reason: "unavailable" };
        }
        return ok();
      },
    );

    const res = await issueMissingAccounts();

    expect(res.failed).toEqual(["焼きそば"]);
    expect(res.issued).toHaveLength(1);
    expect(res.issued[0]).toMatchObject({
      boothName: "たこ焼き",
      loginId: "booth-1",
    });
    expect(res.issued[0].password).toHaveLength(10);
    const post = manageRequest.mock.calls.find((c) => c[1]?.method === "POST");
    expect(JSON.parse(post?.[1].body)).toMatchObject({
      login_id: "booth-1",
      name: "1-1",
      role: "Student",
      assigned_booth_id: 1,
    });
  });

  it("一覧を取れないときは何も作らずエラー", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unavailable" });
    expect(await issueMissingAccounts()).toEqual({
      issued: [],
      failed: [],
      error: "接続できませんでした。時間をおいて再度お試しください。",
    });
  });
});

describe("resetPassword", () => {
  it("今の値を保ったまま新しいパスワードで更新する", async () => {
    manageRequest
      .mockResolvedValueOnce(
        ok({
          id: "u1",
          name: "1-1",
          login_id: "booth-1",
          assigned_booth_id: 1,
          role: "Student",
        }),
      )
      .mockResolvedValueOnce(ok());
    const res = await resetPassword("u1");
    expect(res.loginId).toBe("booth-1");
    expect(res.password).toHaveLength(10);
    const [path, init] = manageRequest.mock.calls[1];
    expect(path).toBe("/manage/users/u1");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toEqual({
      name: "1-1",
      login_id: "booth-1",
      assigned_booth_id: 1,
      role: "Student",
      password: res.password,
    });
  });
});

describe("addAccount", () => {
  const f = (loginId: string, role: string) => {
    const x = new FormData();
    x.set("loginId", loginId);
    x.set("name", "学生会");
    x.set("role", role);
    return x;
  };

  it("学生会アカウントを作り、パスワードを返す", async () => {
    manageRequest.mockResolvedValue(ok());
    const res = await addAccount(undefined, f("gakuseikai-1", "Gakuseikai"));
    expect(res?.issued?.loginId).toBe("gakuseikai-1");
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).role).toBe(
      "Gakuseikai",
    );
  });

  it("Student / Member はここでは作らない", async () => {
    expect(await addAccount(undefined, f("x", "Student"))).toEqual({
      error: "役職を選んでください",
    });
  });

  it("ID が空なら作らない", async () => {
    expect(await addAccount(undefined, f(" ", "Gakuseikai"))).toEqual({
      error: "ログイン ID を入力してください",
    });
  });
});

describe("updateAccount", () => {
  const student = {
    id: "u1",
    name: "1-1",
    login_id: "booth-1",
    assigned_booth_id: 1,
    role: "Student",
  };
  const operator = {
    ...student,
    id: "u2",
    name: "学生会",
    login_id: "gk",
    assigned_booth_id: 0,
    role: "Gakuseikai",
  };

  it("担当者はログイン ID・名前・担当ブースを変え、役職とパスワードは送らない", async () => {
    manageRequest
      .mockResolvedValueOnce(ok(student))
      .mockResolvedValueOnce(ok());
    expect(
      await updateAccount("u1", {
        loginId: " booth-9 ",
        name: " 3-2 ",
        boothId: 9,
      }),
    ).toEqual({});
    expect(manageRequest).toHaveBeenLastCalledWith("/manage/users/u1", {
      method: "PUT",
      body: JSON.stringify({
        name: "3-2",
        login_id: "booth-9",
        assigned_booth_id: 9,
        role: "Student",
      }),
    });
  });

  it("担当者以外は担当ブースを変えない", async () => {
    manageRequest
      .mockResolvedValueOnce(ok(operator))
      .mockResolvedValueOnce(ok());
    expect(
      await updateAccount("u2", {
        loginId: "gk2",
        name: "学生会2",
        boothId: 5,
      }),
    ).toEqual({});
    expect(
      JSON.parse(manageRequest.mock.lastCall?.[1].body).assigned_booth_id,
    ).toBe(0);
  });

  it("空の項目や、担当者でブースが無いときは送らない", async () => {
    expect(
      await updateAccount("u1", { loginId: " ", name: "a", boothId: 1 }),
    ).toEqual({ error: "ログイン ID を入力してください" });
    expect(
      await updateAccount("u1", { loginId: "a", name: " ", boothId: 1 }),
    ).toEqual({ error: "担当者を入力してください" });
    manageRequest.mockResolvedValueOnce(ok(student));
    expect(
      await updateAccount("u1", { loginId: "a", name: "b", boothId: 0 }),
    ).toEqual({ error: "担当ブースを選んでください" });
    expect(manageRequest).toHaveBeenCalledTimes(1);
  });

  it("ログイン ID が使われていれば専用の文言", async () => {
    manageRequest
      .mockResolvedValueOnce(ok(student))
      .mockResolvedValueOnce({ ok: false, reason: "conflict" });
    expect(
      await updateAccount("u1", { loginId: "taken", name: "a", boothId: 1 }),
    ).toEqual({
      error: "そのログイン ID はもう使われています",
    });
  });
});

describe("deleteAccount", () => {
  it("DELETE する", async () => {
    manageRequest.mockResolvedValueOnce(ok());
    expect(await deleteAccount("u1")).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/users/u1", {
      method: "DELETE",
    });
  });

  it("失敗は文言にする", async () => {
    manageRequest.mockResolvedValueOnce({ ok: false, reason: "rejected" });
    expect((await deleteAccount("u1")).error).toBeTruthy();
  });
});
