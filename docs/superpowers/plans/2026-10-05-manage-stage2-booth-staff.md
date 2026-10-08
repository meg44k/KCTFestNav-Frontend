# 管理コンソール 段階2（企画担当） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 企画担当（Student）が `/manage/my-booth` で自分のブースの混雑度をワンタップで変え、最終更新からの経過時間を見られ、説明文と画像を直せるようにする。

**Architecture:** バックエンドは混雑度を更新したときに `congestion_updated_at:{id}` へ UNIX 秒を保存し、ブースの取得 API に `congestion_updated_at`（ISO 8601 / `null`）を足す。フロントは経過時間の表示を純粋関数にし、混雑度の更新と説明の保存を Server Action で行う。混雑度ボタンは `useOptimistic` で押した瞬間に切り替える。

**Tech Stack:** Go/Echo + go-redis v9、Next.js 16（Server Actions, `revalidatePath`）、React 19（`useOptimistic`, `useTransition`）、vitest

**Spec:** `docs/superpowers/specs/2026-10-05-manage-console-design.md`（§4, §7, §9）

## Global Constraints

- Next.js は破壊的変更あり。書く前に `node_modules/next/dist/docs/` の該当ページを読む
- API はサーバー側からだけ呼ぶ
- 混雑度は 0 = 空き、1 = 少し混雑、2 = 非常に混雑。色は来場者画面と同じ（`#00B894` / `#FDCB6E` / `#e54141`）
- 混雑度は押したら即反映、確認ダイアログなし（spec §7.1）
- 「最終更新: N 分前」。**30 分以上たっていたら「更新してください」と目立たせる**（`STALE_MINUTES = 30`、段階3の監視でも同じ値を使う）
- 説明文と画像 URL の編集は `PUT /manage/booths/:id`。他の項目は今の値をそのまま送る
- 来場者向けの画面は追加された項目を無視するので変えない
- 混雑度ボタンの高さは 80px 以上（片手で押す）
- 保存に失敗したら入力を残したままエラーを出す。フォームは `action` ではなく `onSubmit` から Server Action を呼ぶ（段階1の判断）
- shadcn で部品を足したら、`cn` を `@/lib/utils` から import しているか、`package.json` に `cn` が増えていないかを確認する
- コメント・コミットは日本語、`Feat:`/`Fix:`/`Test:`/`Docs:`、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- フロント `npm test`・`npx tsc --noEmit`・`npx next build`、バックエンド `go test -count=1 ./...`（DB と Redis を起動して e2e も）
- ブランチ: フロント `feature/manage-booth-staff`（作成済み）、バックエンド `feature/congestion-updated-at`
- 手動確認ではユーザーが自分で動かしているサーバー（1323 / 3000）に触らない。バックエンドは一時コピーを `:1324` で、フロントは `NEXT_PUBLIC_API_BASE_URL=http://localhost:1324` で本番ビルドを `:3002` で動かす

## Review Focus

1. 一度も混雑度を更新していないブース → 「まだ更新されていません」と出て、更新を促す表示になる（Task 3 のテスト）
2. 混雑度の更新に失敗（ネットワーク断・権限なし）→ ボタンの強調が元に戻り、エラーが出る（Task 5 の手動確認）
3. 担当ブースが削除済み（`assigned_booth_id` が 0 / ブースが 404）→ 「担当ブースが見つかりません。管理者に連絡してください。」（Task 4 のテスト）
4. 時計がずれた端末・未来の時刻 → 「たった今」扱いで負の分数を出さない（Task 3 のテスト）
5. ブースを削除したら Redis の更新時刻も消える（Task 1 のテスト）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `KCTFestNav-Backend/internal/domain/booth.go` | `Booth.CongestionUpdatedAt time.Time`（ゼロ値 = 未更新） |
| `KCTFestNav-Backend/internal/repository/booth_repository.go` | 更新時刻の保存・読み出し・削除 |
| `KCTFestNav-Backend/internal/handler/booth_handler.go` | 応答に `congestion_updated_at` |
| `src/lib/api/booths.ts` | `BoothResponse.congestion_updated_at` |
| `src/lib/manage/congestion.ts` | 経過時間の文言と「古い」の判定 |
| `src/lib/manage/booth-form.ts` | 説明と画像だけを変えるペイロード |
| `src/app/actions/my-booth.ts` | 混雑度の更新、説明の保存、担当ブースの取得 |
| `src/app/manage/(console)/my-booth/page.tsx`, `CongestionButtons.tsx`, `UpdatedAgo.tsx`, `DetailForm.tsx` | 画面 |

---

### Task 1: バックエンド — 更新時刻の保存と読み出し（リポジトリ）

**Files:**
- Modify: `KCTFestNav-Backend/internal/domain/booth.go`
- Modify: `KCTFestNav-Backend/internal/repository/booth_repository.go`
- Test: `KCTFestNav-Backend/internal/repository/booth_repository_test.go`

**Interfaces:**
- Produces:
  - `domain.Booth.CongestionUpdatedAt time.Time` — 混雑度を最後に更新した時刻。未更新はゼロ値
  - Redis キー `congestion_updated_at:{id}`（UNIX 秒）。`UpdateCongestion` で混雑度と一緒に書き、`GetByID`/`GetAll` で読み、`Delete` で消す

- [ ] **Step 1: ブランチを作る** — `cd KCTFestNav-Backend && git checkout develop && git checkout -b feature/congestion-updated-at`

- [ ] **Step 2: 失敗するテストを書く**（`TestBoothRepository_UpdateCongestion` に追加。`time` を import）

```go
	t.Run("正常系: 混雑度を更新すると更新時刻も保存され、取得できる", func(t *testing.T) {
		_, _ = db.Exec("SET FOREIGN_KEY_CHECKS = 0")
		_, _ = db.Exec("TRUNCATE TABLE booths")
		_, _ = db.Exec("SET FOREIGN_KEY_CHECKS = 1")
		res, err := db.ExecContext(ctx, "INSERT INTO booths (name, organizer, detail, x, y, z) VALUES (?, ?, ?, ?, ?, ?)", "ブースA", "主催", "詳細", 0, 0, 0)
		assert.NoError(t, err)
		id, _ := res.LastInsertId()

		before, err := repo.GetByID(ctx, int(id))
		assert.NoError(t, err)
		assert.True(t, before.CongestionUpdatedAt.IsZero(), "未更新ならゼロ値")

		start := time.Now().Add(-time.Second)
		assert.NoError(t, repo.UpdateCongestion(ctx, int(id), 1))

		after, err := repo.GetByID(ctx, int(id))
		assert.NoError(t, err)
		assert.True(t, after.CongestionUpdatedAt.After(start), "更新した時刻が入る")

		all, err := repo.GetAll(ctx)
		assert.NoError(t, err)
		assert.Equal(t, after.CongestionUpdatedAt.Unix(), all[0].CongestionUpdatedAt.Unix())
	})

	t.Run("正常系: ブースを削除すると更新時刻も消える", func(t *testing.T) {
		res, err := db.ExecContext(ctx, "INSERT INTO booths (name, organizer, detail, x, y, z) VALUES (?, ?, ?, ?, ?, ?)", "ブースB", "主催", "詳細", 0, 0, 0)
		assert.NoError(t, err)
		id, _ := res.LastInsertId()
		assert.NoError(t, repo.UpdateCongestion(ctx, int(id), 2))

		assert.NoError(t, repo.Delete(ctx, int(id)))

		n, err := rdb.Exists(ctx, fmt.Sprintf("congestion_updated_at:%d", id)).Result()
		assert.NoError(t, err)
		assert.Equal(t, int64(0), n)
	})
```

- [ ] **Step 3: 失敗を確認する**

Run: `docker compose up -d && go test -count=1 ./internal/repository/ -run TestBoothRepository_UpdateCongestion -v`
Expected: コンパイルエラー（`CongestionUpdatedAt` が無い）。テストが「スキップ」になっていないことを確認する

- [ ] **Step 4: 実装する**

`domain/booth.go` の `Booth` に追加（`time` を import）:

```go
	CongestionUpdatedAt time.Time // 混雑度を最後に更新した時刻。未更新はゼロ値
```

`booth_repository.go`:

```go
// 混雑度の更新時刻を読む。未更新ならゼロ値
func (br *boothRepository) congestionUpdatedAt(ctx context.Context, id int) (time.Time, error) {
	unix, err := br.cache.Get(ctx, formatRedisCongestionUpdatedAtKey(id)).Int64()
	if errors.Is(err, redis.Nil) {
		return time.Time{}, nil
	}
	if err != nil {
		return time.Time{}, err
	}
	return time.Unix(unix, 0), nil
}

func formatRedisCongestionUpdatedAtKey(id int) string {
	return fmt.Sprintf("congestion_updated_at:%d", id)
}
```

`GetByID` と `GetAll` で `ReconstructBooth` の後に:

```go
	updatedAt, err := br.congestionUpdatedAt(ctx, id)
	if err != nil {
		return nil, err
	}
	booth.CongestionUpdatedAt = updatedAt
```

（`GetAll` では `id` を `int(b.ID)` に）

`UpdateCongestion` を、混雑度と時刻を一緒に書くよう置き換える:

```go
func (br *boothRepository) UpdateCongestion(ctx context.Context, id int, congestionStatus domain.CongestionStatus) error {
	// 混雑度と更新時刻は必ず一緒に書く
	_, err := br.cache.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.Set(ctx, formatRedisCongestionStatusKey(id), int(congestionStatus), NoExpiration)
		pipe.Set(ctx, formatRedisCongestionUpdatedAtKey(id), time.Now().Unix(), NoExpiration)
		return nil
	})
	return err
}
```

`Delete` の `br.cache.Del(...)` に更新時刻のキーも渡す:

```go
	br.cache.Del(ctx, formatRedisCongestionStatusKey(id), formatRedisCongestionUpdatedAtKey(id))
```

- [ ] **Step 5: 通ることを確認する** — `go test -count=1 ./internal/repository/ -v -run Booth` → PASS（スキップでないこと）、`go test -count=1 ./...` → 全 PASS

- [ ] **Step 6: コミット** — `Feat: 混雑度の更新時刻をRedisに保存するようにした`

---

### Task 2: バックエンド — 応答に `congestion_updated_at`

**Files:**
- Modify: `KCTFestNav-Backend/internal/handler/booth_handler.go`
- Test: `KCTFestNav-Backend/internal/handler/booth_e2e_test.go`

**Interfaces:**
- Consumes: `domain.Booth.CongestionUpdatedAt`（Task 1）
- Produces: `GET /booths`, `GET /booths/:id` の各ブースに `"congestion_updated_at": "2026-10-31T10:12:00+09:00"` または `null`

- [ ] **Step 1: 失敗するテストを書く**（`booth_e2e_test.go` の「PATCH ... 混雑度の変更(Admin)」の直後に追加）

```go
	t.Run("GET /booths/:id - 混雑度を更新した時刻が返ること", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/booths/%d", insertedBoothID), nil)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)

		var res handler.GetBoothResponse
		assert.NoError(t, json.Unmarshal(rec.Body.Bytes(), &res))
		if assert.NotNil(t, res.CongestionUpdatedAt) {
			assert.WithinDuration(t, time.Now(), *res.CongestionUpdatedAt, time.Minute)
		}
	})
```

最初の「GET /booths - 一覧を取得できること」系のケースで、まだ更新していないブースの `CongestionUpdatedAt` が `nil` であることを足す:

```go
		assert.Nil(t, res.Booths[0].CongestionUpdatedAt)
```

- [ ] **Step 2: 失敗を確認する** — `go test -count=1 -v ./internal/handler/ -run BoothE2E` → コンパイルエラー

- [ ] **Step 3: 実装する**

`GetBoothResponse` に追加:

```go
	CongestionUpdatedAt *time.Time `json:"congestion_updated_at"` // 未更新なら null
```

変換を 1 か所にまとめるヘルパーを足し、`GetByID` と `GetAll` の両方から使う:

```go
func toGetBoothResponse(b *domain.Booth) GetBoothResponse {
	res := GetBoothResponse{
		ID:               b.ID,
		Name:             b.Name,
		Organizer:        b.Organizer,
		Detail:           b.Detail,
		Location:         b.Location,
		CongestionStatus: b.CongestionStatus(),
		ImageURL:         b.ImageURL,
		X:                b.X,
		Y:                b.Y,
		Z:                b.Z,
		Latitude:         b.Latitude,
		Longitude:        b.Longitude,
	}
	if !b.CongestionUpdatedAt.IsZero() {
		t := b.CongestionUpdatedAt
		res.CongestionUpdatedAt = &t
	}
	return res
}
```

- [ ] **Step 4: 通ることを確認する** — `go test -count=1 ./...` → 全 PASS（e2e が実行されたことを `-v` で確認）。`docs/openapi.yaml` の Booth に `congestion_updated_at`（`type: string, format: date-time, nullable: true`）を足す

- [ ] **Step 5: コミット** — `Feat: ブースの応答に混雑度の更新時刻を追加した`

---

### Task 3: 経過時間の表示（純粋関数）

**Files:**
- Modify: `src/lib/api/booths.ts`（`BoothResponse` に `congestion_updated_at?: string | null`）
- Create: `src/lib/manage/congestion.ts`
- Test: `src/lib/manage/congestion.test.ts`

**Interfaces:**
- Produces:
  - `STALE_MINUTES = 30`
  - `updatedAgo(updatedAt: string | null | undefined, now: Date): { label: string; stale: boolean }`
  - `CONGESTION_LEVELS: { value: 0 | 1 | 2; label: string; color: string }[]`（空き／少し混雑／非常に混雑。色は来場者画面と同じ）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import { CONGESTION_LEVELS, STALE_MINUTES, updatedAgo } from "./congestion";

const now = new Date("2026-10-31T12:00:00+09:00");
const ago = (minutes: number) =>
  new Date(now.getTime() - minutes * 60_000).toISOString();

describe("updatedAgo", () => {
  it("未更新は更新を促す", () => {
    expect(updatedAgo(null, now)).toEqual({ label: "まだ更新されていません", stale: true });
    expect(updatedAgo(undefined, now).stale).toBe(true);
  });

  it("1 分未満は「たった今」", () => {
    expect(updatedAgo(ago(0.5), now)).toEqual({ label: "たった今", stale: false });
  });

  it("未来の時刻(端末の時計ずれ)も「たった今」", () => {
    expect(updatedAgo(ago(-5), now).label).toBe("たった今");
  });

  it("分と時間で表す", () => {
    expect(updatedAgo(ago(12), now).label).toBe("12分前");
    expect(updatedAgo(ago(65), now).label).toBe("1時間5分前");
  });

  it(`${STALE_MINUTES} 分以上で古いとみなす`, () => {
    expect(updatedAgo(ago(STALE_MINUTES - 1), now).stale).toBe(false);
    expect(updatedAgo(ago(STALE_MINUTES), now).stale).toBe(true);
  });

  it("読めない値は未更新と同じ扱い", () => {
    expect(updatedAgo("not a date", now)).toEqual({
      label: "まだ更新されていません",
      stale: true,
    });
  });
});

describe("CONGESTION_LEVELS", () => {
  it("来場者画面と同じ 3 段階", () => {
    expect(CONGESTION_LEVELS.map((l) => l.value)).toEqual([0, 1, 2]);
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/lib/manage/congestion.test.ts` → FAIL

- [ ] **Step 3: 実装する**

```ts
/** これ以上更新が無いと「更新してください」と促す(担当者画面と学生会の監視で共通) */
export const STALE_MINUTES = 30;

export const CONGESTION_LEVELS = [
  { value: 0, label: "空き", color: "#00B894" },
  { value: 1, label: "少し混雑", color: "#FDCB6E" },
  { value: 2, label: "非常に混雑", color: "#e54141" },
] as const;

const NEVER = { label: "まだ更新されていません", stale: true };

export function updatedAgo(
  updatedAt: string | null | undefined,
  now: Date,
): { label: string; stale: boolean } {
  if (!updatedAt) return NEVER;
  const at = new Date(updatedAt).getTime();
  if (Number.isNaN(at)) return NEVER;

  // 端末の時計がずれて未来になっても負の値は出さない
  const minutes = Math.max(0, Math.floor((now.getTime() - at) / 60_000));
  const stale = minutes >= STALE_MINUTES;
  if (minutes < 1) return { label: "たった今", stale };
  if (minutes < 60) return { label: `${minutes}分前`, stale };
  return { label: `${Math.floor(minutes / 60)}時間${minutes % 60}分前`, stale };
}
```

`BoothResponse` に追加:

```ts
  /** 混雑度を最後に更新した時刻(ISO 8601)。未更新は null。古いバックエンドでは無い */
  congestion_updated_at?: string | null;
```

- [ ] **Step 4: 通ることを確認する** — PASS、`npm test` 全 PASS（`booths.test.ts` の `toBooth` は新しい項目を無視するので変わらない）
- [ ] **Step 5: コミット** — `Feat: 混雑度の最終更新からの経過時間を表す処理を追加した`

---

### Task 4: Server Action（混雑度・説明・担当ブースの取得）

**Files:**
- Modify: `src/lib/manage/booth-form.ts`（`parseDetailForm` を追加）
- Modify: `src/lib/manage/booth-form.test.ts`
- Create: `src/app/actions/my-booth.ts`
- Test: `src/app/actions/my-booth.test.ts`

**Interfaces:**
- Consumes: `manageRequest`, `failureMessage`, `requireRole`（段階1）、`BoothResponse`, `BoothPayload`, `parseBoothForm`
- Produces:
  - `parseDetailForm(formData: FormData, current: BoothResponse): { ok: true; payload: BoothPayload } | { ok: false; error: string }` — `detail` と `imageUrl` だけを入力から取り、他は `current` のまま
  - `setCongestion(boothId: number, status: number): Promise<{ error?: string }>` — 0/1/2 以外は API を呼ばずにエラー。成功で `revalidatePath("/manage/my-booth")`
  - `saveDetail(current: BoothResponse, prev: DetailState, formData: FormData): Promise<DetailState>`、`type DetailState = { error?: string; saved?: boolean } | undefined`
  - `loadMyBooth(): Promise<{ ok: true; booth: BoothResponse } | { ok: false; message: string }>` — `requireRole(["Student"])` → `assigned_booth_id` が 0 なら、または `GET /booths/:id` が `rejected`（404）なら「担当ブースが見つかりません。管理者に連絡してください。」
  - いずれも `unauthorized` は `redirect("/manage/logout")`

- [ ] **Step 1: 失敗するテストを書く**

`booth-form.test.ts` に:

```ts
describe("parseDetailForm", () => {
  const current = {
    id: 3, name: "たこ焼き", organizer: "1-1", detail: "古い説明", location: "中庭",
    image_url: "", congestion_status: 1, x: 1, y: 2, z: 3, latitude: 33.8, longitude: 130.8,
  } as BoothResponse;

  it("説明と画像だけを変え、他は今の値のまま", () => {
    const res = parseDetailForm(fd({ detail: " 新しい説明 ", imageUrl: "https://example.com/a.jpg" }), current);
    expect(res).toEqual({
      ok: true,
      payload: {
        name: "たこ焼き", organizer: "1-1", detail: "新しい説明", location: "中庭",
        image_url: "https://example.com/a.jpg", latitude: 33.8, longitude: 130.8, x: 1, y: 2, z: 3,
      },
    });
  });

  it("画像 URL は http(s) のみ", () => {
    expect(parseDetailForm(fd({ detail: "", imageUrl: "ftp://x" }), current)).toEqual({
      ok: false,
      error: "画像 URL は http:// か https:// で始めてください",
    });
  });
});
```

`my-booth.test.ts`（段階1の `manage-booths.test.ts` と同じモックの組み方。**`beforeEach` はブロックで書く**）:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const manageRequest = vi.hoisted(() => vi.fn());
const requireRole = vi.hoisted(() => vi.fn());
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/manage", async (orig) => ({
  ...(await orig<typeof import("@/lib/api/manage")>()),
  manageRequest,
  requireRole,
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({
  redirect: (p: string) => {
    throw new Error(`REDIRECT:${p}`);
  },
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

import type { BoothResponse } from "@/lib/api/booths";
import { loadMyBooth, saveDetail, setCongestion } from "./my-booth";

beforeEach(() => {
  manageRequest.mockReset();
  requireRole.mockReset();
  revalidatePath.mockReset();
});

const student = (assigned_booth_id: number) => ({
  ok: true,
  user: { id: "u", name: "1-1", login_id: "booth-3", role: "Student", assigned_booth_id },
});

describe("setCongestion", () => {
  it("PATCH して画面を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setCongestion(3, 2)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/3/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 2 }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/my-booth");
  });

  it("0/1/2 以外は送らない", async () => {
    expect(await setCongestion(3, 5)).toEqual({ error: "混雑度を選び直してください" });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("失敗は文言で返す", async () => {
    manageRequest.mockResolvedValue({ ok: false, reason: "forbidden" });
    expect(await setCongestion(3, 1)).toEqual({ error: "この操作の権限がありません。" });
  });
});

describe("saveDetail", () => {
  it("今の値に説明と画像を重ねて PUT する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    const f = new FormData();
    f.set("detail", "新しい説明");
    f.set("imageUrl", "");
    const current = { id: 3, name: "たこ焼き", x: 0, y: 0, z: 0 } as BoothResponse;
    expect(await saveDetail(current, undefined, f)).toEqual({ saved: true });
    const [path, init] = manageRequest.mock.calls[0];
    expect(path).toBe("/manage/booths/3");
    expect(init.method).toBe("PUT");
    expect(JSON.parse(init.body)).toMatchObject({ name: "たこ焼き", detail: "新しい説明" });
  });
});

describe("loadMyBooth", () => {
  it("担当ブースを返す", async () => {
    requireRole.mockResolvedValue(student(3));
    manageRequest.mockResolvedValue({ ok: true, data: { id: 3, name: "たこ焼き" } });
    expect(await loadMyBooth()).toEqual({ ok: true, booth: { id: 3, name: "たこ焼き" } });
    expect(manageRequest).toHaveBeenCalledWith("/booths/3");
  });

  it("担当ブースが無い(0)ときは案内", async () => {
    requireRole.mockResolvedValue(student(0));
    expect(await loadMyBooth()).toEqual({
      ok: false,
      message: "担当ブースが見つかりません。管理者に連絡してください。",
    });
  });

  it("担当ブースが削除済み(404)のときも同じ案内", async () => {
    requireRole.mockResolvedValue(student(9));
    manageRequest.mockResolvedValue({ ok: false, reason: "rejected" });
    expect((await loadMyBooth()).ok).toBe(false);
  });

  it("Student 以外は requireRole の文言", async () => {
    requireRole.mockResolvedValue({ ok: false, message: "この操作の権限がありません。" });
    expect(await loadMyBooth()).toEqual({ ok: false, message: "この操作の権限がありません。" });
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/lib/manage/booth-form.test.ts src/app/actions/my-booth.test.ts` → FAIL

- [ ] **Step 3: 実装する**

`booth-form.ts` に追加:

```ts
/** 企画担当が直せるのは説明と画像だけ。他の項目は今の値をそのまま送る */
export function parseDetailForm(
  formData: FormData,
  current: BoothResponse,
): { ok: true; payload: BoothPayload } | { ok: false; error: string } {
  const imageUrl = text(formData, "imageUrl");
  if (imageUrl && !/^https?:\/\//.test(imageUrl)) {
    return { ok: false, error: "画像 URL は http:// か https:// で始めてください" };
  }
  const { id: _id, congestion_status: _c, congestion_updated_at: _u, ...rest } = current;
  return {
    ok: true,
    payload: { ...rest, detail: text(formData, "detail"), image_url: imageUrl },
  };
}
```

（`BoothPayload` は `Omit<BoothResponse, "id" | "congestion_status">` なので、`congestion_updated_at` も除くよう `Omit` に足す）

`src/app/actions/my-booth.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BoothResponse } from "@/lib/api/booths";
import { failureMessage, type ManageFailure, manageRequest, requireRole } from "@/lib/api/manage";
import { parseDetailForm } from "@/lib/manage/booth-form";

export type DetailState = { error?: string; saved?: boolean } | undefined;

const NOT_FOUND = "担当ブースが見つかりません。管理者に連絡してください。";

function failed(reason: ManageFailure): string {
  if (reason === "unauthorized") redirect("/manage/logout");
  return failureMessage(reason);
}

export async function loadMyBooth(): Promise<
  { ok: true; booth: BoothResponse } | { ok: false; message: string }
> {
  const auth = await requireRole(["Student"]);
  if (!auth.ok) return auth;
  const boothId = auth.user.assigned_booth_id;
  if (!boothId) return { ok: false, message: NOT_FOUND };

  const booth = await manageRequest<BoothResponse>(`/booths/${boothId}`);
  if (!booth.ok) {
    return { ok: false, message: booth.reason === "rejected" ? NOT_FOUND : failed(booth.reason) };
  }
  return { ok: true, booth: booth.data };
}

export async function setCongestion(boothId: number, status: number): Promise<{ error?: string }> {
  if (![0, 1, 2].includes(status)) return { error: "混雑度を選び直してください" };
  const res = await manageRequest(`/manage/booths/${boothId}/congestion`, {
    method: "PATCH",
    body: JSON.stringify({ congestion_status: status }),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/my-booth");
  return {};
}

export async function saveDetail(
  current: BoothResponse,
  _prev: DetailState,
  formData: FormData,
): Promise<DetailState> {
  const parsed = parseDetailForm(formData, current);
  if (!parsed.ok) return { error: parsed.error };
  const res = await manageRequest(`/manage/booths/${current.id}`, {
    method: "PUT",
    body: JSON.stringify(parsed.payload),
  });
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/my-booth");
  return { saved: true };
}
```

注意: `loadMyBooth` は Server Component から直接呼ぶ関数だが、`"use server"` ファイルに置くと Server Action としても公開される。中身は本人の権限で読むだけなので問題ない。

- [ ] **Step 4: 通ることを確認する** — PASS、`npm test` 全 PASS、`npx tsc --noEmit`
- [ ] **Step 5: コミット** — `Feat: 担当者の混雑度更新と説明編集のServer Actionを追加した`

---

### Task 5: 自分のブースの画面

**Files:**
- Modify: `src/app/manage/(console)/my-booth/page.tsx`
- Create: `src/app/manage/(console)/my-booth/CongestionButtons.tsx`, `UpdatedAgo.tsx`, `DetailForm.tsx`

先に React の `useOptimistic`（`node_modules/next/dist/docs/` に無ければ React 19 の API）と `01-app/01-getting-started/07-mutating-data.md` を読む。

**Interfaces:**
- Consumes: `loadMyBooth`, `setCongestion`, `saveDetail`, `DetailState`（Task 4）、`CONGESTION_LEVELS`, `updatedAgo`（Task 3）、`ConsoleMessage`

画面の仕様（スマホ前提、上から）:
1. ブース名（`font-extrabold text-3xl`）と場所
2. 混雑度ボタン 3 つを縦に並べる。高さ `h-20`、背景はその段階の色、文字は黒。今の状態のボタンは白い太枠（`ring-4 ring-white`）と「✓ 現在」。他は少し暗く（`opacity-60`）
3. 押したら `useOptimistic` で即座に強調を移し、`setCongestion` を呼ぶ。失敗したら強調は元に戻り（`useOptimistic` は transition が終わると元の値に戻る）、ボタンの下に赤でエラー
4. ボタンの下に「最終更新: 12分前」。`stale` なら赤で「最終更新: 45分前 — 混雑度を更新してください」。30 秒ごとに再計算（`UpdatedAgo` で `setInterval`）。時刻はサーバーから受け取った `congestion_updated_at` を使う
5. 区切り線の下に「説明と画像」フォーム（説明 textarea、画像 URL、保存ボタン）。保存できたら「保存しました」、失敗は入力を残してエラー

- [ ] **Step 1: `UpdatedAgo.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { updatedAgo } from "@/lib/manage/congestion";

/** 最終更新からの経過時間。30 秒ごとに表示を更新する */
export function UpdatedAgo({ updatedAt }: { updatedAt?: string | null }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  // 更新した直後は親から新しい時刻が来るので、今の時刻で計算し直す
  useEffect(() => setNow(new Date()), [updatedAt]);

  const { label, stale } = updatedAgo(updatedAt, now);
  return (
    <p className={stale ? "font-bold text-[#e54141]" : "text-gray-400"}>
      最終更新: {label}
      {stale && " — 混雑度を更新してください"}
    </p>
  );
}
```

- [ ] **Step 2: `CongestionButtons.tsx`**

```tsx
"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setCongestion } from "@/app/actions/my-booth";
import { CONGESTION_LEVELS } from "@/lib/manage/congestion";
import { cn } from "@/lib/utils";

export function CongestionButtons({ boothId, current }: { boothId: number; current: number }) {
  const [optimistic, setOptimistic] = useOptimistic(current);
  const [error, setError] = useState<string>();
  const [, start] = useTransition();

  const choose = (value: number) =>
    start(async () => {
      setError(undefined);
      setOptimistic(value);
      const res = await setCongestion(boothId, value);
      if (res.error) setError(res.error);
    });

  return (
    <div className="flex flex-col gap-3">
      {CONGESTION_LEVELS.map((level) => {
        const selected = optimistic === level.value;
        return (
          <button
            key={level.value}
            type="button"
            onClick={() => choose(level.value)}
            aria-pressed={selected}
            style={{ backgroundColor: level.color }}
            className={cn(
              "h-20 rounded-xl text-2xl font-extrabold text-black transition",
              selected ? "ring-4 ring-white" : "opacity-60",
            )}
          >
            {selected && "✓ "}
            {level.label}
            {selected && <span className="ml-2 text-base">（現在）</span>}
          </button>
        );
      })}
      {error && (
        <p role="alert" className="text-[#e54141]">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `DetailForm.tsx`** — 段階1の `BoothFormDialog` の `BoothForm` と同じ作り（`useActionState(saveDetail.bind(null, booth))` + `onSubmit` で `start(() => action(formData))`）。項目は説明（`Textarea`, rows 4, `defaultValue={booth.detail}`）と画像 URL（`Input`, `defaultValue={booth.image_url}`）。`state?.saved` なら「保存しました」（`text-[#00B894]`）、`state?.error` は赤。保存ボタンは `h-12 font-bold`

- [ ] **Step 4: `page.tsx`**

```tsx
import { ConsoleMessage } from "@/components/manage/ConsoleMessage";
import { loadMyBooth } from "@/app/actions/my-booth";
import { CongestionButtons } from "./CongestionButtons";
import { DetailForm } from "./DetailForm";
import { UpdatedAgo } from "./UpdatedAgo";

export default async function MyBoothPage() {
  const res = await loadMyBooth();
  if (!res.ok) return <ConsoleMessage title="自分のブース">{res.message}</ConsoleMessage>;
  const { booth } = res;

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div className="text-center">
        <h1 className="font-extrabold text-3xl">{booth.name}</h1>
        {booth.location && <p className="text-gray-400">{booth.location}</p>}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">いまの混雑度</h2>
        <CongestionButtons boothId={booth.id} current={booth.congestion_status} />
        <UpdatedAgo updatedAt={booth.congestion_updated_at} />
      </section>
      <hr className="border-white/10" />
      <section className="flex flex-col gap-3">
        <h2 className="font-bold">説明と画像</h2>
        <DetailForm booth={booth} />
      </section>
    </div>
  );
}
```

- [ ] **Step 5: 自動チェック** — `npm test`、`npx tsc --noEmit`、`npx biome check src/app src/lib`（新規ファイル）、`npx next build`

- [ ] **Step 6: 手動確認**（Global Constraints の環境。バックエンドは `feature/congestion-updated-at` の一時コピー。確認用の Admin と Student（`assigned_booth_id` は既存ブース）を API で作り、最後に消す）
  - Student でログイン → `/manage/my-booth` に振り分けられ、ブース名が出る
  - 一度も更新していない → 「まだ更新されていません — 混雑度を更新してください」（赤）
  - 「非常に混雑」を押す → 即座に強調が移り、「最終更新: たった今」。来場者の `/class-booth` でも赤になる
  - バックエンドを止めて「空き」を押す → 強調が元に戻り、「サーバーに接続できません…」
  - Redis の `congestion_updated_at:{id}` を 40 分前に書き換えて再読み込み → 赤で「40分前 — 混雑度を更新してください」
  - 説明を変えて保存 → 「保存しました」、来場者のブース詳細にも反映、混雑度は変わらない
  - 画像 URL に `abc` → エラー、入力が残る
  - 担当ブースを削除したアカウント → 「担当ブースが見つかりません。管理者に連絡してください。」
  - Admin で `/manage/my-booth` → 権限なし
  - スマホ幅（390px の iframe）で 3 つのボタンが押しやすい大きさで並ぶ
  - 確認用データを消す

- [ ] **Step 7: コミット** — `Feat: 担当者の混雑度更新画面を追加した`

---

### Task 6: PR を出す

- [ ] **Step 1: 最終レビュー**（executing-plans の手順どおり）
- [ ] **Step 2: バックエンドの PR** — `feature/congestion-updated-at`、タイトル「混雑度の更新時刻を保存してブースの応答に含めた」。Redis キー、応答の項目（`null` の意味）、テストを書く
- [ ] **Step 3: フロントの PR** — `feature/manage-booth-staff`、タイトル「担当者の混雑度更新画面」。画面の内容、テスト、手動確認、**バックエンド PR と合わせてマージ**（無くても動くが「まだ更新されていません」と出続ける）を書く
- [ ] **Step 4: PR の URL を本人に伝える**
