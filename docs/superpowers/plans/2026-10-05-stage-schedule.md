# ステージイベント（セクション・ブロック・出演者） Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 平たい「ライブ」をセクション → ブロック → 出演者の 3 段に作り替え、来場者は「演奏中・次・この後」を一画面で、学生会は「次のバンドへ」1 タップで進められるようにする。

**Architecture:** バックエンドは `lives` を捨てて `stage_sections / stage_blocks / performers` の 3 テーブルにし、`GET /stage` で入れ子のまま返す。演奏中かどうか（`now_playing`）はバックエンドの時計で判定する。フロントは日付の振り分け・印・帯の判定を純粋関数（`src/lib/stage-schedule.ts`）に寄せ、画面はそれを並べるだけにする。

**Tech Stack:** Go 1.x / Echo v5 / sqlc / MySQL（Backend）、Next.js 16 App Router / React 19 / Tailwind 4 / vitest / Biome（Frontend）

**Spec:** `docs/superpowers/specs/2026-10-05-stage-schedule-design.md`

## Global Constraints

- 時刻は DB に UTC で保存し、API は +09:00 で返す。フロントは +09:00 を付けて送る
- 権限: next/prev は Admin・Gakuseikai、それ以外の書き込みは Admin のみ。違反は 403
- 入力不正 400、存在しない id 404（`sql.ErrNoRows` を返せば既存の対応表で 404 になる）
- `current_order`: 0 = 未開始、1〜出演者数 = 演奏中の順番、出演者数 + 1 = 終了。next/prev は上下限で止め、エラーにしない
- `now_playing` = 現在時刻が `start_time ≦ now < end_time` かつ `1 ≦ current_order ≦ 出演者数`
- 色: 緑 `#00B894`、赤 `#e54141`。管理画面は白地・黒文字、来場者画面は黒地
- 文言: 来場者に「サーバー」などの裏側の言葉を出さない
- Biome の `--write` は触ったファイルだけに使う。shadcn の add は使わない
- コミットはタスクごと。メッセージは既存に合わせ `Feat:` / `Fix:` / `Refactor:` / `Docs:` / `Test:` + 日本語、末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- ユーザーが起動中のサーバー（:1323 / :3000）と開発 DB の `lives` テーブルには触らない。開発 DB には新テーブルの追加だけをする

## Review Focus

1. 出演者 0 人のブロック: next で current_order は 1（= 出演者数 + 1 = 終了）になり、now_playing は false、画面は「出演者はまだ登録されていません」で壊れない
2. 学生会が 2 台で同時に「次のバンドへ」: 上限を超えない（SQL の 1 文で LEAST を取る）
3. 日付をまたぐ JST/UTC: 10/31 23:30 JST 開始のブロックは 10/31 のタブに入る（UTC では 10/31 14:30 だが、逆に 0:30 JST は UTC で前日）
4. 出演者を削除して current_order が出演者数 + 1 を超えた: 終了扱いで、▶ も ✓ も壊れない（current_order > 出演者数 は全員 ✓）
5. 存在しない id への更新で値が変わらない UPDATE（RowsAffected = 0）を 404 と誤判定しない: 先に Get で存在を確かめる

---

## Part A — Backend（KCTFestNav-Backend、ブランチ `feature/stage-schedule` を `origin/develop` から）

### Task 1: スキーマとクエリ

**Files:**
- Modify: `db/schema.sql`（`lives` を削除し 3 テーブルを追加）
- Modify: `db/query.sql`（Lives のクエリを削除し Stage のクエリを追加）
- Regenerate: `internal/database/*`（`sqlc generate`）
- Create: `db/migrations/2026-10-05-stage.sql`（既存 DB 向けの手動マイグレーション）

**Interfaces — Produces（sqlc 生成）:** `ListStageSections`, `ListStageBlocks`, `ListPerformers`, `GetStageSection`, `GetStageBlock`, `GetPerformer`, `CreateStageSection(:execresult)`, `UpdateStageSection`, `DeleteStageSection`, `CreateStageBlock(:execresult)`, `UpdateStageBlock`, `DeleteStageBlock`, `CreatePerformer(:execresult)`, `UpdatePerformer`, `DeletePerformer`, `SetPerformerOrder`, `NextPerformOrder`, `AdvanceBlock`, `RewindBlock`, `ListPerformersInBlock`

- [ ] **Step 1: スキーマ**

```sql
CREATE TABLE stage_sections(
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE stage_blocks(
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  current_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (section_id) REFERENCES stage_sections(id) ON DELETE CASCADE
);

CREATE TABLE performers(
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  detail TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL,
  perform_order INT NOT NULL,
  FOREIGN KEY (block_id) REFERENCES stage_blocks(id) ON DELETE CASCADE
);
```

- [ ] **Step 2: クエリ**（next/prev は 1 文で上下限を取り、同時押しでも越えない）

```sql
-- name: AdvanceBlock :exec
UPDATE stage_blocks
SET current_order = LEAST(current_order + 1,
  (SELECT COUNT(*) FROM performers WHERE block_id = sqlc.arg(id)) + 1)
WHERE id = sqlc.arg(id);

-- name: RewindBlock :exec
UPDATE stage_blocks SET current_order = GREATEST(current_order - 1, 0) WHERE id = ?;

-- name: NextPerformOrder :one
SELECT CAST(COALESCE(MAX(perform_order), 0) + 1 AS SIGNED) FROM performers WHERE block_id = ?;
```

一覧は `ORDER BY sort_order, id` / `ORDER BY start_time, id` / `ORDER BY block_id, perform_order, id`。

- [ ] **Step 3:** `sqlc generate` → `go build ./...` は live 系が壊れるので Task 6 まで失敗してよい。`go vet ./internal/database/` が通ること
- [ ] **Step 4:** テスト DB（`kctfest_test_handler`, `kctfest_test_repository`）に新しい 3 テーブルを作り `lives` を削除。開発 DB `kctfestnav` には 3 テーブルの作成だけ（`lives` は残す）
- [ ] **Step 5:** コミット `Feat: ステージ(セクション・ブロック・出演者)のテーブルとクエリを追加した`

### Task 2: domain

**Files:** Create `internal/domain/stage.go`, `internal/domain/stage_test.go`; Modify `internal/domain/errors.go`（`ErrInvalidDirection`）

**Produces:**
```go
type StageSection struct { ID int; Name, Location string; SortOrder int; Blocks []*StageBlock }
type StageBlock struct { ID, SectionID int; StartTime, EndTime time.Time; CurrentOrder int; Performers []*Performer }
type Performer struct { ID, BlockID int; Name, Detail, ThumbnailURL string; PerformOrder int }
type MoveDirection string // "up" | "down"
func NewStageSection(name, location string, sortOrder int) (*StageSection, error)  // 名前必須
func NewStageBlock(sectionID int, start, end time.Time) (*StageBlock, error)        // end > start
func NewPerformer(blockID int, name, detail, thumbnailURL string) (*Performer, error) // 名前必須
func ValidateMoveDirection(d MoveDirection) error
func (b *StageBlock) NowPlaying(now time.Time) bool
type StageRepository interface { … Task 3 参照 }
```

- [ ] **Step 1: 失敗するテスト**: 名前が空・空白（半角/全角）で `ErrNameRequired`、end ≦ start で `ErrEndTimeAfterStartTime`、方向が up/down 以外で `ErrInvalidDirection`、`NowPlaying` の表（開始前 / 開始ちょうど / 終了ちょうど＝false / 時間内で current 0・1・n・n+1 / 出演者 0 人）
- [ ] **Step 2:** `go test ./internal/domain/ -run Stage` → FAIL（未定義）
- [ ] **Step 3:** 実装
- [ ] **Step 4:** PASS
- [ ] **Step 5:** コミット `Feat: ステージの domain を追加した`

### Task 3: repository

**Files:** Create `internal/repository/stage_repository.go`, `stage_repository_test.go`

**Produces:**
```go
type StageRepository interface {
  GetSchedule(ctx) ([]*StageSection, error)          // 入れ子で全部。並びは §3
  GetSection(ctx, id) (*StageSection, error)          // 無ければ sql.ErrNoRows
  GetBlock(ctx, id) (*StageBlock, error)              // Performers 入り
  GetPerformer(ctx, id) (*Performer, error)
  CreateSection(ctx, *StageSection) (int, error)
  UpdateSection(ctx, *StageSection) error
  DeleteSection(ctx, id) error
  CreateBlock(ctx, *StageBlock) (int, error)
  UpdateBlock(ctx, *StageBlock) error                 // current_order は触らない
  DeleteBlock(ctx, id) error
  CreatePerformer(ctx, *Performer) (int, error)       // perform_order = 最大 + 1
  UpdatePerformer(ctx, *Performer) error              // perform_order は触らない
  DeletePerformer(ctx, id) error
  MovePerformer(ctx, id, MoveDirection) error         // 隣と入れ替え(トランザクション)。端なら何もしない
  AdvanceBlock(ctx, id) error
  RewindBlock(ctx, id) error
}
```

更新・削除・移動・next/prev は先に Get して無ければ `sql.ErrNoRows`。

- [ ] **Step 1: 失敗するテスト**（実 DB、`kctfest_test_repository`、各テストで 3 テーブルを `DELETE`）: 入れ子と並び順、時刻が UTC で往復しても同じ瞬間、CASCADE（セクション削除で配下が消える）、出演者追加で perform_order が 1,2,3、Move up/down と端、Advance が出演者数 + 1 で止まる、出演者 0 人で 1 で止まる、Rewind が 0 で止まる、存在しない id で ErrNoRows
- [ ] **Step 2:** FAIL を確認 → **Step 3:** 実装 → **Step 4:** PASS
- [ ] **Step 5:** コミット `Feat: ステージの repository を追加した`

### Task 4: usecase

**Files:** Create `internal/usecase/stage_usecase.go`, `stage_usecase_test.go`

**Produces:** `NewStageUsecase(repo domain.StageRepository) *StageUsecase` と、Task 3 と同名のメソッド（引数は domain の値）。`AdvanceBlock/RewindBlock` は更新後の `*StageBlock` を返す。

- [ ] **Step 1: 失敗するテスト**（モック repo）: Admin は全部できる、Gakuseikai は Advance/Rewind だけ、Student・未ログインは 403 で repo を呼ばない、検証エラーは repo を呼ばない、Create は作った id を返す
- [ ] **Step 2–4:** FAIL → 実装 → PASS
- [ ] **Step 5:** コミット `Feat: ステージの usecase を追加した`

### Task 5: handler・router・main・エラー対応

**Files:** Create `internal/handler/stage_handler.go`, `stage_e2e_test.go`; Modify `handler.go`（`Stage` を Handlers に、`ErrInvalidDirection` を 400 に）、`router/router.go`、`cmd/main.go`

**Produces（JSON）:** `GET /stage` → `{"sections":[{id,name,location,sort_order,blocks:[{id,section_id,start_time,end_time,current_order,now_playing,performers:[{id,block_id,name,detail,thumbnail_url,perform_order}]}]}]}`。時刻は `+09:00`。POST 作成は 201 + `{"id": n}`、PUT/DELETE/move は 204、next/prev は 200 + ブロック。`NewStageHandler(uc, now func() time.Time)`。

- [ ] **Step 1: 失敗する e2e**（`kctfest_test_handler`、時計を固定）: Admin がセクション → ブロック → 出演者 3 人を作る → Gakuseikai が next → `GET /stage` で `now_playing: true`・current 1・時刻が +09:00、時間外の時計なら false、Student の next は 403、存在しない id は 404、名前なしは 400、move の方向不正は 400
- [ ] **Step 2–4:** FAIL → 実装 → PASS
- [ ] **Step 5:** コミット `Feat: ステージの API を追加した`

### Task 6: 旧ライブの削除・モック・ドキュメント

**Files:** Delete `internal/{domain,repository,usecase,handler}/live*.go`; Modify `handler.go`（Live を外す、`ErrSessionNumberLessThanOne`・`ErrInvalidLiveStatus` を消す）、`router.go`、`cmd/main.go`、`db/init/03-seed.sql`（ライブの INSERT をステージのモックに）、Create `db/seed/stage.sql`（Delete `db/seed/lives.sql` があれば）、`docs/openapi.yaml`、`README.md`

モック（spec §7）: 10/31 Live1（第一体育館 13:00–13:50、8 バンド）、癒し系ミュージシャン（中庭、14:00–14:40 / 14:50–15:30、各 3 組）。11/1 Live2（第一体育館 12:00–12:45、6 バンド）、弾き語り（中庭、13:30–13:50 / 14:00–14:20 / 14:30–14:50、各 2 組）。時刻は UTC で書く。

- [ ] **Step 1:** 削除・置き換え → `go build ./... && go vet ./...`
- [ ] **Step 2:** `go test -count=1 ./...` が全部 PASS、`go test -v -count=1 ./internal/handler/ -run E2E` でステージの e2e が SKIP でないこと
- [ ] **Step 3:** 開発 DB に `db/seed/stage.sql` を流し、:1324 で起動した一時バックエンドで `curl /stage` を確認
- [ ] **Step 4:** コミット `Refactor: 旧ライブの API を削除し、ステージのモックとドキュメントを追加した`
- [ ] **Step 5:** push・PR（develop 向け）

---

## Part B — Frontend（KCTFestNav-Frontend、ブランチ `feature/stage-schedule`）

### Task 7: API 型と純粋関数

**Files:** Create `src/lib/api/stage.ts`, `src/lib/stage-schedule.ts`, `src/lib/stage-schedule.test.ts`

**Produces:**
```ts
export type PerformerResponse = { id: number; block_id: number; name: string; detail: string; thumbnail_url: string; perform_order: number };
export type StageBlockResponse = { id: number; section_id: number; start_time: string; end_time: string; current_order: number; now_playing: boolean; performers: PerformerResponse[] };
export type StageSectionResponse = { id: number; name: string; location: string; sort_order: number; blocks: StageBlockResponse[] };

export type StageDay = { key: string /* YYYY-MM-DD JST */; label: string /* 10月31日（土） */ };
export function stageDays(sections): StageDay[]
export function pickDay(days: StageDay[], requested: string | undefined, nowMs: number): StageDay | undefined // 指定 > 今日 > 最初
export function sectionsOn(sections, dayKey): StageSectionResponse[]  // その日のブロックだけを持つセクション。空は除く。sort_order → 最初の開始時刻
export type PerformerMark = "done" | "playing" | "none";
export function performerMark(block, performer): PerformerMark       // order < current か current > 人数 → done、order == current かつ now_playing → playing
export type NowPlaying = { section; block; current: PerformerResponse; next?: PerformerResponse };
export function nowPlaying(sectionsOfDay): NowPlaying[]
export function nextUp(sectionsOfDay, nowMs): { section; block } | undefined  // 開始が now より後で最も早いブロック
export function sectionTimeRange(section): string                     // "13:00〜13:50"
export function blockTimeRange(block): string
export function sectionFinished(section, nowMs): boolean              // 全ブロックの end ≦ now
```

- [ ] **Step 1: 失敗するテスト**: 23:30 JST と 0:30 JST の振り分け、pickDay の優先順位と不正な指定、sectionsOn の並び、performerMark の表（current 0 / 2 / 人数 + 1 / 人数 + 3、now_playing true/false）、nowPlaying の next（最後は undefined）、出演者 0 人、nextUp、sectionFinished
- [ ] **Step 2–4:** `npx vitest run src/lib/stage-schedule.test.ts` FAIL → 実装 → PASS
- [ ] **Step 5:** コミット `Feat: ステージの日付・演奏中の判定を追加した`

### Task 8: 来場者画面 /stage-event

**Files:** Modify `src/app/stage-event/page.tsx`; Create `src/components/stage/{DayTabs,NowPlayingBanner,StageSectionCard,PerformerRow}.tsx`; Delete `src/components/ui/liveScheduleCard.tsx`

- 日付タブは `<Link href="?day=…" replace scroll={false}>`（サーバーで描画、searchParams から pickDay）
- 演奏中の帯 / 無ければ「次は 14:00〜 癒し系ミュージシャン」 / どちらも無ければ出さない
- セクションのカード: 名前・場所・時間帯。ブロックが 1 つなら見出しなし。終わったセクションは `<details>` でたたむ
- PerformerRow（client）: 印（✓ / ▶ 演奏中）、タップでダイアログ（名前・写真（あれば、unoptimized）・紹介文）
- 失敗時「ステージイベントの情報を読み込めませんでした。時間をおいて再度お試しください。」、空なら「ステージイベントの予定はまだありません。」
- `RefreshEvery seconds={60}`

- [ ] **Step 1:** 実装 → `npx tsc --noEmit`、`npx biome check` を触ったファイルに
- [ ] **Step 2:** 一時バックエンド（:1324）＋ `next build && next start -p 3002`、Playwright 390px で 10/31・11/1 のスクショ、帯・✓・▶・たたみを目視
- [ ] **Step 3:** コミット `Feat: ステージイベントをセクション・ブロックごとのタイムテーブルにした`

### Task 9: 学生会の「ライブ」画面（next/prev）

**Files:** Create `src/app/actions/stage.ts`（+ `stage.test.ts`）、`src/app/manage/(console)/ops/StageOps.tsx`; Modify `src/app/manage/(console)/ops/lives/page.tsx`

**Produces:** `stepBlock(blockId: number, dir: "next" | "prev"): Promise<{ error?: string; block?: StageBlockResponse }>`（POST `/manage/stage/blocks/:id/{next|prev}`、`revalidatePath("/manage/ops", "layout")`、401 はログアウトへ、404 は「このブロックは削除されています。画面を更新してください。」）

- 画面: 日付タブ（client state、既定は pickDay）、時間内のブロックを上に開いて、それ以外は時刻順に閉じる。ブロックごとに出演者の印、「前に戻す」（白地枠）と「次のバンドへ ▶」（緑・大）。終了なら「このブロックは終了しました」で次は押せない。時間外なら「時間外なので来場者には演奏中と表示されません」。useOptimistic で即反映、失敗で戻してエラー表示
- Admin には「番組表を編集」へのリンク（/manage/ops/lives/edit）

- [ ] **Step 1: 失敗するテスト**（stage.test.ts、manageRequest をモック）: next/prev のパス、0/許可外の dir は送らない、失敗文言、401 で redirect
- [ ] **Step 2–4:** FAIL → 実装 → PASS、画面は Playwright で next を押して ▶ が動くこと
- [ ] **Step 5:** コミット `Feat: 学生会のライブ画面を「次のバンドへ」で進められるようにした`

### Task 10: 管理者の番組表の編集

**Files:** Create `src/lib/manage/stage-form.ts`（+ test）、`src/app/manage/(console)/ops/lives/edit/page.tsx`、`src/app/manage/(console)/ops/stage/{SectionFormDialog,BlockFormDialog,PerformerFormDialog,DeleteStageButton,MovePerformerButtons}.tsx`; Modify `src/app/actions/stage.ts`（+ test）

**Produces:**
```ts
parseSectionForm(fd): { ok: true; payload: { name; location; sort_order } } | { ok: false; error }
parseBlockForm(fd): { ok: true; payload: { start_time; end_time } } | …   // datetime-local を +09:00 に
parsePerformerForm(fd): { ok: true; payload: { name; detail; thumbnail_url } } | … // URL は http(s)
saveSection(current: StageSectionResponse | undefined, prev, fd), saveBlock(sectionId, current, prev, fd), savePerformer(blockId, current, prev, fd)
deleteStageItem(kind: "section" | "block" | "performer", id), movePerformer(id, dir: "up" | "down")
```

- 編集ページは `requireRole(["Admin"])`
- 削除の確認で、セクション・ブロックは「中の出演者もすべて消えます」を赤で
- 並び順の入力は数値（空なら 0）

- [ ] **Step 1: 失敗するテスト**: 各 parse の必須・時刻順・URL、各 save が新規は POST / 編集は PUT、delete のパス、move の方向
- [ ] **Step 2–4:** FAIL → 実装 → PASS、Playwright で追加 → 並べ替え → 削除
- [ ] **Step 5:** コミット `Feat: 管理者が番組表(セクション・ブロック・出演者)を編集できるようにした`

### Task 11: 旧ライブのコードを削除

**Files:** Delete `src/lib/api/lives.ts`、`ops/{LiveList,LiveFormDialog,DeleteLiveButton}.tsx`; Modify `src/lib/live-schedule.ts`（お知らせの 2 つだけ残す）、`src/lib/live-schedule.test.ts`、`src/lib/manage/ops.ts`（ライブ関係を削除。`toLocalInput` は stage-form へ移す）、`ops.test.ts`、`src/app/actions/ops.ts`・`ops.test.ts`（setLiveStatus/saveLive/deleteLive を削除）

- [ ] **Step 1:** 削除 → `npx tsc --noEmit`、`npx vitest run`、`npx biome check src`
- [ ] **Step 2:** コミット `Refactor: 旧ライブの画面とコードを削除した`
- [ ] **Step 3:** 最終レビュー（opus）→ 修正 → push・PR（develop 向け。バックエンドの PR が先にマージされる必要があると明記）
