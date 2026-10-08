# 管理コンソール 段階0（土台） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/manage` 以下にログインとロールごとの振り分けを作り、段階1〜3の画面を載せる土台を用意する。

**Architecture:** ログインは Server Action が `POST /auth/login` を呼び、JWT を httpOnly Cookie（path `/manage`）に保存する。管理画面の API 呼び出しはすべてサーバー側の `manageRequest` を通し、Cookie の JWT を `Authorization` に付ける。`src/proxy.ts` は Cookie の有無だけでログイン画面へ振り分け、権限の判断はバックエンドに任せる。

**Tech Stack:** Next.js 16（App Router, Server Actions, proxy）、React 19、Tailwind 4、shadcn/ui（base-nova）、vitest（`unit` プロジェクト、node 環境）、Go/Echo（バックエンド）

**Spec:** `docs/superpowers/specs/2026-10-05-manage-console-design.md`（§2, §4, §5, §9）

## Global Constraints

- フロントの Next.js は破壊的変更を含むバージョン。コードを書く前に `node_modules/next/dist/docs/` の該当ページを読む（`AGENTS.md`）。middleware は `proxy` に改名済み
- API はブラウザから直接呼ばない。すべて Server Component / Server Action / Route Handler から呼ぶ（mixed content 回避）
- Cookie 名 `kct_manage_token`、`httpOnly`, `secure`, `sameSite: "lax"`, `path: "/manage"`, 有効期限 72 時間（JWT と同じ）
- JWT をフロントで検証・解読しない。ロールは `GET /auth/me` の結果で判定する
- ロールの振り分け: Admin → `/manage/booths`、Gakuseikai → `/manage/ops`、Student → `/manage/my-booth`、Member → 「管理画面の権限がありません」
- UI は来場者画面に合わせる: 黒背景・白文字、Zen Kaku Gothic New、見出し `font-extrabold`。押すボタンの高さは 56px 以上（`h-14`）
- API が止まっていても 500 にせず「サーバーに接続できません。時間をおいて再度お試しください」と表示する
- コメントとコミットメッセージは日本語。コミットは既存の形式（`Feat:` / `Fix:` / `Test:` / `Docs:`）に合わせ、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- フロントは `npm test`（vitest unit）と `npm run lint`（biome）が通ること。バックエンドは `go test ./...` が通ること
- ブランチ: フロント `feature/manage-foundation`（作成済み）、バックエンド `feature/manage-auth-fix`（`develop` から作る）

## Review Focus

1. パスワード違い → 「ID かパスワードが違います」と出て Cookie は保存されない（Task 4 のテスト）
2. ログイン時にバックエンドが止まっている → 例外で落ちず「サーバーに接続できません」（Task 4 のテスト）
3. Cookie はあるが期限切れ・不正な JWT → 401 → Cookie を消してログイン画面へ。ループしない（Task 3 のテスト + Task 6 の手動確認）
4. Member でログイン → 権限なしの表示とログアウトボタン。リダイレクトのループにならない（Task 2 のテスト + Task 6 の手動確認）
5. Cookie が無い状態で `/manage/login` と `/manage/logout` を開く → ログイン画面に飛ばすループにならない（Task 5 のテスト）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `KCTFestNav-Backend/internal/usecase/user_usecase.go` | `GetByID` に Admin チェックを追加 |
| `KCTFestNav-Backend/internal/usecase/user_usecase_test.go` | 上のテスト |
| `KCTFestNav-Backend/docs/permissions.md` | 権限表を実装に合わせる |
| `src/lib/manage/roles.ts` | ロールの型、ログイン後の行き先、メニュー |
| `src/lib/manage/session.ts` | Cookie 名と有効期限の定数（proxy からも使うので next/headers を import しない） |
| `src/lib/manage/cookie.ts` | Cookie の保存・削除（サーバー専用） |
| `src/lib/manage/proxy-rules.ts` | ログイン画面へ飛ばすかの判定（純粋関数） |
| `src/lib/api/client.ts` | `API_BASE_URL` を export する |
| `src/lib/api/manage.ts` | JWT 付きで API を呼ぶ `manageRequest` |
| `src/app/actions/auth.ts` | `loginAction` / `logoutAction` |
| `src/proxy.ts` | `/manage/*` の振り分け |
| `src/app/manage/login/page.tsx`, `LoginForm.tsx` | ログイン画面 |
| `src/app/manage/logout/route.ts` | Cookie を消してログイン画面へ（Server Component からの 401 用） |
| `src/app/manage/(console)/layout.tsx` | ログイン後の共通レイアウト |
| `src/app/manage/(console)/page.tsx` | ロールごとの振り分け |
| `src/app/manage/(console)/{booths,accounts,ops,my-booth}/page.tsx` | 段階0では「準備中」 |
| `src/components/manage/ConsoleHeader.tsx` | ユーザー名・メニュー・ログアウト |
| `src/components/manage/ConsoleMessage.tsx` | 準備中・権限なし・接続できない、の表示 |

---

### Task 1: バックエンド — `GetByID` の Admin チェック

**Files:**
- Modify: `KCTFestNav-Backend/internal/usecase/user_usecase.go`（`GetByID`）
- Modify: `KCTFestNav-Backend/internal/usecase/user_usecase_test.go`（`TestUserUsecase_GetByID`）
- Modify: `KCTFestNav-Backend/docs/permissions.md`

**Interfaces:**
- Produces: `GET /manage/users/:id` は Admin 以外に 403（`usecase.ErrForbidden`）を返す

- [ ] **Step 1: ブランチを作る**

```bash
cd KCTFestNav-Backend
git checkout develop && git checkout -b feature/manage-auth-fix
```

- [ ] **Step 2: 失敗するテストを書く**

`TestUserUsecase_GetByID` の既存 2 ケースは `context.Background()` で呼んでいる。Admin の ctx で呼ぶように直し、拒否のケースを足す。

```go
func TestUserUsecase_GetByID(t *testing.T) {
	adminCtx := context.WithValue(context.Background(), usecase.ContextRequestUserKey,
		usecase.RequestUser{ID: uuid.New(), Role: domain.RoleAdmin})

	t.Run("正常系: リポジトリからユーザーを取得できること", func(t *testing.T) {
		targetID := uuid.New()
		dummyUser, _ := domain.ReconstructUser(targetID, domain.UserParams{
			Name:            "テスト",
			LoginID:         "test",
			Password:        []byte("hash"),
			AssignedBoothID: 1,
			Role:            domain.RoleStudent,
		})

		mockRepo := &mockUserRepository{
			mockGetByID: func(ctx context.Context, id uuid.UUID) (*domain.User, error) {
				assert.Equal(t, targetID, id)
				return dummyUser, nil
			},
		}
		uc := usecase.NewUserUsecase(mockRepo)

		user, err := uc.GetByID(adminCtx, targetID)
		assert.NoError(t, err)
		assert.Equal(t, dummyUser, user)
	})

	t.Run("異常系: リポジトリがエラーを返した場合はそのままエラーを返すこと", func(t *testing.T) {
		targetID := uuid.New()
		mockRepo := &mockUserRepository{
			mockGetByID: func(ctx context.Context, id uuid.UUID) (*domain.User, error) {
				return nil, errors.New("db error")
			},
		}
		uc := usecase.NewUserUsecase(mockRepo)

		user, err := uc.GetByID(adminCtx, targetID)
		assert.Error(t, err)
		assert.Nil(t, user)
	})

	t.Run("異常系: Admin以外は取得できないこと", func(t *testing.T) {
		for _, role := range []domain.Role{domain.RoleGakuseikai, domain.RoleStudent, domain.RoleMember} {
			called := false
			mockRepo := &mockUserRepository{
				mockGetByID: func(ctx context.Context, id uuid.UUID) (*domain.User, error) {
					called = true
					return nil, nil
				},
			}
			uc := usecase.NewUserUsecase(mockRepo)
			ctx := context.WithValue(context.Background(), usecase.ContextRequestUserKey,
				usecase.RequestUser{ID: uuid.New(), Role: role})

			user, err := uc.GetByID(ctx, uuid.New())
			assert.ErrorIs(t, err, usecase.ErrForbidden, role)
			assert.Nil(t, user)
			assert.False(t, called, "権限が無いときはリポジトリを呼ばない")
		}
	})

	t.Run("異常系: ログイン情報が無いときは取得できないこと", func(t *testing.T) {
		uc := usecase.NewUserUsecase(&mockUserRepository{})
		user, err := uc.GetByID(context.Background(), uuid.New())
		assert.ErrorIs(t, err, usecase.ErrForbidden)
		assert.Nil(t, user)
	})
}
```

- [ ] **Step 3: 失敗を確認する**

Run: `go test ./internal/usecase/ -run TestUserUsecase_GetByID -v`
Expected: 「Admin以外は取得できないこと」「ログイン情報が無いときは」が FAIL（err が nil）

- [ ] **Step 4: 実装する**

```go
func (uu *UserUsecase) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	reqUser, ok := ctx.Value(ContextRequestUserKey).(RequestUser)
	if !ok || reqUser.Role != domain.RoleAdmin {
		return nil, ErrForbidden
	}

	user, err := uu.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return user, nil
}
```

- [ ] **Step 5: テストが通ることを確認する**

Run: `go test ./internal/usecase/ -run TestUserUsecase_GetByID -v` → PASS
Run: `go test ./...` → PASS（e2e は DB 未起動だと黙ってスキップされる点に注意。DB を起動して `go test -v -count=1 ./internal/handler/ -run E2E` も確認し、ユーザー取得の e2e が Admin トークンで呼んでいるかを見る。Admin 以外で呼んでいて落ちる場合は、そのテストを Admin で呼ぶよう直す）

- [ ] **Step 6: `docs/permissions.md` を直す**

ユーザーの行を次に置き換え、表の下の「(*1) ユーザーリソースの作成・取得についてのご注意」の段落を削除する。

```markdown
| **ユーザー (User)** | ログイン (`POST`) | ◯ | ◯ | ◯ | ◯ | ◯ | |
| | 自身の情報取得 (`GET`) | ◯ | ◯ | ◯ | ◯ | ❌ | JWTトークン必須 |
| | 一覧/詳細取得 (`GET`) | ◯ | ❌ | ❌ | ❌ | ❌ | |
| | 作成 (`POST`) | ◯ | ❌ | ❌ | ❌ | ❌ | |
| | 更新 (`PUT`) | ◯ | ❌ | ❌ | ❌ | ❌ | |
| | 削除 (`DELETE`) | ◯ | ❌ | ❌ | ❌ | ❌ | |
```

- [ ] **Step 7: コミット**

```bash
git add internal/usecase/user_usecase.go internal/usecase/user_usecase_test.go docs/permissions.md
git commit -m "Fix: ユーザーの個別取得をAdminに限定した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: ロールと行き先

**Files:**
- Create: `src/lib/manage/roles.ts`
- Test: `src/lib/manage/roles.test.ts`

**Interfaces:**
- Produces:
  - `type Role = "Admin" | "Gakuseikai" | "Student" | "Member"`
  - `type ManageUser = { id: string; name: string; login_id: string; assigned_booth_id: number; role: Role }`（`GET /auth/me` の応答そのまま）
  - `type MenuItem = { href: string; label: string }`
  - `homePathFor(role: Role): string | null`
  - `menuFor(role: Role): MenuItem[]`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { homePathFor, menuFor } from "./roles";

describe("homePathFor", () => {
  it("ロールごとにログイン後の画面を返す", () => {
    expect(homePathFor("Admin")).toBe("/manage/booths");
    expect(homePathFor("Gakuseikai")).toBe("/manage/ops");
    expect(homePathFor("Student")).toBe("/manage/my-booth");
  });

  it("Member は管理画面を使えないので null", () => {
    expect(homePathFor("Member")).toBeNull();
  });
});

describe("menuFor", () => {
  it("Admin は全画面", () => {
    expect(menuFor("Admin").map((m) => m.href)).toEqual([
      "/manage/booths",
      "/manage/accounts",
      "/manage/ops",
    ]);
  });

  it("Gakuseikai は当日運営だけ", () => {
    expect(menuFor("Gakuseikai").map((m) => m.href)).toEqual(["/manage/ops"]);
  });

  it("Student と Member にはメニューを出さない", () => {
    expect(menuFor("Student")).toEqual([]);
    expect(menuFor("Member")).toEqual([]);
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run --project unit src/lib/manage/roles.test.ts`
Expected: FAIL（`./roles` が無い）

- [ ] **Step 3: 実装する**

```ts
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

const BOOTHS: MenuItem = { href: "/manage/booths", label: "ブース" };
const ACCOUNTS: MenuItem = { href: "/manage/accounts", label: "アカウント" };
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
```

- [ ] **Step 4: 通ることを確認する**

Run: `npx vitest run --project unit src/lib/manage/roles.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/manage/roles.ts src/lib/manage/roles.test.ts
git commit -m "Feat: 管理画面のロールごとの行き先とメニューを定義した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: JWT 付きで API を呼ぶ `manageRequest`

**Files:**
- Create: `src/lib/manage/session.ts`
- Modify: `src/lib/api/client.ts`（`API_BASE_URL` を export）
- Create: `src/lib/api/manage.ts`
- Test: `src/lib/api/manage.test.ts`

**Interfaces:**
- Produces:
  - `session.ts`: `TOKEN_COOKIE = "kct_manage_token"`, `TOKEN_MAX_AGE = 259200`（秒）
  - `client.ts`: `export const API_BASE_URL`
  - `manage.ts`:
    - `type ManageFailure = "unauthorized" | "forbidden" | "rejected" | "unavailable"`
    - `type ManageResult<T> = { ok: true; data: T } | { ok: false; reason: ManageFailure }`
    - `toFailure(status: number): ManageFailure`
    - `manageRequest<T>(path: string, init?: RequestInit): Promise<ManageResult<T>>`
    - `failureMessage(reason: ManageFailure): string`

`manageRequest` は redirect しない（呼び出し側の try/catch に NEXT_REDIRECT が飲まれるのを避けるため）。401 のときは呼び出し側が `redirect("/manage/logout")` する。

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieValue = vi.hoisted(() => ({ token: "jwt-token" as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "kct_manage_token" && cookieValue.token
        ? { name, value: cookieValue.token }
        : undefined,
  }),
}));

import { failureMessage, manageRequest, toFailure } from "./manage";

const fetchMock = vi.fn();

beforeEach(() => {
  cookieValue.token = "jwt-token";
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("toFailure", () => {
  it("ステータスを失敗の種類に分ける", () => {
    expect(toFailure(401)).toBe("unauthorized");
    expect(toFailure(403)).toBe("forbidden");
    expect(toFailure(400)).toBe("rejected");
    expect(toFailure(404)).toBe("rejected");
    expect(toFailure(500)).toBe("unavailable");
  });
});

describe("manageRequest", () => {
  it("Cookie の JWT を Authorization に付け、キャッシュしない", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ name: "管理者" }), { status: 200 }));

    const res = await manageRequest<{ name: string }>("/auth/me");

    expect(res).toEqual({ ok: true, data: { name: "管理者" } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/me$/);
    expect(init.headers.Authorization).toBe("Bearer jwt-token");
    expect(init.cache).toBe("no-store");
  });

  it("本文の無い 204 は data を undefined にする", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect(await manageRequest("/manage/booths/1", { method: "DELETE" })).toEqual({
      ok: true,
      data: undefined,
    });
  });

  it("Cookie が無いときは API を呼ばずに unauthorized", async () => {
    cookieValue.token = undefined;
    expect(await manageRequest("/auth/me")).toEqual({ ok: false, reason: "unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("401（期限切れ・不正なトークン）は unauthorized", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await manageRequest("/auth/me")).toEqual({ ok: false, reason: "unauthorized" });
  });

  it("403 は forbidden", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 403 }));
    expect(await manageRequest("/manage/users")).toEqual({ ok: false, reason: "forbidden" });
  });

  it("接続できないときは例外にせず unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await manageRequest("/auth/me")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("failureMessage", () => {
  it("API が止まっているときの文言は来場者画面と同じ方針", () => {
    expect(failureMessage("unavailable")).toBe(
      "サーバーに接続できません。時間をおいて再度お試しください。",
    );
    expect(failureMessage("forbidden")).toBe("この操作の権限がありません。");
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run --project unit src/lib/api/manage.test.ts`
Expected: FAIL（`./manage` が無い）

- [ ] **Step 3: 実装する**

`src/lib/manage/session.ts`:

```ts
// 管理画面のログイン Cookie。proxy からも読むため next/headers に依存させない
export const TOKEN_COOKIE = "kct_manage_token";
/** バックエンドの JWT と同じ 72 時間 */
export const TOKEN_MAX_AGE = 60 * 60 * 72;
```

`src/lib/api/client.ts` の定義に `export` を付ける:

```ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:1323";
```

`src/lib/api/manage.ts`:

```ts
// 管理画面から KCTFestNav-Backend を呼ぶ。サーバー側(Server Component / Server Action)専用。
// ログイン Cookie の JWT を Authorization に付ける。
//
// redirect はここではしない。呼び出し側が try/catch で包むと NEXT_REDIRECT を
// 飲み込んでしまうため、失敗の種類を返して呼び出し側で判断する。
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/manage/session";
import { API_BASE_URL } from "./client";

export type ManageFailure = "unauthorized" | "forbidden" | "rejected" | "unavailable";

export type ManageResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: ManageFailure };

export function toFailure(status: number): ManageFailure {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status >= 400 && status < 500) return "rejected";
  return "unavailable";
}

export async function manageRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<ManageResult<T>> {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) return { ok: false, reason: "unauthorized" };

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      // 管理画面は常に最新の値を見せる
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (e) {
    console.error(`${init?.method ?? "GET"} ${path} に接続できませんでした`, e);
    return { ok: false, reason: "unavailable" };
  }

  if (!res.ok) return { ok: false, reason: toFailure(res.status) };
  // 更新・削除の API は本文を返さない
  const data = res.status === 204 ? undefined : await res.json();
  return { ok: true, data: data as T };
}

export function failureMessage(reason: ManageFailure): string {
  switch (reason) {
    case "unauthorized":
      return "ログインの有効期限が切れました。もう一度ログインしてください。";
    case "forbidden":
      return "この操作の権限がありません。";
    case "rejected":
      return "入力内容を確認してください。";
    default:
      return "サーバーに接続できません。時間をおいて再度お試しください。";
  }
}
```

- [ ] **Step 4: 通ることを確認する**

Run: `npx vitest run --project unit src/lib/api/manage.test.ts` → PASS
Run: `npm test` → 既存の `booths.test.ts` も含めて PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/manage/session.ts src/lib/api/client.ts src/lib/api/manage.ts src/lib/api/manage.test.ts
git commit -m "Feat: 管理画面からJWT付きでAPIを呼ぶmanageRequestを追加した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: ログイン・ログアウト（Server Action と Cookie）

**Files:**
- Create: `src/lib/manage/cookie.ts`
- Modify: `src/app/actions/auth.ts`（今は空の `loginAction` のみ）
- Create: `src/app/manage/logout/route.ts`
- Test: `src/app/actions/auth.test.ts`

先に `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` と `01-app/01-getting-started/07-mutating-data.md`、`01-app/01-getting-started/15-route-handlers.md` を読む。Cookie の書き換えは Server Action と Route Handler でしかできない。

**Interfaces:**
- Consumes: `API_BASE_URL`（Task 3）、`TOKEN_COOKIE`, `TOKEN_MAX_AGE`（Task 3）
- Produces:
  - `cookie.ts`: `saveToken(token: string): Promise<void>`, `clearToken(): Promise<void>`
  - `auth.ts`: `type LoginState = { error: string } | undefined`, `loginAction(prev: LoginState, formData: FormData): Promise<LoginState>`（成功時は `/manage` へ redirect）, `logoutAction(): Promise<void>`
  - `GET /manage/logout`: Cookie を消して `/manage/login` へ。Server Component が 401 を受けたときにここへ redirect する
  - フォームの name は `loginId` と `password`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieSet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: async () => ({ set: cookieSet }) }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

import { loginAction, logoutAction } from "./auth";

const fetchMock = vi.fn();
const form = (loginId: string, password: string) => {
  const fd = new FormData();
  fd.set("loginId", loginId);
  fd.set("password", password);
  return fd;
};

beforeEach(() => {
  cookieSet.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("loginAction", () => {
  it("成功したら JWT を Cookie に保存して /manage へ", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ token: "jwt" }), { status: 200 }));

    await expect(loginAction(undefined, form("booth-1", "pass"))).rejects.toThrow(
      "REDIRECT:/manage",
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/auth\/login$/);
    expect(JSON.parse(init.body)).toEqual({ login_id: "booth-1", password: "pass" });
    expect(cookieSet).toHaveBeenCalledWith("kct_manage_token", "jwt", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/manage",
      maxAge: 60 * 60 * 72,
    });
  });

  it("ID の前後の空白は取り除く", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ token: "jwt" }), { status: 200 }));
    await expect(loginAction(undefined, form("  booth-1 ", "pass"))).rejects.toThrow();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).login_id).toBe("booth-1");
  });

  it("パスワード違い(401)はエラー文言を返し、Cookie は保存しない", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    expect(await loginAction(undefined, form("booth-1", "wrong"))).toEqual({
      error: "ID かパスワードが違います",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });

  it("未入力なら API を呼ばない", async () => {
    expect(await loginAction(undefined, form("", ""))).toEqual({
      error: "ID とパスワードを入力してください",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("バックエンドが止まっていても例外にしない", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    expect(await loginAction(undefined, form("booth-1", "pass"))).toEqual({
      error: "サーバーに接続できません。時間をおいて再度お試しください。",
    });
    expect(cookieSet).not.toHaveBeenCalled();
  });
});

describe("logoutAction", () => {
  it("Cookie を消してログイン画面へ", async () => {
    await expect(logoutAction()).rejects.toThrow("REDIRECT:/manage/login");
    expect(cookieSet).toHaveBeenCalledWith("kct_manage_token", "", {
      path: "/manage",
      maxAge: 0,
    });
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run --project unit src/app/actions/auth.test.ts`
Expected: FAIL（`loginAction` が何も返さない / `logoutAction` が無い）

- [ ] **Step 3: 実装する**

`src/lib/manage/cookie.ts`:

```ts
// ログイン Cookie の保存と削除。Server Action と Route Handler からだけ呼べる
import { cookies } from "next/headers";
import { TOKEN_COOKIE, TOKEN_MAX_AGE } from "./session";

export async function saveToken(token: string): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/manage",
    maxAge: TOKEN_MAX_AGE,
  });
}

// delete() は path を指定できないため、同じ path で期限切れにして消す
export async function clearToken(): Promise<void> {
  (await cookies()).set(TOKEN_COOKIE, "", { path: "/manage", maxAge: 0 });
}
```

`src/app/actions/auth.ts`（全体を置き換える）:

```ts
"use server";

import { redirect } from "next/navigation";
import { API_BASE_URL } from "@/lib/api/client";
import { failureMessage } from "@/lib/api/manage";
import { clearToken, saveToken } from "@/lib/manage/cookie";

export type LoginState = { error: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) {
    return { error: "ID とパスワードを入力してください" };
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login_id: loginId, password }),
      cache: "no-store",
    });
  } catch (e) {
    console.error("ログインAPIに接続できませんでした", e);
    return { error: failureMessage("unavailable") };
  }

  if (res.status === 401) return { error: "ID かパスワードが違います" };
  if (!res.ok) return { error: failureMessage("unavailable") };

  const { token } = (await res.json()) as { token: string };
  await saveToken(token);
  redirect("/manage");
}

export async function logoutAction(): Promise<void> {
  await clearToken();
  redirect("/manage/login");
}
```

`src/app/manage/logout/route.ts`:

```ts
// Server Component は Cookie を消せないため、401 を受けたらここへ redirect する
import { redirect } from "next/navigation";
import { clearToken } from "@/lib/manage/cookie";

export async function GET() {
  await clearToken();
  redirect("/manage/login");
}
```

- [ ] **Step 4: 通ることを確認する**

Run: `npx vitest run --project unit src/app/actions/auth.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/manage/cookie.ts src/app/actions/auth.ts src/app/actions/auth.test.ts src/app/manage/logout/route.ts
git commit -m "Feat: 管理画面のログインとログアウトを実装した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: proxy による振り分け

**Files:**
- Create: `src/lib/manage/proxy-rules.ts`
- Test: `src/lib/manage/proxy-rules.test.ts`
- Create: `src/proxy.ts`

先に `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` と `01-app/03-api-reference/03-file-conventions/proxy.md` を読む（`src/` を使っているので `src/proxy.ts` に置く）。

**Interfaces:**
- Consumes: `TOKEN_COOKIE`（Task 3）
- Produces: `needsLogin(pathname: string, hasToken: boolean): boolean`

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { needsLogin } from "./proxy-rules";

describe("needsLogin", () => {
  it("Cookie が無ければ管理画面からログイン画面へ飛ばす", () => {
    expect(needsLogin("/manage", false)).toBe(true);
    expect(needsLogin("/manage/booths", false)).toBe(true);
  });

  it("ログイン画面とログアウトは飛ばさない（ループ防止）", () => {
    expect(needsLogin("/manage/login", false)).toBe(false);
    expect(needsLogin("/manage/logout", false)).toBe(false);
  });

  it("Cookie があれば通す（中身の正しさはバックエンドが判断する）", () => {
    expect(needsLogin("/manage/booths", true)).toBe(false);
  });
});
```

- [ ] **Step 2: 失敗を確認する**

Run: `npx vitest run --project unit src/lib/manage/proxy-rules.test.ts` → FAIL

- [ ] **Step 3: 実装する**

`src/lib/manage/proxy-rules.ts`:

```ts
const PUBLIC_PATHS = new Set(["/manage/login", "/manage/logout"]);

/** ログイン Cookie が無いときにログイン画面へ飛ばすか。権限の判断はしない */
export function needsLogin(pathname: string, hasToken: boolean): boolean {
  return !hasToken && !PUBLIC_PATHS.has(pathname);
}
```

`src/proxy.ts`:

```ts
// 管理画面の振り分け。Cookie の有無だけを見る。
// 権限の判断はバックエンドが行う(proxy で重い認可をしないのは Next.js の推奨どおり)
import { type NextRequest, NextResponse } from "next/server";
import { needsLogin } from "@/lib/manage/proxy-rules";
import { TOKEN_COOKIE } from "@/lib/manage/session";

export function proxy(request: NextRequest) {
  const hasToken = request.cookies.has(TOKEN_COOKIE);
  if (needsLogin(request.nextUrl.pathname, hasToken)) {
    return NextResponse.redirect(new URL("/manage/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/manage/:path*",
};
```

- [ ] **Step 4: 通ることを確認する**

Run: `npx vitest run --project unit src/lib/manage/proxy-rules.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/manage/proxy-rules.ts src/lib/manage/proxy-rules.test.ts src/proxy.ts
git commit -m "Feat: 未ログインで管理画面を開いたらログイン画面へ振り分けるようにした

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 画面（ログイン・共通レイアウト・振り分け・準備中）と手動確認

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/label.tsx`（shadcn から追加）
- Create: `src/components/manage/ConsoleMessage.tsx`
- Create: `src/components/manage/ConsoleHeader.tsx`
- Create: `src/app/manage/login/page.tsx`, `src/app/manage/login/LoginForm.tsx`
- Create: `src/app/manage/(console)/layout.tsx`
- Create: `src/app/manage/(console)/page.tsx`
- Create: `src/app/manage/(console)/booths/page.tsx`, `accounts/page.tsx`, `ops/page.tsx`, `my-booth/page.tsx`

先に `01-app/01-getting-started/03-layouts-and-pages.md`、`02-project-structure.md`（Route Groups）、`07-mutating-data.md`（`useActionState`）を読む。

**Interfaces:**
- Consumes: `manageRequest`, `failureMessage`（Task 3）、`ManageUser`, `homePathFor`, `menuFor`, `MenuItem`（Task 2）、`loginAction`, `logoutAction`, `LoginState`（Task 4）
- Produces:
  - `ConsoleMessage({ title, children }: { title: string; children?: React.ReactNode })`
  - 段階1〜3はこの `(console)` グループの下にページを置き、レイアウトのヘッダーと認証をそのまま使う

- [ ] **Step 1: shadcn の入力部品を追加する**

Run: `npx shadcn@latest add input label`
Expected: `src/components/ui/input.tsx` と `label.tsx` ができる。`npm run lint` が通ることを確認（通らなければ `npm run format`）

- [ ] **Step 2: 共通の表示部品を作る**

`src/components/manage/ConsoleMessage.tsx`:

```tsx
/** 管理画面の中央に出す案内(準備中・権限なし・接続できない) */
export function ConsoleMessage({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 mt-16 px-4 text-center">
      <h1 className="font-extrabold text-3xl">{title}</h1>
      {children && <div className="text-gray-400">{children}</div>}
    </div>
  );
}
```

`src/components/manage/ConsoleHeader.tsx`:

```tsx
import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import type { ManageUser, MenuItem } from "@/lib/manage/roles";

export function ConsoleHeader({ user, menu }: { user: ManageUser; menu: MenuItem[] }) {
  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-b border-white/10">
      <span className="font-bold">{user.name}</span>
      <nav className="flex gap-4 text-gray-300">
        {menu.map((item) => (
          <Link key={item.href} href={item.href} className="hover:text-white">
            {item.label}
          </Link>
        ))}
      </nav>
      <form action={logoutAction} className="ml-auto">
        <Button type="submit" variant="outline" size="sm">
          ログアウト
        </Button>
      </form>
    </header>
  );
}
```

- [ ] **Step 3: ログイン画面を作る**

`src/app/manage/login/LoginForm.tsx`:

```tsx
"use client";

import { useActionState } from "react";
import { type LoginState, loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginId">ログイン ID</Label>
        <Input id="loginId" name="loginId" autoComplete="username" className="h-12 text-base" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-12 text-base"
          required
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-14 text-lg font-bold">
        {pending ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
```

`src/app/manage/login/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "管理画面ログイン | 高専祭2026" };

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center gap-8 px-4 pt-20">
      <h1 className="font-extrabold text-3xl">管理画面</h1>
      <LoginForm />
    </main>
  );
}
```

- [ ] **Step 4: 共通レイアウトと振り分けを作る**

`src/app/manage/(console)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { ConsoleHeader } from "@/components/manage/ConsoleHeader";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { type ManageUser, menuFor } from "@/lib/manage/roles";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await manageRequest<ManageUser>("/auth/me");
  if (!me.ok) {
    // 期限切れ・不正なトークンは Cookie を消してログインし直してもらう
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return <ConsoleMessage title="管理画面">{failureMessage(me.reason)}</ConsoleMessage>;
  }

  return (
    <div className="flex flex-col min-h-full">
      <ConsoleHeader user={me.data} menu={menuFor(me.data.role)} />
      <main className="flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
```

`src/app/manage/(console)/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { failureMessage, manageRequest } from "@/lib/api/manage";
import { homePathFor, type ManageUser } from "@/lib/manage/roles";

export default async function ManageHome() {
  const me = await manageRequest<ManageUser>("/auth/me");
  if (!me.ok) {
    if (me.reason === "unauthorized") redirect("/manage/logout");
    return <ConsoleMessage title="管理画面">{failureMessage(me.reason)}</ConsoleMessage>;
  }

  const home = homePathFor(me.data.role);
  if (home) redirect(home);
  // Member など。ヘッダーのログアウトから別のアカウントで入り直せる
  return (
    <ConsoleMessage title="管理画面の権限がありません">
      担当者用のアカウントでログインし直してください。
    </ConsoleMessage>
  );
}
```

- [ ] **Step 5: 準備中のページを作る**

4 ファイルとも同じ形で、`title` だけ変える（`booths` → 「ブース管理」、`accounts` → 「アカウント」、`ops` → 「当日運営」、`my-booth` → 「自分のブース」）。例: `src/app/manage/(console)/booths/page.tsx`

```tsx
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";

export default function BoothsPage() {
  return <ConsoleMessage title="ブース管理">準備中です。</ConsoleMessage>;
}
```

（関数名はそれぞれ `AccountsPage`, `OpsPage`, `MyBoothPage`）

- [ ] **Step 6: 自動チェック**

Run: `npm test` → PASS
Run: `npm run lint` → エラーなし
Run: `npx next build` → 成功（`/manage/(console)` のルートと `src/proxy.ts` が認識されること）

- [ ] **Step 7: 手動確認（ローカルのバックエンドで）**

1. バックエンド: `cd KCTFestNav-Backend && git checkout feature/manage-auth-fix && docker compose up -d && go run ./cmd`（`.env` の `INIT_ADMIN_ID` / `INIT_ADMIN_PASSWORD` で Admin が作られる）
2. 確認用に Gakuseikai・Student・Member を 1 つずつ作る（Admin の JWT で `POST /manage/users`。Student は `assigned_booth_id` に既存ブースの ID を入れる）
3. フロント: `npm run dev` → `https://localhost:3000/manage` を開く
4. 確認すること:
   - 未ログインで `/manage/booths` → `/manage/login` に飛ぶ
   - パスワード違い → 「ID かパスワードが違います」
   - Admin → `/manage/booths`、ヘッダーに「ブース・アカウント・当日運営」
   - Gakuseikai → `/manage/ops`、メニューは「当日運営」だけ
   - Student → `/manage/my-booth`、メニュー無し
   - Member → 「管理画面の権限がありません」、ログアウトできる
   - ログアウト → `/manage/login`、戻るボタンで管理画面に戻れない（`/manage/login` に飛ばされる）
   - ブラウザの開発者ツールで Cookie `kct_manage_token` の値を書き換えて再読み込み → ログイン画面に戻る（ループしない）
   - バックエンドを止めて再読み込み → 「サーバーに接続できません。時間をおいて再度お試しください。」
   - スマホ幅（390px）でログイン画面とヘッダーが崩れない
5. 確認用に作ったユーザーは `DELETE /manage/users/:id` で消す

- [ ] **Step 8: コミット**

```bash
git add src/components/ui/input.tsx src/components/ui/label.tsx src/components/manage src/app/manage
git commit -m "Feat: 管理画面のログイン画面と共通レイアウトを追加した

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: PR を出す

- [ ] **Step 1: バックエンドの PR**

```bash
cd KCTFestNav-Backend
git push -u origin feature/manage-auth-fix
gh pr create --base develop --title "ユーザーの個別取得をAdminに限定した" --body "$(cat <<'EOF'
## 概要
`GET /manage/users/:id` に Admin チェックが無く、どのロールでも他のユーザーを取得できた。管理コンソールを公開する前に塞ぐ。

- `UserUsecase.GetByID` に Admin チェックを追加
- `docs/permissions.md` を実装に合わせて更新（作成・一覧・詳細は Admin のみ）

## テスト
- `go test ./...`
- Admin 以外とログイン情報無しで拒否されるテストを追加

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 2: フロントの PR**

```bash
cd KCTFestNav-Frontend
git push -u origin feature/manage-foundation
gh pr create --base develop --title "管理コンソールの土台（ログインとロールごとの振り分け）" --body "$(cat <<'EOF'
## 概要
管理コンソールの段階0。設計は `docs/superpowers/specs/2026-10-05-manage-console-design.md`。

- `/manage/login` でログインし、JWT を httpOnly Cookie に保存（API は http のため、サーバー側から呼ぶ）
- ロールごとの振り分け（Admin → ブース、Gakuseikai → 当日運営、Student → 自分のブース、Member → 権限なし）
- 共通ヘッダー（名前・メニュー・ログアウト）
- 各画面は準備中（段階1〜3で作る）

バックエンドの PR（ユーザー取得の権限修正）と合わせてマージしてください。

## テスト
- `npm test`（manageRequest、ログイン、振り分けの単体テスト）
- ローカルのバックエンドで各ロールのログインを手動確認

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: PR の URL を本人に伝える**
