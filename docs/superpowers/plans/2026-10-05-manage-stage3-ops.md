# 管理コンソール 段階3（学生会・当日運営） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 学生会（と Admin）が `/manage/ops` で、全ブースの混雑度を監視・代理更新し、ライブの状態を切り替え、お知らせを更新できるようにする。Admin はライブの追加・編集・削除もできる。

**Architecture:** バックエンドはライブの状態変更 API の不具合（エラーを握りつぶして常に 200、値の検証なし）と、空のお知らせが 500 になる問題を直す。フロントは並べ替え・ライブ入力の変換を純粋関数にし、操作は Server Action。1 画面に「混雑度」「ライブ」「お知らせ」のタブ。画面は 60 秒ごとに自動で最新にする。

**Tech Stack:** Go/Echo、Next.js 16（Server Actions, `revalidatePath`, `useRouter().refresh()`）、React 19、vitest

**Spec:** `docs/superpowers/specs/2026-10-05-manage-console-design.md`（§4, §8, §9）

## Global Constraints

- Next.js は破壊的変更あり。書く前に `node_modules/next/dist/docs/` の該当ページを読む
- API はサーバー側からだけ呼ぶ
- `/manage/ops` は Admin と Gakuseikai。ライブの追加・編集・削除の UI は Admin にだけ出す（API も Admin のみ）
- 混雑度の色・段階・`STALE_MINUTES = 30`・経過時間の表示は段階2の `src/lib/manage/congestion.ts` をそのまま使う。経過時間はサーバー時刻基準（段階2の判断）
- 監視は「最終更新が古い順」。**未更新（`null`）は最も古い扱い**で先頭
- ライブの状態: 0 = 開演前、1 = 公演中、2 = 終了。**ある公演を「公演中」にしたら、他に公演中のものは「終了」にする**（現在のライブを 1 つに保つ。来場者画面の `/lives/current` は 1 件しか返さない）
- ライブの時刻は日本時間で入力・表示する（`datetime-local` の値に `+09:00` を付けて送る）
- お知らせは空では保存できない（バックエンドの制約）。再起動で消えるのは本人確認済みで仕様どおり
- フォームは `onSubmit` から Server Action を呼ぶ（入力を残すため、段階1の判断）
- shadcn で部品を足したら `cn` の import と `package.json` を確認する
- `biome check --write` は自分が触ったファイルだけに使う（既存の `src/lib/utils.ts` などを整形しない）
- コメント・コミットは日本語、`Feat:`/`Fix:`/`Test:`/`Docs:`、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- フロント `npm test`・`npx tsc --noEmit`・`npx next build`、バックエンド `go test -count=1 ./...`（e2e も）
- ブランチ: フロント `feature/manage-ops`、バックエンド `feature/live-status-fix`（どちらも作成済み）
- 手動確認ではユーザーのサーバー（1323 / 3000）に触らない。バックエンドの一時コピーを `:1324`、本番ビルドを `:3002`

## Review Focus

1. 状態変更が失敗（権限なし・値が不正・存在しない ID）→ バックエンドが 403/400/404 を返し、画面にエラーが出る（Task 1 の e2e、Task 4 のテスト）
2. 公演中を切り替えたとき、前の公演中が終了になる。途中で失敗したら、どこまで変わったか分かる文言が出る（Task 4 のテスト）
3. 未更新のブースが監視の先頭に来る（Task 3 のテスト）
4. ライブの終了時刻が開始より前 → 保存せずエラー（Task 3 のテスト、バックエンドも 400）
5. Gakuseikai にライブの追加・編集・削除が出ない。直接 Server Action を呼んでもバックエンドが 403（Task 5 の手動確認）

---

## ファイル構成

| ファイル | 役割 |
|---|---|
| `KCTFestNav-Backend/internal/domain/live.go` | `ValidateLiveStatus` |
| `KCTFestNav-Backend/internal/usecase/live_usecase.go` | `UpdateLiveStatus` で値を検証 |
| `KCTFestNav-Backend/internal/handler/live_handler.go` | 正しい型で受け取り、エラーを返し、204 |
| `KCTFestNav-Backend/internal/handler/handler.go` | `ErrContentRequired` を 400 に |
| `src/lib/api/lives.ts` | `LiveResponse` 型 |
| `src/lib/manage/ops.ts` | 監視の並べ替え、ライブの状態ラベル、ライブ入力 → API |
| `src/app/actions/ops.ts` | 混雑度の代理更新、ライブの状態、ライブの保存・削除、お知らせ |
| `src/components/manage/UpdatedAgo.tsx` | 段階2の `my-booth/UpdatedAgo.tsx` を共有の場所へ移す |
| `src/app/manage/(console)/ops/*` | 画面（タブ、監視、ライブ、お知らせ、自動更新） |

---

### Task 1: バックエンド — ライブの状態変更 API を直す

**Files:** `internal/domain/live.go`, `internal/usecase/live_usecase.go`, `internal/usecase/live_usecase_test.go`, `internal/handler/live_handler.go`, `internal/handler/live_e2e_test.go`

**Interfaces:**
- Produces: `PATCH /manage/lives/:id/status` に `{"status": 0|1|2}`。成功 204、値が不正 400、Admin/Gakuseikai 以外 403、存在しない ID 404。`domain.ValidateLiveStatus(s LiveStatus) error`

- [ ] **Step 1: 失敗するテストを書く**

`live_usecase_test.go`（`package usecase` の内部テスト。既存の `TestLiveUsecase_UpdateLiveStatus` 付近に追加。`ctxWithRole` ヘルパーを使う）:

```go
func TestLiveUsecase_UpdateLiveStatus_Validation(t *testing.T) {
	t.Run("異常系: 0/1/2 以外は保存しない", func(t *testing.T) {
		called := false
		repo := &mockLiveRepository{
			updateLiveStatusFn: func(ctx context.Context, id int, s domain.LiveStatus) error {
				called = true
				return nil
			},
		}
		uc := NewLiveUsecase(repo)
		err := uc.UpdateLiveStatus(ctxWithRole(domain.RoleGakuseikai), 1, domain.LiveStatus(7))
		assert.ErrorIs(t, err, domain.ErrInvalidLiveStatus)
		assert.False(t, called)
	})
}
```

（`NewLiveUsecase` の名前は既存テストの使い方に合わせる）

`live_e2e_test.go` の「PUT /manage/lives/:id - ライブの更新」の後に:

```go
	t.Run("PATCH /manage/lives/:id/status - 状態を変えられること", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"status": 2})
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/manage/lives/%d/status", insertedLiveID), bytes.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set("Authorization", authHeaderValue)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusNoContent, rec.Code)

		var status int
		assert.NoError(t, db.QueryRow("SELECT status FROM lives WHERE id = ?", insertedLiveID).Scan(&status))
		assert.Equal(t, 2, status)
	})

	t.Run("PATCH /manage/lives/:id/status - 不正な値は400", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"status": 7})
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/manage/lives/%d/status", insertedLiveID), bytes.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set("Authorization", authHeaderValue)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusBadRequest, rec.Code)
	})

	t.Run("PATCH /manage/lives/:id/status - トークンが無ければ401", func(t *testing.T) {
		body, _ := json.Marshal(map[string]int{"status": 1})
		req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/manage/lives/%d/status", insertedLiveID), bytes.NewReader(body))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusUnauthorized, rec.Code)
	})
```

e2e のセットアップに Student のトークンを作る仕組みがあれば、Student で 403 になるケースも足す（無ければユニットテストの既存の権限ケースで足りる）。存在しない ID は MySQL の UPDATE が 0 件でもエラーにならないので、このタスクでは 404 にしない（Review Focus 1 の「存在しない ID」はフロントで一覧から選ぶため起きにくい。ledger に記録）。

- [ ] **Step 2: 失敗を確認する** — `go test -count=1 ./internal/usecase/ -run LiveStatus -v`（値の検証が無いので FAIL）、`go test -count=1 -v ./internal/handler/ -run LiveE2E`（200 が返る、7 でも保存される）

- [ ] **Step 3: 実装する**

`domain/live.go`:

```go
// ライブの状態が 0/1/2 のどれかか
func ValidateLiveStatus(status LiveStatus) error {
	switch status {
	case LiveStatusUpcoming, LiveStatusOngoing, LiveStatusFinished:
		return nil
	default:
		return ErrInvalidLiveStatus
	}
}
```

（`SetStatus` もこれを使うようにすると重複が減る）

`usecase.UpdateLiveStatus` の権限チェックの後に:

```go
	if err := domain.ValidateLiveStatus(status); err != nil {
		return err
	}
```

`live_handler.go`:

```go
type UpdateLiveStatusRequest struct {
	Status domain.LiveStatus `json:"status"`
}

func (h *LiveHandler) UpdateLiveStatus(c *echo.Context) error {
	id, err := getIDParam(c)
	if err != nil {
		return err
	}
	var req UpdateLiveStatusRequest
	if err := c.Bind(&req); err != nil {
		return err
	}
	if err := h.liveUsecase.UpdateLiveStatus(c.Request().Context(), id, req.Status); err != nil {
		return err
	}
	return c.NoContent(http.StatusNoContent)
}
```

- [ ] **Step 4: 通ることを確認する** — `go test -count=1 ./...` 全 PASS（e2e が走ったことを `-v` で確認）。`docs/openapi.yaml` の該当 API の応答が 204 になっていなければ直す
- [ ] **Step 5: コミット** — `Fix: ライブの状態変更APIがエラーを返さず値も検証していなかった問題を直した`

---

### Task 2: バックエンド — 空のお知らせを 400 に

**Files:** `internal/handler/handler.go`、テスト: `internal/handler/announce_handler_test.go`（既存のスタイルに合わせる。e2e が無ければハンドラーのテストで）

- [ ] **Step 1: 失敗するテストを書く** — `PUT /manage/announcements` に `{"content": "  "}` を Admin で送ると 400 になること
- [ ] **Step 2: 失敗を確認する** — 500 が返る
- [ ] **Step 3: 実装する** — `CustomHTTPErrorHandler` のバリデーション系の `case` に `errors.Is(err, domain.ErrContentRequired)` を足す
- [ ] **Step 4: 通ることを確認する** — `go test -count=1 ./...`
- [ ] **Step 5: コミット** — `Fix: 空のお知らせを保存しようとしたときに500ではなく400を返すようにした`

---

### Task 3: フロントの純粋関数（監視の並べ替え・ライブ）

**Files:**
- Create: `src/lib/api/lives.ts`（型のみ）
- Create: `src/lib/manage/ops.ts`
- Test: `src/lib/manage/ops.test.ts`

**Interfaces:**
- Produces:
  - `type LiveResponse = { id: number; name: string; detail: string; thumbnail_url: string; start_time: string; end_time: string; session_number: number; status: number }`
  - `LIVE_STATUSES: { value: 0 | 1 | 2; label: string }[]`（開演前／公演中／終了）
  - `sortForMonitor(booths: BoothResponse[]): BoothResponse[]` — 未更新が先頭、次に更新が古い順。同じなら ID 順
  - `sortLives(lives: LiveResponse[]): LiveResponse[]` — 開始時刻順
  - `type LivePayload = { name: string; detail: string; thumbnail_url: string; start_time: string; end_time: string; session_number: number; status: number }`
  - `parseLiveForm(formData: FormData, current?: LiveResponse): { ok: true; payload: LivePayload } | { ok: false; error: string }` — `name` 必須、`startTime`/`endTime` は `datetime-local`（`2026-10-31T13:00`）で必須、終了は開始より後、`sessionNumber` は 1 以上の整数、`thumbnailUrl` は空か http(s)。時刻は `+09:00` を付けて ISO にする。`status` は編集なら今の値、新規は 0
  - `toLocalInput(iso: string): string` — API の時刻を日本時間の `datetime-local` 値に（編集フォームの初期値用）

- [ ] **Step 1: 失敗するテストを書く**

```ts
import { describe, expect, it } from "vitest";
import type { BoothResponse } from "@/lib/api/booths";
import type { LiveResponse } from "@/lib/api/lives";
import { parseLiveForm, sortForMonitor, sortLives, toLocalInput } from "./ops";

const booth = (id: number, updated: string | null) =>
  ({ id, congestion_updated_at: updated }) as BoothResponse;

describe("sortForMonitor", () => {
  it("未更新が先頭、次に古い順", () => {
    const sorted = sortForMonitor([
      booth(1, "2026-10-31T03:30:00Z"),
      booth(2, null),
      booth(3, "2026-10-31T03:00:00Z"),
      booth(4, null),
    ]);
    expect(sorted.map((b) => b.id)).toEqual([2, 4, 3, 1]);
  });

  it("元の配列は変えない", () => {
    const list = [booth(1, "2026-10-31T03:30:00Z"), booth(2, null)];
    sortForMonitor(list);
    expect(list.map((b) => b.id)).toEqual([1, 2]);
  });
});

describe("sortLives", () => {
  it("開始時刻順", () => {
    const live = (id: number, start: string) => ({ id, start_time: start }) as LiveResponse;
    expect(
      sortLives([live(1, "2026-10-31T14:00:00+09:00"), live(2, "2026-10-31T13:00:00+09:00")]).map(
        (l) => l.id,
      ),
    ).toEqual([2, 1]);
  });
});

const fd = (v: Record<string, string>) => {
  const f = new FormData();
  for (const [k, x] of Object.entries(v)) f.set(k, x);
  return f;
};
const base = {
  name: " 軽音部 ",
  detail: "説明",
  thumbnailUrl: "",
  startTime: "2026-10-31T13:00",
  endTime: "2026-10-31T13:30",
  sessionNumber: "1",
};

describe("parseLiveForm", () => {
  it("日本時間として ISO にし、新規の状態は開演前", () => {
    expect(parseLiveForm(fd(base))).toEqual({
      ok: true,
      payload: {
        name: "軽音部",
        detail: "説明",
        thumbnail_url: "",
        start_time: "2026-10-31T13:00:00+09:00",
        end_time: "2026-10-31T13:30:00+09:00",
        session_number: 1,
        status: 0,
      },
    });
  });

  it("編集では今の状態を保つ", () => {
    const res = parseLiveForm(fd(base), { status: 1 } as LiveResponse);
    expect(res.ok && res.payload.status).toBe(1);
  });

  it("名前は必須", () => {
    expect(parseLiveForm(fd({ ...base, name: " " }))).toEqual({
      ok: false,
      error: "ライブ名を入力してください",
    });
  });

  it("時刻は必須", () => {
    expect(parseLiveForm(fd({ ...base, startTime: "" }))).toEqual({
      ok: false,
      error: "開始と終了の時刻を入力してください",
    });
  });

  it("終了は開始より後", () => {
    expect(parseLiveForm(fd({ ...base, endTime: "2026-10-31T12:00" }))).toEqual({
      ok: false,
      error: "終了時刻は開始時刻より後にしてください",
    });
  });

  it("回数は 1 以上の整数", () => {
    expect(parseLiveForm(fd({ ...base, sessionNumber: "0" }))).toEqual({
      ok: false,
      error: "回数は 1 以上の整数で入力してください",
    });
  });

  it("サムネイル URL は http(s) のみ", () => {
    expect(parseLiveForm(fd({ ...base, thumbnailUrl: "javascript:x" }))).toEqual({
      ok: false,
      error: "サムネイル URL は http:// か https:// で始めてください",
    });
  });
});

describe("toLocalInput", () => {
  it("どのタイムゾーン表記でも日本時間の datetime-local にする", () => {
    expect(toLocalInput("2026-10-31T04:00:00Z")).toBe("2026-10-31T13:00");
    expect(toLocalInput("2026-10-31T13:00:00+09:00")).toBe("2026-10-31T13:00");
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/lib/manage/ops.test.ts` → FAIL

- [ ] **Step 3: 実装する**

`src/lib/api/lives.ts`:

```ts
/** バックエンドが返すライブ。時刻は ISO 8601 */
export type LiveResponse = {
  id: number;
  name: string;
  detail: string;
  thumbnail_url: string;
  start_time: string;
  end_time: string;
  session_number: number;
  /** 0 = 開演前、1 = 公演中、2 = 終了 */
  status: number;
};
```

`src/lib/manage/ops.ts`:

```ts
import type { BoothResponse } from "@/lib/api/booths";
import type { LiveResponse } from "@/lib/api/lives";

export const LIVE_STATUSES = [
  { value: 0, label: "開演前" },
  { value: 1, label: "公演中" },
  { value: 2, label: "終了" },
] as const;

// 未更新は最も古い扱い
const updatedMs = (b: BoothResponse) =>
  b.congestion_updated_at ? new Date(b.congestion_updated_at).getTime() : -Infinity;

/** 混雑度の監視用。更新が止まっているブースほど上に来る */
export function sortForMonitor(booths: BoothResponse[]): BoothResponse[] {
  return [...booths].sort((a, b) => updatedMs(a) - updatedMs(b) || a.id - b.id);
}

export function sortLives(lives: LiveResponse[]): LiveResponse[] {
  return [...lives].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );
}

export type LivePayload = Omit<LiveResponse, "id">;

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
// datetime-local は秒もタイムゾーンも持たないので、日本時間として扱う
const jst = (local: string) => `${local}:00+09:00`;

export function parseLiveForm(
  formData: FormData,
  current?: LiveResponse,
): { ok: true; payload: LivePayload } | { ok: false; error: string } {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "ライブ名を入力してください" };

  const start = text(formData, "startTime");
  const end = text(formData, "endTime");
  if (!start || !end) return { ok: false, error: "開始と終了の時刻を入力してください" };
  if (new Date(jst(end)) <= new Date(jst(start))) {
    return { ok: false, error: "終了時刻は開始時刻より後にしてください" };
  }

  const session = Number(text(formData, "sessionNumber"));
  if (!Number.isInteger(session) || session < 1) {
    return { ok: false, error: "回数は 1 以上の整数で入力してください" };
  }

  const thumbnail = text(formData, "thumbnailUrl");
  if (thumbnail && !/^https?:\/\//.test(thumbnail)) {
    return { ok: false, error: "サムネイル URL は http:// か https:// で始めてください" };
  }

  return {
    ok: true,
    payload: {
      name,
      detail: text(formData, "detail"),
      thumbnail_url: thumbnail,
      start_time: jst(start),
      end_time: jst(end),
      session_number: session,
      status: current?.status ?? 0,
    },
  };
}

/** API の時刻を、日本時間の datetime-local の値(YYYY-MM-DDTHH:mm)にする */
export function toLocalInput(iso: string): string {
  const jstMs = new Date(iso).getTime() + 9 * 60 * 60_000;
  return new Date(jstMs).toISOString().slice(0, 16);
}
```

- [ ] **Step 4: 通ることを確認する** — PASS、`npm test` 全 PASS
- [ ] **Step 5: コミット** — `Feat: 当日運営の監視の並べ替えとライブ入力の変換を追加した`

---

### Task 4: Server Action（当日運営）

**Files:**
- Create: `src/app/actions/ops.ts`
- Test: `src/app/actions/ops.test.ts`

**Interfaces:**
- Consumes: `manageRequest`, `failureMessage`、`parseLiveForm`, `LivePayload`（Task 3）、`LiveResponse`
- Produces（いずれも成功で `revalidatePath("/manage/ops")`、`unauthorized` は `redirect("/manage/logout")`）:
  - `setBoothCongestion(boothId: number, status: number): Promise<{ error?: string }>` — 0/1/2 以外は送らない。`PATCH /manage/booths/:id/congestion`
  - `setLiveStatus(liveId: number, status: number): Promise<{ error?: string }>` — 0/1/2 以外は送らない。1（公演中）にするときは、先に `GET /lives` で他の公演中を取り、それぞれ 2（終了）に PATCH してから対象を 1 にする。途中で失敗したら「『<名前>』を終了にできませんでした。…」のように、どこで止まったかが分かる文言を返す
  - `type LiveFormState = { error?: string; done?: boolean } | undefined`
  - `saveLive(current: LiveResponse | undefined, prev: LiveFormState, formData: FormData): Promise<LiveFormState>` — 新規 `POST /manage/lives`、編集 `PUT /manage/lives/:id`
  - `deleteLive(id: number): Promise<{ error?: string }>`
  - `type AnnouncementState = { error?: string; saved?: boolean } | undefined`
  - `saveAnnouncement(prev: AnnouncementState, formData: FormData): Promise<AnnouncementState>` — `content` を trim して空なら「お知らせを入力してください」。`PUT /manage/announcements`

- [ ] **Step 1: 失敗するテストを書く**（モックの組み方は `my-booth.test.ts` と同じ。**`beforeEach` はブロックで書く**）

```ts
describe("setLiveStatus", () => {
  it("公演中にするとき、他の公演中を終了にしてから切り替える", async () => {
    manageRequest.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/lives") {
        return { ok: true, data: { lives: [
          { id: 1, name: "A", status: 1 },
          { id: 2, name: "B", status: 0 },
          { id: 3, name: "C", status: 1 },
        ] } };
      }
      return { ok: true, data: undefined };
    });
    expect(await setLiveStatus(2, 1)).toEqual({});
    const patches = manageRequest.mock.calls
      .filter((c) => c[1]?.method === "PATCH")
      .map((c) => [c[0], JSON.parse(c[1].body).status]);
    expect(patches).toEqual([
      ["/manage/lives/1/status", 2],
      ["/manage/lives/3/status", 2],
      ["/manage/lives/2/status", 1],
    ]);
  });

  it("前の公演中を終了にできなければ切り替えず、どれかを伝える", async () => {
    manageRequest.mockImplementation(async (path: string) => {
      if (path === "/lives") {
        return { ok: true, data: { lives: [{ id: 1, name: "A", status: 1 }, { id: 2, name: "B", status: 0 }] } };
      }
      return { ok: false, reason: "unavailable" };
    });
    expect(await setLiveStatus(2, 1)).toEqual({
      error: "「A」を終了にできませんでした。サーバーに接続できません。時間をおいて再度お試しください。",
    });
    expect(manageRequest.mock.calls.some((c) => c[0] === "/manage/lives/2/status")).toBe(false);
  });

  it("開演前・終了への切り替えは他を触らない", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setLiveStatus(2, 2)).toEqual({});
    expect(manageRequest).toHaveBeenCalledTimes(1);
  });

  it("0/1/2 以外は送らない", async () => {
    expect(await setLiveStatus(2, 9)).toEqual({ error: "状態を選び直してください" });
    expect(manageRequest).not.toHaveBeenCalled();
  });
});

describe("setBoothCongestion", () => {
  it("PATCH して当日運営の画面を更新する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await setBoothCongestion(5, 1)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/booths/5/congestion", {
      method: "PATCH",
      body: JSON.stringify({ congestion_status: 1 }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/manage/ops");
  });
});

describe("saveLive", () => {
  const form = () => {
    const f = new FormData();
    f.set("name", "軽音部");
    f.set("startTime", "2026-10-31T13:00");
    f.set("endTime", "2026-10-31T13:30");
    f.set("sessionNumber", "1");
    return f;
  };

  it("新規は POST", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await saveLive(undefined, undefined, form())).toEqual({ done: true });
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/lives");
    expect(manageRequest.mock.calls[0][1].method).toBe("POST");
  });

  it("編集は PUT /manage/lives/:id", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    await saveLive({ id: 4, status: 1 } as LiveResponse, undefined, form());
    expect(manageRequest.mock.calls[0][0]).toBe("/manage/lives/4");
    expect(JSON.parse(manageRequest.mock.calls[0][1].body).status).toBe(1);
  });

  it("入力エラーは送らない", async () => {
    const f = form();
    f.set("name", "");
    expect(await saveLive(undefined, undefined, f)).toEqual({ error: "ライブ名を入力してください" });
    expect(manageRequest).not.toHaveBeenCalled();
  });
});

describe("saveAnnouncement", () => {
  it("空なら送らない", async () => {
    const f = new FormData();
    f.set("content", "  ");
    expect(await saveAnnouncement(undefined, f)).toEqual({ error: "お知らせを入力してください" });
    expect(manageRequest).not.toHaveBeenCalled();
  });

  it("PUT して保存した旨を返す", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    const f = new FormData();
    f.set("content", " 13時から体育館でライブ ");
    expect(await saveAnnouncement(undefined, f)).toEqual({ saved: true });
    expect(manageRequest).toHaveBeenCalledWith("/manage/announcements", {
      method: "PUT",
      body: JSON.stringify({ content: "13時から体育館でライブ" }),
    });
  });
});

describe("deleteLive", () => {
  it("DELETE する", async () => {
    manageRequest.mockResolvedValue({ ok: true, data: undefined });
    expect(await deleteLive(4)).toEqual({});
    expect(manageRequest).toHaveBeenCalledWith("/manage/lives/4", { method: "DELETE" });
  });
});
```

- [ ] **Step 2: 失敗を確認する** — `npx vitest run --project unit src/app/actions/ops.test.ts` → FAIL

- [ ] **Step 3: 実装する** — `my-booth.ts` と同じ形（`failed(reason)` で unauthorized を redirect）。`setLiveStatus` の流れ:

```ts
export async function setLiveStatus(liveId: number, status: number): Promise<{ error?: string }> {
  if (![0, 1, 2].includes(status)) return { error: "状態を選び直してください" };

  if (status === 1) {
    // 公演中は 1 つだけにする(来場者画面の「今のライブ」は 1 件しか出ないため)
    const lives = await manageRequest<{ lives: LiveResponse[] }>("/lives");
    if (!lives.ok) return { error: failed(lives.reason) };
    for (const other of lives.data.lives) {
      if (other.id === liveId || other.status !== 1) continue;
      const res = await patchLiveStatus(other.id, 2);
      if (!res.ok) return { error: `「${other.name}」を終了にできませんでした。${failed(res.reason)}` };
    }
  }
  const res = await patchLiveStatus(liveId, status);
  if (!res.ok) return { error: failed(res.reason) };
  revalidatePath("/manage/ops");
  return {};
}
```

（`patchLiveStatus(id, status)` は `manageRequest(\`/manage/lives/${id}/status\`, { method: "PATCH", body: JSON.stringify({ status }) })` を返す小さな関数）

- [ ] **Step 4: 通ることを確認する** — PASS、`npm test`、`npx tsc --noEmit`
- [ ] **Step 5: コミット** — `Feat: 当日運営の混雑度・ライブ・お知らせのServer Actionを追加した`

---

### Task 5: 当日運営の画面

**Files:**
- Move: `src/app/manage/(console)/my-booth/UpdatedAgo.tsx` → `src/components/manage/UpdatedAgo.tsx`（`my-booth/page.tsx` の import を直す）。監視の行で使うため、`className` を受け取れるようにし、文言は呼び出し側で短くできるよう `compact?: boolean`（`true` なら「N分前」だけ、古ければ赤）を足す
- Modify: `src/app/manage/(console)/ops/page.tsx`
- Create: `src/app/manage/(console)/ops/OpsTabs.tsx`, `CongestionMonitor.tsx`, `LiveList.tsx`, `LiveFormDialog.tsx`, `DeleteLiveButton.tsx`, `AnnouncementForm.tsx`, `AutoRefresh.tsx`

**Interfaces:**
- Consumes: Task 3・4 の関数、`requireRole`, `manageRequest`, `failureMessage`, `CONGESTION_LEVELS`, `UpdatedAgo`

画面の仕様:
- `page.tsx`（Server Component）: `requireRole(["Admin", "Gakuseikai"])`。`/booths`・`/lives`・`/announcements` を並行で取得。どれか失敗したら `ConsoleMessage`。`isAdmin` を子に渡す。`serverNow = Date.now()`
- 上部に「当日運営」見出しと、公演中のライブがあれば「いまのライブ: <名前>」（無ければ「公演中のライブはありません」）
- `OpsTabs`（Client）: 「混雑度」「ライブ」「お知らせ」の 3 つのタブボタン（選択中は白地に黒文字）。選んだタブは URL の `?tab=` に残す（再読み込み・自動更新で戻らないように）
- `CongestionMonitor`: `sortForMonitor` 順の一覧。各行にブース名・主催者・今の混雑度（色のバッジ）・`UpdatedAgo compact`・3 段階の小さなボタン（押すと `setBoothCongestion`、押した行だけ「更新中…」、失敗は行の下に赤）。30 分以上止まっている件数を見出しに「更新が止まっているブース N 件」として赤で出す
- `LiveList`: `sortLives` 順。各行に時刻（日本時間 `13:00〜13:30`）・名前・回数・状態の 3 ボタン（`setLiveStatus`。公演中は赤枠で強調）。`isAdmin` なら右上に「ライブを追加」と各行に「編集」「削除」
- `LiveFormDialog`（Admin）: 段階1の `BoothFormDialog` と同じ作り。項目: ライブ名、説明、サムネイル URL、開始・終了（`type="datetime-local"`、編集時は `toLocalInput`）、回数（数値）
- `DeleteLiveButton`（Admin）: 段階1の `DeleteBoothButton` と同じ作り
- `AnnouncementForm`: 今のお知らせを初期値にした textarea と保存ボタン。「保存しました」/エラー。注記「サーバーを再起動すると消えます」
- `AutoRefresh`（Client）: 60 秒ごとに `useRouter().refresh()`。ただしダイアログが開いているときやフォームに入力中（`document.activeElement` が input/textarea）のときはその回を飛ばす。右上に「60秒ごとに自動で最新にします」と「今すぐ更新」ボタン

- [ ] **Step 1: `UpdatedAgo` を共有の場所へ移し、`my-booth` が今までどおり動くことを `npx tsc --noEmit` で確認**
- [ ] **Step 2〜5: 上の部品を作る**（各部品は段階1・2の同種の部品をなぞる。`OpsTabs` は `useSearchParams` と `useRouter().replace` を使う。先に `node_modules/next/dist/docs/` で `useSearchParams` の注意（Suspense が要るか）を読む）
- [ ] **Step 6: 自動チェック** — `npm test`、`npx tsc --noEmit`、触ったファイルだけ `npx biome check`、`npx next build`
- [ ] **Step 7: 手動確認**（Global Constraints の環境。確認用の Admin・Gakuseikai、ブース 3 件、ライブ 3 件を API で作り、最後に消す）
  - Gakuseikai でログイン → `/manage/ops`。ライブの追加・編集・削除が出ない
  - 混雑度: 未更新のブースが先頭。1 件を更新すると末尾へ移り「たった今」。Redis の時刻を 40 分前にすると赤になり件数に入る
  - ライブ: A を公演中 → 「いまのライブ: A」。B を公演中 → A が終了、B が公演中。来場者の `/lives/current` が B
  - バックエンドを止めて状態を切り替え → エラーが出る
  - お知らせ: 空で保存 → エラー。文を入れて保存 → 「保存しました」、`GET /announcements` に反映
  - Admin でログイン → ライブの追加（終了が開始より前でエラー、入力は残る）、編集（時刻が日本時間で入っている）、削除
  - タブを選んで 60 秒待つ（または「今すぐ更新」）→ 同じタブのまま最新になる。ダイアログを開いている間は勝手に更新されない
  - スマホ幅（390px の iframe）
  - 確認用データを消す。**お知らせは確認前の内容に戻す**（確認前に `GET /announcements` で控えておく）

- [ ] **Step 8: コミット** — `Feat: 学生会の当日運営画面を追加した`

---

### Task 6: PR を出す

- [ ] **Step 1: 最終レビュー**（executing-plans の手順どおり）
- [ ] **Step 2: バックエンドの PR** — `feature/live-status-fix`、タイトル「ライブの状態変更APIと空のお知らせのエラーを直した」
- [ ] **Step 3: フロントの PR** — `feature/manage-ops`、タイトル「学生会の当日運営画面」。**バックエンド PR と合わせてマージ**（無いと状態変更の失敗が成功に見える）
- [ ] **Step 4: PR の URL を本人に伝える**
