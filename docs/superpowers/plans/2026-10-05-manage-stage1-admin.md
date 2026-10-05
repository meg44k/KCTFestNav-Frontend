# 管理コンソール 段階1（管理者） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin が `/manage/booths` でブースを登録・編集・削除し、`/manage/accounts` で担当者アカウントの一括発行とパスワード再発行ができるようにする。

**Architecture:** 画面は Server Component で一覧を取り、操作は Server Action（`src/app/actions/manage-*.ts`）から `manageRequest` で API を呼ぶ。入力の検証・ペイロードの組み立て・パスワード生成・CSV 化は純粋関数（`src/lib/manage/*.ts`）に分けてテストする。バックエンドはユーザー更新でパスワードを正しく扱うよう直す。

**Tech Stack:** Next.js 16（Server Actions, `revalidatePath`）、React 19（`useActionState`）、shadcn/ui（base-ui の Dialog）、vitest、Go/Echo

**Spec:** `docs/superpowers/specs/2026-10-05-manage-console-design.md`（§4, §6, §9）。段階0の成果（`manageRequest`, `fetchMe`, `ConsoleMessage`, `(console)` レイアウト）の上に作る

## Global Constraints

- Next.js は破壊的変更あり。書く前に `node_modules/next/dist/docs/` の該当ページを読む（`revalidatePath` は `01-app/03-api-reference/04-functions/revalidatePath.md`）
- API はサーバー側からだけ呼ぶ。Client Component は Server Action を呼ぶ
- ブースの `x`, `y`, `z` は画面に出さない。新規は 0、編集では今の値をそのまま送る
- 画像は URL の入力（アップロードしない）
- 担当アカウント: ロール `Student`、ログイン ID `booth-<ブースID>`、パスワードはランダム 10 文字（`0 O 1 l I` を除く英数字）、名前はブースの主催者名（空ならブース名）
- 発行・再発行したパスワードは**その場でしか表示しない**（保存しない）
- ブースとアカウントの画面は Admin 専用。他のロールには「この操作の権限がありません。」を出す（段階0のレビュー指摘）
- ページ側でも `unauthorized` を処理する（layout はフル読み込み時しか走らないため。段階0のレビュー指摘）
- UI は来場者画面に合わせる（黒背景・白文字、`font-extrabold` の見出し、押すボタンは `h-14` 以上、主ボタンは白地に黒文字）。管理者画面は PC でも見やすく、スマホでは縦に並べる
- 保存に失敗したら入力を残したままエラーを出す（spec §9）
- コメント・コミットは日本語、`Feat:`/`Fix:`/`Test:`/`Docs:`、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- フロント `npm test`・`npx tsc --noEmit`・`npx next build`、バックエンド `go test -count=1 ./...`（DB を起動して e2e も）が通ること
- ブランチ: フロント `feature/manage-admin`（作成済み）、バックエンド `feature/user-update-password`

## Review Focus

1. 一括発行の途中で 1 件だけ失敗（ID 重複など）→ 成功した分のパスワードは表示され、失敗したブースが分かる（Task 6 のテスト）
2. ブース編集で緯度・経度を空欄にする / 数字でない値を入れる → 空欄は 0、数字でなければ保存せずエラー（Task 3 のテスト）
3. パスワード再発行後、新しいパスワードでログインでき、名前などは変わらない（Task 1 の e2e）
4. 担当アカウントのいるブースを削除 → アカウントは残り「担当ブースなし」として一覧に出る。一括発行の対象にはならない（Task 4 のテスト）
5. Admin 以外が `/manage/booths` / `/manage/accounts` を直接開く → 権限なしの表示（Task 2 のテスト）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `KCTFestNav-Backend/internal/usecase/user_usecase.go` | `Update` でパスワードをハッシュ化／空なら今のハッシュを保つ |
| `KCTFestNav-Backend/internal/usecase/user_usecase_test.go`, `internal/handler/user_e2e_test.go` | 上のテスト |
| `src/lib/api/manage.ts` | 本文が空の 200/201 を扱う、`requireRole` を追加 |
| `src/lib/manage/booth-form.ts` | ブースの入力 → API ペイロード（検証込み） |
| `src/lib/manage/accounts.ts` | パスワード生成、ログイン ID、未発行ブースの抽出、CSV |
| `src/app/actions/manage-booths.ts` | ブースの作成・更新・削除 |
| `src/app/actions/manage-accounts.ts` | 一括発行、再発行、アカウント追加 |
| `src/app/manage/(console)/booths/page.tsx`, `BoothList.tsx`, `BoothFormDialog.tsx`, `DeleteBoothButton.tsx` | ブース管理画面 |
| `src/app/manage/(console)/accounts/page.tsx`, `AccountList.tsx`, `IssueAccounts.tsx`, `IssuedTable.tsx`, `AddAccountDialog.tsx` | アカウント画面 |

---

### Task 1: バックエンド — ユーザー更新のパスワード

**Files:**
- Modify: `KCTFestNav-Backend/internal/usecase/user_usecase.go`（`Update`）
- Modify: `KCTFestNav-Backend/internal/usecase/user_usecase_test.go`（`TestUserUsecase_Update`）
- Modify: `KCTFestNav-Backend/internal/handler/user_e2e_test.go`（PUT のケース）

**Interfaces:**
- Produces: `PUT /manage/users/:id` は `password` が空なら今のパスワードを保ち、空でなければ bcrypt でハッシュ化して保存する

- [ ] **Step 1: ブランチを作る**

```bash
cd KCTFestNav-Backend && git checkout develop && git checkout -b feature/user-update-password
```

- [ ] **Step 2: 失敗するテストを書く**（`TestUserUsecase_Update` の中に追加）

```go
	t.Run("正常系: パスワードはハッシュ化して保存すること", func(t *testing.T) {
		var saved *domain.User
		mockRepo := &mockUserRepository{
			mockUpdate: func(ctx context.Context, user *domain.User) error {
				saved = user
				return nil
			},
		}
		uc := usecase.NewUserUsecase(mockRepo)
		ctx := context.WithValue(context.Background(), usecase.ContextRequestUserKey,
			usecase.RequestUser{ID: uuid.New(), Role: domain.RoleAdmin})

		err := uc.Update(ctx, uuid.New(), domain.UserParams{
			Name: "担当", LoginID: "booth-1", Password: []byte("new-pass"),
			AssignedBoothID: 1, Role: domain.RoleStudent,
		})
		assert.NoError(t, err)
		assert.NotEqual(t, []byte("new-pass"), saved.Password)
		assert.NoError(t, bcrypt.CompareHashAndPassword(saved.Password, []byte("new-pass")))
	})

	t.Run("正常系: パスワードが空なら今のパスワードを保つこと", func(t *testing.T) {
		id := uuid.New()
		current, _ := domain.ReconstructUser(id, domain.UserParams{
			Name: "担当", LoginID: "booth-1", Password: []byte("existing-hash"),
			AssignedBoothID: 1, Role: domain.RoleStudent,
		})
		var saved *domain.User
		mockRepo := &mockUserRepository{
			mockGetByID: func(ctx context.Context, gotID uuid.UUID) (*domain.User, error) {
				assert.Equal(t, id, gotID)
				return current, nil
			},
			mockUpdate: func(ctx context.Context, user *domain.User) error {
				saved = user
				return nil
			},
		}
		uc := usecase.NewUserUsecase(mockRepo)
		ctx := context.WithValue(context.Background(), usecase.ContextRequestUserKey,
			usecase.RequestUser{ID: uuid.New(), Role: domain.RoleAdmin})

		err := uc.Update(ctx, id, domain.UserParams{
			Name: "名前だけ変更", LoginID: "booth-1", AssignedBoothID: 1, Role: domain.RoleStudent,
		})
		assert.NoError(t, err)
		assert.Equal(t, "名前だけ変更", saved.Name)
		assert.Equal(t, []byte("existing-hash"), saved.Password)
	})
```

- [ ] **Step 3: 失敗を確認する**

Run: `go test ./internal/usecase/ -run TestUserUsecase_Update -v`
Expected: 追加した 2 ケースが FAIL（平文のまま保存される / 空のまま保存される）

- [ ] **Step 4: 実装する**

```go
func (uu *UserUsecase) Update(
	ctx context.Context,
	id uuid.UUID,
	p domain.UserParams) error {
	reqUser, ok := ctx.Value(ContextRequestUserKey).(RequestUser)
	if !ok || reqUser.Role != domain.RoleAdmin {
		return ErrForbidden
	}

	// パスワードが空なら今のものを保つ。空でなければハッシュ化して保存する
	if len(p.Password) == 0 {
		current, err := uu.userRepo.GetByID(ctx, id)
		if err != nil {
			return err
		}
		p.Password = current.Password
	} else {
		hashed, err := bcrypt.GenerateFromPassword(p.Password, bcrypt.DefaultCost)
		if err != nil {
			return err
		}
		p.Password = hashed
	}

	user, err := domain.ReconstructUser(id, p)
	if err != nil {
		return err
	}
	return uu.userRepo.Update(ctx, user)
}
```

- [ ] **Step 5: e2e を足す**

`user_e2e_test.go` の「PUT /manage/users/:id - ユーザー情報を更新できること(Admin権限)」の直後に、更新後のパスワードでログインできることを確かめるケースを追加する。PUT で送ったパスワードと `login_id` を使い、`POST /auth/login` が 200 を返し、`token` が空でないことを確認する（既存ケースが送っている値を読んで合わせる）。

- [ ] **Step 6: 通ることを確認する**

Run: `go test ./internal/usecase/ -run TestUserUsecase_Update -v` → PASS
Run: `docker compose up -d && go test -count=1 ./...` → 全 PASS（e2e が実行されたことを `-v` で確認）

- [ ] **Step 7: コミット**

```bash
git add internal/usecase internal/handler/user_e2e_test.go
git commit -m "Fix: ユーザー更新でパスワードを平文のまま保存していた問題を直した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `manageRequest` の空の本文と `requireRole`

**Files:**
- Modify: `src/lib/api/manage.ts`
- Test: `src/lib/api/manage.test.ts`

**Interfaces:**
- Consumes: `fetchMe`, `ManageResult`, `failureMessage`（段階0）、`Role`, `ManageUser`（段階0）
- Produces:
  - `manageRequest` は本文が空の 2xx を `data: undefined` で返す（ブース更新は 200 で本文なし、作成は 201 で本文なし）
  - `requireRole(allowed: Role[]): Promise<{ ok: true; user: ManageUser } | { ok: false; message: string }>` — 401/削除済みは `redirect("/manage/logout")`、それ以外の失敗とロール外は `ok: false`

- [ ] **Step 1: 失敗するテストを書く**（`manage.test.ts` に追加。`next/navigation` の redirect を例外にするモックを先頭に足す）

```ts
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
```

```ts
describe("manageRequest の本文", () => {
  it("本文が空の 200 / 201 も成功として扱う", async () => {
    fetchMock.mockResolvedValueOnce(new Response("", { status: 200 }));
    expect(await manageRequest("/manage/booths/1", { method: "PUT" })).toEqual({
      ok: true,
      data: undefined,
    });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 201 }));
    expect(await manageRequest("/manage/booths", { method: "POST" })).toEqual({
      ok: true,
      data: undefined,
    });
  });
});

describe("requireRole", () => {
  const me = (role: string) =>
    new Response(
      JSON.stringify({ id: "u", name: "n", login_id: "l", assigned_booth_id: 0, role }),
      { status: 200 },
    );

  it("許可されたロールならユーザーを返す", async () => {
    fetchMock.mockResolvedValue(me("Admin"));
    const res = await requireRole(["Admin"]);
    expect(res.ok && res.user.role).toBe("Admin");
  });

  it("ロール外は権限なし", async () => {
    fetchMock.mockResolvedValue(me("Student"));
    expect(await requireRole(["Admin"])).toEqual({
      ok: false,
      message: "この操作の権限がありません。",
    });
  });

  it("期限切れはログインし直してもらう", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await expect(requireRole(["Admin"])).rejects.toThrow("REDIRECT:/manage/logout");
  });

  it("サーバーに繋がらないときは案内を返す", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await requireRole(["Admin"])).toEqual({
      ok: false,
      message: "サーバーに接続できません。時間をおいて再度お試しください。",
    });
  });
});
```

import に `requireRole` を足す。

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run --project unit src/lib/api/manage.test.ts`
Expected: 「本文が空の 200」が JSON の解析エラーで FAIL、`requireRole` が未定義で FAIL

- [ ] **Step 3: 実装する**

`manageRequest` の本文の読み方を置き換える:

```ts
  if (!res.ok) return { ok: false, reason: toFailure(res.status) };
  // 作成・更新・削除の API は本文を返さない(201/200/204 で空)
  const text = await res.text();
  return { ok: true, data: (text ? JSON.parse(text) : undefined) as T };
```

末尾に追加（`import { redirect } from "next/navigation";` と `Role` の型 import を足す）:

```ts
/**
 * ページの最初に呼ぶ。期限切れ・削除済みはログインし直し、
 * ロール外や接続できないときは画面に出す文言を返す
 */
export async function requireRole(
  allowed: Role[],
): Promise<{ ok: true; user: ManageUser } | { ok: false; message: string }> {
  const me = await fetchMe();
  if (!me.ok) {
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return { ok: false, message: failureMessage(me.reason) };
  }
  if (!allowed.includes(me.data.role)) {
    return { ok: false, message: failureMessage("forbidden") };
  }
  return { ok: true, user: me.data };
}
```

- [ ] **Step 4: 通ることを確認する** — Run: `npx vitest run --project unit` → 全 PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/api/manage.ts src/lib/api/manage.test.ts
git commit -m "Feat: 本文の無い応答の扱いとロールの確認をmanageRequestに追加した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: ブースの入力 → API ペイロード

**Files:**
- Create: `src/lib/manage/booth-form.ts`
- Test: `src/lib/manage/booth-form.test.ts`

**Interfaces:**
- Consumes: `BoothResponse`（`src/lib/api/booths.ts`）
- Produces:
  - `type BoothPayload = Omit<BoothResponse, "id" | "congestion_status">`
  - `parseBoothForm(formData: FormData, current?: BoothResponse): { ok: true; payload: BoothPayload } | { ok: false; error: string }`
  - フォームの name: `name`, `organizer`, `detail`, `location`, `imageUrl`, `latitude`, `longitude`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import { parseBoothForm } from "./booth-form";

const fd = (v: Record<string, string>) => {
  const f = new FormData();
  for (const [k, x] of Object.entries(v)) f.set(k, x);
  return f;
};
const base = {
  name: " たこ焼き ",
  organizer: "1-1",
  detail: "説明",
  location: "中庭",
  imageUrl: "",
  latitude: "33.8168",
  longitude: "130.8718",
};

describe("parseBoothForm", () => {
  it("前後の空白を取り、緯度経度を数値にし、新規の x/y/z は 0", () => {
    expect(parseBoothForm(fd(base))).toEqual({
      ok: true,
      payload: {
        name: "たこ焼き",
        organizer: "1-1",
        detail: "説明",
        location: "中庭",
        image_url: "",
        latitude: 33.8168,
        longitude: 130.8718,
        x: 0,
        y: 0,
        z: 0,
      },
    });
  });

  it("名前が空なら保存しない", () => {
    expect(parseBoothForm(fd({ ...base, name: "  " }))).toEqual({
      ok: false,
      error: "ブース名を入力してください",
    });
  });

  it("緯度経度の空欄は 0（未設定）", () => {
    const res = parseBoothForm(fd({ ...base, latitude: "", longitude: "" }));
    expect(res.ok && [res.payload.latitude, res.payload.longitude]).toEqual([0, 0]);
  });

  it("数字でない緯度経度は保存しない", () => {
    expect(parseBoothForm(fd({ ...base, latitude: "北" }))).toEqual({
      ok: false,
      error: "緯度・経度は数字で入力してください",
    });
  });

  it("画像 URL は http(s) のみ", () => {
    expect(parseBoothForm(fd({ ...base, imageUrl: "javascript:alert(1)" }))).toEqual({
      ok: false,
      error: "画像 URL は http:// か https:// で始めてください",
    });
  });

  it("編集では x/y/z を今の値のまま送る", () => {
    const current = { x: 1, y: 2, z: 3 } as BoothResponse;
    const res = parseBoothForm(fd(base), current);
    expect(res.ok && [res.payload.x, res.payload.y, res.payload.z]).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: 失敗を確認する** — Run: `npx vitest run --project unit src/lib/manage/booth-form.test.ts` → FAIL（モジュールが無い）

- [ ] **Step 3: 実装する**

```ts
import type { BoothResponse } from "@/lib/api/booths";

/** POST/PUT /manage/booths に送る形。混雑度は別の API で変えるので含めない */
export type BoothPayload = Omit<BoothResponse, "id" | "congestion_status">;

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();

// 空欄は未設定(0)。数字でなければ null
function coordinate(value: string): number | null {
  if (value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function parseBoothForm(
  formData: FormData,
  current?: BoothResponse,
): { ok: true; payload: BoothPayload } | { ok: false; error: string } {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "ブース名を入力してください" };

  const imageUrl = text(formData, "imageUrl");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return { ok: false, error: "画像 URL は http:// か https:// で始めてください" };
  }

  const latitude = coordinate(text(formData, "latitude"));
  const longitude = coordinate(text(formData, "longitude"));
  if (latitude === null || longitude === null) {
    return { ok: false, error: "緯度・経度は数字で入力してください" };
  }

  return {
    ok: true,
    payload: {
      name,
      organizer: text(formData, "organizer"),
      detail: text(formData, "detail"),
      location: text(formData, "location"),
      image_url: imageUrl,
      latitude,
      longitude,
      // x/y/z は使っていないが DB では必須。編集では今の値を保つ
      x: current?.x ?? 0,
      y: current?.y ?? 0,
      z: current?.z ?? 0,
    },
  };
}
```

- [ ] **Step 4: 通ることを確認する** — 同じコマンドで PASS

- [ ] **Step 5: コミット** — `git add src/lib/manage/booth-form.ts src/lib/manage/booth-form.test.ts` → `Feat: ブースの入力をAPIの形に変換する処理を追加した`

---

### Task 4: アカウントの純粋関数

**Files:**
- Create: `src/lib/manage/accounts.ts`
- Test: `src/lib/manage/accounts.test.ts`

**Interfaces:**
- Consumes: `BoothResponse`、`ManageUser`
- Produces:
  - `PASSWORD_CHARS`（`0 O 1 l I` を除いた英数字）、`generatePassword(randomInt: (max: number) => number, length = 10): string`
  - `loginIdForBooth(boothId: number): string` → `booth-<id>`
  - `boothsWithoutAccount(booths: BoothResponse[], users: ManageUser[]): BoothResponse[]`（Student が担当していないブース）
  - `type IssuedAccount = { boothName: string; loginId: string; password: string }`
  - `toCsv(rows: IssuedAccount[]): string`（Excel で文字化けしないよう先頭に BOM、ヘッダー行は「ブース,ログインID,パスワード」）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import type { ManageUser } from "./roles";
import {
  boothsWithoutAccount,
  generatePassword,
  loginIdForBooth,
  PASSWORD_CHARS,
  toCsv,
} from "./accounts";

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
    ({ id: "u", name: "n", login_id: "l", role, assigned_booth_id }) as ManageUser;

  it("Student が担当しているブースを除く", () => {
    expect(
      boothsWithoutAccount([booth(1), booth(2)], [user("Student", 1)]).map((b) => b.id),
    ).toEqual([2]);
  });

  it("Student 以外の担当や担当なし(0)は数えない", () => {
    expect(
      boothsWithoutAccount([booth(1)], [user("Gakuseikai", 1), user("Student", 0)]).map(
        (b) => b.id,
      ),
    ).toEqual([1]);
  });
});

describe("toCsv", () => {
  it("BOM とヘッダーを付け、カンマや引用符を含む値は引用する", () => {
    expect(
      toCsv([{ boothName: 'たこ焼き,"本店"', loginId: "booth-1", password: "abc" }]),
    ).toBe('﻿ブース,ログインID,パスワード\r\n"たこ焼き,""本店""",booth-1,abc\r\n');
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/lib/manage/accounts.test.ts` → FAIL

- [ ] **Step 3: 実装する**

```ts
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

const csvCell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Excel で開いても文字化けしないよう BOM を付ける */
export function toCsv(rows: IssuedAccount[]): string {
  const lines = [
    ["ブース", "ログインID", "パスワード"],
    ...rows.map((r) => [r.boothName, r.loginId, r.password]),
  ];
  return `﻿${lines.map((l) => l.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
```

- [ ] **Step 4: 通ることを確認する** — 同じコマンドで PASS
- [ ] **Step 5: コミット** — `Feat: アカウント発行用のパスワード生成とCSVを追加した`

---

### Task 5: ブースの Server Action

**Files:**
- Create: `src/app/actions/manage-booths.ts`
- Test: `src/app/actions/manage-booths.test.ts`

先に `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md` を読む。

**Interfaces:**
- Consumes: `manageRequest`, `failureMessage`（Task 2）、`parseBoothForm`（Task 3）、`BoothResponse`
- Produces:
  - `type ActionState = { error?: string; done?: boolean } | undefined`
  - `saveBooth(current: BoothResponse | undefined, prev: ActionState, formData: FormData): Promise<ActionState>` — `current` があれば PUT、なければ POST。成功で `revalidatePath("/manage/booths")` と `{ done: true }`
  - `deleteBooth(id: number): Promise<{ error?: string }>`
  - 認証切れ（`unauthorized`）は `redirect("/manage/logout")`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`REDIRECT:${p}`);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import type { BoothResponse } from "@/lib/api/booths";
import { deleteBooth, saveBooth } from "./manage-booths";

const form = (name: string) => {
  const f = new FormData();
  f.set("name", name);
  return f;
};

beforeEach(() => {
  manageRequest.mockReset();
  revalidatePath.mockReset();
});

describe("saveBooth", () => {
  it("新規は POST して一覧を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveBooth(undefined, undefined, form("たこ焼き"))).toEqual({ done: true });
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/booths");
    expect(manageRequest.mock.calls[0][1].method).toBe("POST");
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).name).toBe("たこ焼き");
    expect(revalidatePath).toHaveBeenCalledWith("/manage/booths");
  });

  it("編集は PUT /manage/booths/:id", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    await saveBooth({ id: 7, x: 0, y: 0, z: 0 } as BoothResponse, undefined, form("x"));
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/booths/7");
    expect(manageRequest.mock.calls[0][1].method).toBe("PUT");
  });

  it("入力エラーは API を呼ばずに返す", async () => {
    expect(await saveBooth(undefined, undefined, form(""))).toEqual({
      error: "ブース名を入力してください",
    });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("API の失敗は文言にして返す", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await saveBooth(undefined, undefined, form("x"))).toEqual({
      error: "この操作の権限がありません。",
    });
  });

  it("認証切れはログインし直し", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "unauthorized" });
    await expect(saveBooth(undefined, undefined, form("x"))).rejects.toThrow(
      "REDIRECT:/manage/logout",
    );
  });
});

describe("deleteBooth", () => {
  it("DELETE して一覧を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await deleteBooth(3)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/3", { method: "DELETE" });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/booths");
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/app/actions/manage-booths.test.ts` → FAIL

- [ ] **Step 3: 実装する**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { parseBoothForm } from "@/lib/manage/booth-form";

export type ActionState = { error?: string; done?: boolean } | undefined;

export async function saveBooth(
  current: BoothResponse | undefined,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseBoothForm(formData, current);
  if (!parsed.ok) return { error: parsed.error };

  const res = await manageRequest(
    current ? `/manage/booths/${current.id}` : "/manage/booths",
    { method: current ? "PUT" : "POST", body: JSON.stringify(parsed.payload) },
  );
  if (!res.ok) {
    if (res.reason === "unauthorized") redirect("/manage/logout");
    return { error: failureMessage(res.reason) };
  }
  revalidatePath("/manage/booths");
  return { done: true };
}

export async function deleteBooth(id: number): Promise<{ error?: string }> {
  const res = await manageRequest(`/manage/booths/${id}`, { method: "DELETE" });
  if (!res.ok) {
    if (res.reason === "unauthorized") redirect("/manage/logout");
    return { error: failureMessage(res.reason) };
  }
  revalidatePath("/manage/booths");
  return {};
}
```

- [ ] **Step 4: 通ることを確認する** — PASS
- [ ] **Step 5: コミット** — `Feat: ブースの登録・編集・削除のServer Actionを追加した`

---

### Task 6: アカウントの Server Action

**Files:**
- Create: `src/app/actions/manage-accounts.ts`
- Test: `src/app/actions/manage-accounts.test.ts`

**Interfaces:**
- Consumes: `manageRequest`, `failureMessage`、`generatePassword`, `loginIdForBooth`, `boothsWithoutAccount`, `IssuedAccount`（Task 4）、`BoothResponse`, `ManageUser`
- Produces:
  - `type IssueResult = { issued: IssuedAccount[]; failed: string[]; error?: string }`（`failed` はブース名）
  - `issueMissingAccounts(): Promise<IssueResult>` — `/booths` と `/manage/users` を取り、未発行のブースごとに `POST /manage/users`。1 件の失敗で止めない
  - `resetPassword(userId: string): Promise<{ loginId?: string; password?: string; error?: string }>` — `GET /manage/users/:id` で今の値を取り、新しいパスワードで `PUT`
  - `addAccount(prev: AddState, formData: FormData): Promise<AddState>`、`type AddState = { error?: string; issued?: IssuedAccount } | undefined` — フォームの `loginId`, `name`, `role`（`Gakuseikai` か `Admin`）。パスワードは生成して返す
  - 成功時は `revalidatePath("/manage/accounts")`。`unauthorized` は `redirect("/manage/logout")`
  - 乱数は `node:crypto` の `randomInt`

- [ ] **Step 1: 失敗するテストを書く**

```ts
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
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import { addAccount, issueMissingAccounts, resetPassword } from "./manage-accounts";

const ok = (data?: unknown) => ({ ok: true, data });

beforeEach(() => manageRequest.mockReset());

describe("issueMissingAccounts", () => {
  it("未発行のブースだけに作り、1件失敗しても続ける", async () => {
    manageRequest.mockImplementation(async (path: string, init?: RequestInit) => {
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
      if (body.login_id === "booth-2") return { ok: false, reason: "unavailable" };
      return ok();
    });

    const res = await issueMissingAccounts();

    expect(res.failed).toEqual(["焼きそば"]);
    expect(res.issued).toHaveLength(1);
    expect(res.issued[0]).toMatchObject({ boothName: "たこ焼き", loginId: "booth-1" });
    expect(res.issued[0].password).toHaveLength(10);
    const created = JSON.parse(manageRequest.mock.calls.find((c) => c[1]?.method === "POST")[1].body);
    expect(created).toMatchObject({
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
      error: "サーバーに接続できません。時間をおいて再度お試しください。",
    });
  });
});

describe("resetPassword", () => {
  it("今の値を保ったまま新しいパスワードで更新する", async () => {
    manageRequest
      .mockResolvedValueOnce(
        ok({ id: "u1", name: "1-1", login_id: "booth-1", assigned_booth_id: 1, role: "Student" }),
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
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).role).toBe("Gakuseikai");
  });

  it("Student / Member はここでは作らない", async () => {
    expect(await addAccount(undefined, f("x", "Student"))).toEqual({
      error: "ロールを選んでください",
    });
  });

  it("ID が空なら作らない", async () => {
    expect(await addAccount(undefined, f(" ", "Gakuseikai"))).toEqual({
      error: "ログイン ID を入力してください",
    });
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/app/actions/manage-accounts.test.ts` → FAIL

- [ ] **Step 3: 実装する**

```ts
"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, type ManageResult, manageRequest } from "@/lib/api/manage";
import {
  boothsWithoutAccount,
  generatePassword,
  type IssuedAccount,
  loginIdForBooth,
} from "@/lib/manage/accounts";
import type { ManageUser } from "@/lib/manage/roles";

export type IssueResult = { issued: IssuedAccount[]; failed: string[]; error?: string };
export type AddState = { error?: string; issued?: IssuedAccount } | undefined;

const newPassword = () => generatePassword((max) => randomInt(max));

function failed(res: ManageResult<unknown> & { ok: false }): string {
  if (res.reason === "unauthorized") redirect("/manage/logout");
  return failureMessage(res.reason);
}

export async function issueMissingAccounts(): Promise<IssueResult> {
  const booths = await manageRequest<{ booths: BoothResponse[] }>("/booths");
  if (!booths.ok) return { issued: [], failed: [], error: failed(booths) };
  const users = await manageRequest<{ users: ManageUser[] }>("/manage/users");
  if (!users.ok) return { issued: [], failed: [], error: failed(users) };

  const result: IssueResult = { issued: [], failed: [] };
  // 1件ずつ作る。途中で失敗しても残りは続け、失敗したブースを返す
  for (const booth of boothsWithoutAccount(booths.data.booths, users.data.users)) {
    const loginId = loginIdForBooth(booth.id);
    const password = newPassword();
    const res = await manageRequest("/manage/users", {
      method: "POST",
      body: JSON.stringify({
        login_id: loginId,
        name: booth.organizer || booth.name,
        password,
        assigned_booth_id: booth.id,
        role: "Student",
      }),
    });
    if (res.ok) result.issued.push({ boothName: booth.name, loginId, password });
    else {
      if (res.reason === "unauthorized") redirect("/manage/logout");
      result.failed.push(booth.name);
    }
  }
  revalidatePath("/manage/accounts");
  return result;
}

export async function resetPassword(
  userId: string,
): Promise<{ loginId?: string; password?: string; error?: string }> {
  const user = await manageRequest<ManageUser>(`/manage/users/${userId}`);
  if (!user.ok) return { error: failed(user) };

  const password = newPassword();
  const { name, login_id, assigned_booth_id, role } = user.data;
  const res = await manageRequest(`/manage/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify({ name, login_id, assigned_booth_id, role, password }),
  });
  if (!res.ok) return { error: failed(res) };
  return { loginId: login_id, password };
}

const ADDABLE_ROLES = new Set(["Gakuseikai", "Admin"]);

export async function addAccount(_prev: AddState, formData: FormData): Promise<AddState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim() || loginId;
  const role = String(formData.get("role") ?? "");
  if (!loginId) return { error: "ログイン ID を入力してください" };
  if (!ADDABLE_ROLES.has(role)) return { error: "ロールを選んでください" };

  const password = newPassword();
  const res = await manageRequest("/manage/users", {
    method: "POST",
    body: JSON.stringify({ login_id: loginId, name, password, assigned_booth_id: 0, role }),
  });
  if (!res.ok) return { error: failed(res) };
  revalidatePath("/manage/accounts");
  return { issued: { boothName: name, loginId, password } };
}
```

- [ ] **Step 4: 通ることを確認する** — PASS、`npx vitest run --project unit` 全 PASS
- [ ] **Step 5: コミット** — `Feat: アカウントの一括発行・再発行・追加のServer Actionを追加した`

---

### Task 7: ブース管理画面

**Files:**
- Modify: `src/app/manage/(console)/booths/page.tsx`
- Create: `src/app/manage/(console)/booths/BoothList.tsx`, `BoothFormDialog.tsx`, `DeleteBoothButton.tsx`

**Interfaces:**
- Consumes: `requireRole`（Task 2）、`saveBooth`, `deleteBooth`, `ActionState`（Task 5）、`ConsoleMessage`、`BoothResponse`, `ManageUser`, `toCongestionStatus`（`src/lib/api/booths.ts`）

画面の仕様:
- 見出し「ブース管理」と件数、右上（スマホでは下）に「ブースを追加」（白地の主ボタン）
- 一覧: PC（`md` 以上）は表、スマホはカード。列は 名前／主催者／場所／混雑度（来場者画面と同じ色の小さなバッジ）／担当アカウント（あり・なし）／操作（編集・削除）
- 追加・編集はダイアログ。項目: ブース名（必須）・主催者・説明（textarea）・場所・画像 URL・緯度・経度。保存中はボタンを無効化、エラーは入力を残して表示、成功で閉じる
- 削除は確認ダイアログ「『<名前>』を削除しますか？担当アカウントは残ります。」→ 削除。失敗はダイアログ内に表示
- 一覧の取得は `GET /booths`（公開）と `GET /manage/users`（担当の有無）。片方でも失敗したら `ConsoleMessage` で案内

- [ ] **Step 1: shadcn の textarea を追加** — `npx shadcn@latest add textarea`。**`cn` を `"cn"` から import していたら `@/lib/utils` に直し、`package.json` に `cn` が増えていたら戻す**（段階0で起きた）。`npx biome check --write src/components/ui/textarea.tsx`

- [ ] **Step 2: ページ（Server Component）**

```tsx
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, manageRequest, requireRole } from "@/lib/api/manage";
import type { ManageUser } from "@/lib/manage/roles";
import { BoothFormDialog } from "./BoothFormDialog";
import { BoothList } from "./BoothList";

export default async function BoothsPage() {
  const auth = await requireRole(["Admin"]);
  if (!auth.ok) return <ConsoleMessage title="ブース管理">{auth.message}</ConsoleMessage>;

  const [booths, users] = await Promise.all([
    manageRequest<{ booths: BoothResponse[] }>("/booths"),
    manageRequest<{ users: ManageUser[] }>("/manage/users"),
  ]);
  if (!booths.ok || !users.ok) {
    const reason = !booths.ok ? booths.reason : !users.ok ? users.reason : "unavailable";
    return <ConsoleMessage title="ブース管理">{failureMessage(reason)}</ConsoleMessage>;
  }

  const staffed = new Set(
    users.data.users
      .filter((u) => u.role === "Student" && u.assigned_booth_id)
      .map((u) => u.assigned_booth_id),
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-extrabold text-3xl">
          ブース管理 <span className="text-base text-gray-400">{booths.data.booths.length}件</span>
        </h1>
        <BoothFormDialog />
      </div>
      <BoothList booths={booths.data.booths} staffed={[...staffed]} />
    </div>
  );
}
```

（`staffed` は Client Component に渡すため配列にする）

- [ ] **Step 3: `BoothFormDialog.tsx`（Client Component）**

```tsx
"use client";

import { useActionState, useEffect, useState } from "react";
import { type ActionState, saveBooth } from "@/app/actions/manage-booths";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BoothResponse } from "@/lib/api/booths";

const PRIMARY = "h-12 bg-white text-black hover:bg-white/90 font-bold";

/** current があれば編集、無ければ追加 */
export function BoothFormDialog({ current }: { current?: BoothResponse }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          current ? (
            <Button variant="outline" size="sm" />
          ) : (
            <Button className={`${PRIMARY} px-6`} />
          )
        }
      >
        {current ? "編集" : "ブースを追加"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogTitle>{current ? "ブースを編集" : "ブースを追加"}</DialogTitle>
        {/* 開くたびに作り直して、前回の入力やエラーを残さない */}
        {open && <BoothForm current={current} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BoothForm({ current, onDone }: { current?: BoothResponse; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveBooth.bind(null, current),
    undefined,
  );
  useEffect(() => {
    if (state?.done) onDone();
  }, [state, onDone]);

  const coord = (v?: number) => (v ? String(v) : "");
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="ブース名（必須）" name="name" defaultValue={current?.name} required />
      <Field label="主催者" name="organizer" defaultValue={current?.organizer} placeholder="1-1、天文部 など" />
      <div className="flex flex-col gap-1">
        <Label htmlFor="detail">説明</Label>
        <Textarea id="detail" name="detail" defaultValue={current?.detail} rows={3} />
      </div>
      <Field label="場所" name="location" defaultValue={current?.location} placeholder="第一体育館 など" />
      <Field label="画像 URL" name="imageUrl" defaultValue={current?.image_url} placeholder="https://..." />
      <div className="grid grid-cols-2 gap-3">
        <Field label="緯度" name="latitude" defaultValue={coord(current?.latitude)} inputMode="decimal" />
        <Field label="経度" name="longitude" defaultValue={coord(current?.longitude)} inputMode="decimal" />
      </div>
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 font-bold">
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name: string } & React.ComponentProps<"input">) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-10" {...props} />
    </div>
  );
}
```

注意: React 19 はアクション後に uncontrolled フォームを空にする。エラー時に入力が消える場合は、`state` に送信した値を返して `defaultValue` に使う（段階0のログインと同じ対応）。手動確認で必ず見る。

- [ ] **Step 4: `DeleteBoothButton.tsx`（Client Component）**

```tsx
"use client";

import { useState, useTransition } from "react";
import { deleteBooth } from "@/app/actions/manage-booths";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteBoothButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); setError(undefined); }}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-[#e54141]" />}>
        削除
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>「{name}」を削除しますか？</DialogTitle>
        <DialogDescription>担当アカウントは残ります。</DialogDescription>
        {error && <p role="alert" className="text-[#e54141]">{error}</p>}
        <Button
          disabled={pending}
          className="h-12 bg-[#e54141] text-white hover:bg-[#e54141]/90 font-bold"
          onClick={() =>
            start(async () => {
              const res = await deleteBooth(id);
              if (res.error) setError(res.error);
              else setOpen(false);
            })
          }
        >
          {pending ? "削除中…" : "削除する"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 5: `BoothList.tsx`（Client Component）**

```tsx
"use client";

import { type BoothResponse, toCongestionStatus } from "@/lib/api/booths";
import { BoothFormDialog } from "./BoothFormDialog";
import { DeleteBoothButton } from "./DeleteBoothButton";

const CONGESTION = {
  empty: { label: "空き", color: "bg-[#00B894]" },
  clouded: { label: "少し混雑", color: "bg-[#FDCB6E]" },
  veryClouded: { label: "非常に混雑", color: "bg-[#e54141]" },
} as const;

function Congestion({ status }: { status: number }) {
  const c = CONGESTION[toCongestionStatus(status)];
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-bold text-black/70 ${c.color}`}>{c.label}</span>
  );
}

export function BoothList({ booths, staffed }: { booths: BoothResponse[]; staffed: number[] }) {
  if (booths.length === 0) {
    return <p className="text-gray-400">まだブースがありません。「ブースを追加」から登録してください。</p>;
  }
  const hasStaff = (id: number) => staffed.includes(id);
  const actions = (b: BoothResponse) => (
    <div className="flex gap-2">
      <BoothFormDialog current={b} />
      <DeleteBoothButton id={b.id} name={b.name} />
    </div>
  );

  return (
    <>
      {/* PC: 表 */}
      <table className="hidden w-full text-left md:table">
        <thead className="text-gray-400 text-sm">
          <tr className="border-b border-white/10">
            <th className="py-2">名前</th>
            <th>主催者</th>
            <th>場所</th>
            <th>混雑度</th>
            <th>担当</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {booths.map((b) => (
            <tr key={b.id} className="border-b border-white/10">
              <td className="py-3 font-bold">{b.name}</td>
              <td>{b.organizer}</td>
              <td>{b.location}</td>
              <td><Congestion status={b.congestion_status} /></td>
              <td className={hasStaff(b.id) ? "" : "text-gray-500"}>{hasStaff(b.id) ? "あり" : "なし"}</td>
              <td>{actions(b)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* スマホ: カード */}
      <ul className="flex flex-col gap-3 md:hidden">
        {booths.map((b) => (
          <li key={b.id} className="flex flex-col gap-2 rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold">{b.name}</span>
              <Congestion status={b.congestion_status} />
            </div>
            <div className="text-gray-400 text-sm">
              {b.organizer} / {b.location || "場所未設定"} / 担当{hasStaff(b.id) ? "あり" : "なし"}
            </div>
            {actions(b)}
          </li>
        ))}
      </ul>
    </>
  );
}
```

`toCongestionStatus` が `src/lib/api/booths.ts` から export されていることを確認する（段階0時点で export 済み）。

- [ ] **Step 6: 自動チェック** — `npm test`、`npx tsc --noEmit`、`npx biome check src/app/manage src/app/actions src/lib`（新規ファイルにエラーが無いこと）、`npx next build`

- [ ] **Step 7: 手動確認**（ローカルのバックエンド。Chrome がローカル証明書を信頼しないので `npx next dev -p 3001` を `http://127.0.0.1:3001` で開く。確認用の Admin を API で作り、最後に消す）
  - ブースを追加 → 一覧に出る。来場者画面 `/class-booth` にも出る
  - 名前を空にして保存 → エラーが出て入力が残る
  - 緯度に「北」 → エラー
  - 編集 → 値が入った状態で開き、変更が反映される。混雑度は変わらない
  - 削除 → 確認ダイアログ → 消える
  - スマホ幅（390px）でカード表示、ダイアログが画面に収まる
  - Gakuseikai で `/manage/booths` → 権限なし
  - 確認用に作ったブースとユーザーは消す

- [ ] **Step 8: コミット** — `Feat: 管理者のブース管理画面を追加した`

---

### Task 8: アカウント画面

**Files:**
- Modify: `src/app/manage/(console)/accounts/page.tsx`
- Create: `src/app/manage/(console)/accounts/AccountList.tsx`, `IssueAccounts.tsx`, `IssuedTable.tsx`, `AddAccountDialog.tsx`

**Interfaces:**
- Consumes: `requireRole`、`issueMissingAccounts`, `resetPassword`, `addAccount`, `IssueResult`, `AddState`（Task 6）、`boothsWithoutAccount`, `toCsv`, `IssuedAccount`（Task 4）

画面の仕様:
- 見出し「アカウント」
- 「未発行のブース N 件」と「まとめて発行」（主ボタン。0 件なら無効）。押すと確認なしで発行し、結果を `IssuedTable` で表示
- `IssuedTable`: 「このパスワードはこの画面でしか見られません。印刷か CSV で保存してください。」の注意、表（ブース・ログインID・パスワード、パスワードは等幅フォント）、「印刷」（`window.print()`）と「CSV を保存」（`toCsv` を Blob にしてダウンロード、ファイル名 `accounts-YYYYMMDD-HHmm.csv`）。失敗したブースがあれば「発行できなかったブース: …」を赤で表示
- 印刷時は `IssuedTable` 以外を隠し、白地に黒文字にする（`print:` バリアント。ヘッダーとページの他の要素に `print:hidden`）
- アカウント一覧: ブースの担当（Student）を担当ブース名つきで、その下に学生会・管理者を並べる。担当ブースが削除されたもの（`assigned_booth_id` が 0 か存在しない ID）は「担当ブースなし」。各行に「パスワード再発行」→ 確認ダイアログ → 新しいパスワードを `IssuedTable`（1 行）で表示
- 「アカウントを追加」ダイアログ: ログイン ID・名前・ロール（学生会／管理者の 2 択、ラジオ）→ 作成後に `IssuedTable` で表示

- [ ] **Step 1: ページ（Server Component）** — `requireRole(["Admin"])`、`/booths` と `/manage/users` を取得（失敗は `ConsoleMessage`）、`boothsWithoutAccount` で件数を出し、`IssueAccounts`（件数を渡す）・`AddAccountDialog`・`AccountList`（`users` とブース名の `Record<number, string>` を渡す）を並べる。ヘッダー（`ConsoleHeader`）に `print:hidden` を足す

- [ ] **Step 2: `IssuedTable.tsx`**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { type IssuedAccount, toCsv } from "@/lib/manage/accounts";

function download(rows: IssuedAccount[]) {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const name = `accounts-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`;
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function IssuedTable({ rows, failed = [] }: { rows: IssuedAccount[]; failed?: string[] }) {
  return (
    <section className="issued flex flex-col gap-3 rounded-lg border border-[#FDCB6E] p-4 print:border-0 print:bg-white print:text-black">
      <p className="font-bold text-[#FDCB6E] print:hidden">
        このパスワードはこの画面でしか見られません。印刷か CSV で保存してください。
      </p>
      {rows.length > 0 && (
        <table className="w-full text-left">
          <thead className="text-sm text-gray-400 print:text-black">
            <tr><th className="py-1">ブース</th><th>ログインID</th><th>パスワード</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.loginId} className="border-t border-white/10 print:border-black/20">
                <td className="py-2">{r.boothName}</td>
                <td className="font-mono">{r.loginId}</td>
                <td className="font-mono text-lg">{r.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {failed.length > 0 && (
        <p className="text-[#e54141]">発行できなかったブース: {failed.join("、")}（もう一度「まとめて発行」を押すと再試行します）</p>
      )}
      {rows.length > 0 && (
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" onClick={() => window.print()}>印刷</Button>
          <Button variant="outline" onClick={() => download(rows)}>CSV を保存</Button>
        </div>
      )}
    </section>
  );
}
```

印刷時に他を隠すため、`globals.css` に追加:

```css
@media print {
  body:has(.issued) * { visibility: hidden; }
  body:has(.issued) .issued, body:has(.issued) .issued * { visibility: visible; }
  body:has(.issued) .issued { position: absolute; inset: 0 auto auto 0; width: 100%; }
}
```

- [ ] **Step 3: `IssueAccounts.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { type IssueResult, issueMissingAccounts } from "@/app/actions/manage-accounts";
import { Button } from "@/components/ui/button";
import { IssuedTable } from "./IssuedTable";

export function IssueAccounts({ missing }: { missing: number }) {
  const [result, setResult] = useState<IssueResult>();
  const [pending, start] = useTransition();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-4">
        <span>未発行のブース <b className="text-2xl">{missing}</b> 件</span>
        <Button
          disabled={pending || missing === 0}
          className="h-14 px-6 bg-white text-black hover:bg-white/90 font-bold"
          onClick={() => start(async () => setResult(await issueMissingAccounts()))}
        >
          {pending ? "発行中…" : "まとめて発行"}
        </Button>
      </div>
      {result?.error && <p role="alert" className="text-[#e54141]">{result.error}</p>}
      {result && !result.error && <IssuedTable rows={result.issued} failed={result.failed} />}
    </section>
  );
}
```

- [ ] **Step 4: `AccountList.tsx`** — `users` を「ブースの担当（Student）」「学生会・管理者」「その他（Member）」に分けて表示。Student は担当ブース名（無ければ「担当ブースなし」）、ログインID、「パスワード再発行」ボタン。ボタンは確認ダイアログ（「<ログインID> のパスワードを再発行しますか？今のパスワードは使えなくなります。」）→ `resetPassword(id)` → 成功で `IssuedTable rows={[{ boothName: 担当ブース名か名前, loginId, password }]}` をダイアログ内に表示、失敗はエラー文言。`DeleteBoothButton` と同じく `useTransition` で呼ぶ

- [ ] **Step 5: `AddAccountDialog.tsx`** — `useActionState(addAccount)`。項目: ログイン ID（必須）、名前、ロール（`<input type="radio" name="role" value="Gakuseikai" defaultChecked>` 学生会 / `value="Admin"` 管理者）。成功したらフォームの代わりに `IssuedTable rows={[state.issued]}` を表示し、「閉じる」で閉じる。開くたびにフォームを作り直す（`BoothFormDialog` と同じく `{open && <Form/>}`）

- [ ] **Step 6: 自動チェック** — Task 7 Step 6 と同じ

- [ ] **Step 7: 手動確認**（Task 7 と同じ環境）
  - ブースを 3 件用意し、1 件だけ担当アカウントを先に作る → 「未発行 2 件」
  - まとめて発行 → 2 件の ID とパスワードが表示 → **そのパスワードで `/manage/login` にログインでき、自分のブースに振り分けられる**
  - もう一度開くと「未発行 0 件」でボタン無効
  - CSV を保存 → Excel / Numbers で日本語が化けない
  - 印刷プレビュー → 表だけが白地で出る
  - パスワード再発行 → 新しいパスワードでログインでき、古いものではログインできない
  - アカウントを追加（学生会）→ そのパスワードでログインすると `/manage/ops` に振り分けられる
  - 担当ブースを削除 → 一覧で「担当ブースなし」になり、未発行の数には入らない
  - スマホ幅で崩れない
  - 確認用のデータは消す

- [ ] **Step 8: コミット** — `Feat: 管理者のアカウント発行画面を追加した`

---

### Task 9: PR を出す

- [ ] **Step 1: 最終レビュー**（executing-plans の手順どおり、全体を新しいレビュアーに見せてから）
- [ ] **Step 2: バックエンドの PR** — `feature/user-update-password` を push し、`gh pr create --base develop`。タイトル「ユーザー更新でパスワードを平文のまま保存していた問題を直した」。本文に、何が起きていたか（更新後にログインできない、平文で保存）、直し方（空なら保持、あればハッシュ化）、テスト（ユニット・e2e）を書き、末尾に `🤖 Generated with [Claude Code](https://claude.com/claude-code)`
- [ ] **Step 3: フロントの PR** — `feature/manage-admin` を push し、`gh pr create --base develop`。タイトル「管理者のブース管理とアカウント発行」。本文に画面の内容、テスト、手動確認、バックエンド PR と合わせてマージすること、を書く
- [ ] **Step 4: PR の URL を本人に伝える**
