# 混雑度に「準備中」を足す Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 混雑度に 3 = 準備中(灰色)を足し、未設定のブースを準備中として返し、来場者画面・地図・管理画面で扱えるようにする。

**Architecture:** バックエンドは domain の値の範囲と、repository の「Redis に無いとき」の既定値を変えるだけ。フロントは `CongestionStatus` 型に `"preparing"` を足し、色と文言・並び順・絞り込み・管理画面のボタンをその値に合わせる。

**Tech Stack:** Go/Echo v5 + Redis、Next.js 16、React 19、vitest、Playwright

**Spec:** `docs/superpowers/specs/2026-10-07-congestion-preparing-design.md`

## Global Constraints

- 値: 0 空き / 1 少し混雑 / 2 混雑 / **3 準備中**。4 以上・負はエラー(400)
- Redis に混雑度が無いブースは **3**
- 色 `#9CA3AF`、文言: カード「準備中です」、ボタン・凡例「準備中」
- 知らない値はフロントで `"preparing"`
- 一覧の「混雑度順」: 空き → 少し混雑 → 混雑 → 準備中。「空いている」絞り込みは空きだけ
- 学生会の「混んでいる順」: 混雑 → 少し混雑 → 空き → 準備中
- 管理画面のボタンの並び: 準備中 → 空き → 少し混雑 → 混雑
- 準備中のカードには「○分前に更新」を出さない
- ユーザーのサーバー(1323・3000)と開発用 DB・Redis には触らない。確認は scratchpad の一時バックエンド(:1324)と worktree のビルド(:3002)で
- テスト: フロント `npx vitest run --project unit`、`npx tsc --noEmit`、`npx biome check <files>`。バックエンド `go test ./...`
- コミットは日本語。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. Redis に値が無いブースが一覧(GetAll)でも詳細(GetByID)でも準備中になる
2. 学生会の監視で準備中のブースが「混んでいる順」の先頭に来ない
3. 企画担当・学生会の Server Action が 3 を弾かない(今は `[0, 1, 2]` で弾いている)
4. 準備中のカードに「空いています」や「○分前に更新」が出ない
5. 古いバックエンド(3 を知らない)でも画面が壊れない

---

## Part A: バックエンド(ブランチ `feature/congestion-preparing`)

### Task 1: 値 3 と未設定の既定値

**Files:** `internal/domain/booth.go`、`internal/domain/booth_test.go`、`internal/repository/booth_repository.go`、`internal/repository/booth_repository_test.go`、`internal/handler/booth_e2e_test.go`、`docs/openapi.yaml`

- [ ] **Step 1: ブランチ** `git checkout develop && git pull --ff-only origin develop && git checkout -b feature/congestion-preparing`
- [ ] **Step 2: 失敗するテスト**(domain)

```go
func TestBoothCongestionPreparing(t *testing.T) {
	booth, _ := NewBooth(BoothParams{Name: "x"})
	if err := booth.SetCongestionStatus(BoothCongestionPreparing); err != nil || booth.CongestionStatus() != 3 {
		t.Fatalf("準備中(3)をセットできない: %v", err)
	}
	if err := ValidateCongestionLevel(4); err == nil {
		t.Fatal("4 はエラーにする")
	}
	if err := ValidateCongestionLevel(-1); err == nil {
		t.Fatal("-1 はエラーにする")
	}
}
```

Run: `go test ./internal/domain/ -run TestBoothCongestionPreparing` → Expected: FAIL(`undefined: BoothCongestionPreparing`)

- [ ] **Step 3: 実装**: `BoothCongestionPreparing CongestionStatus = 3`(コメント「準備中。まだ一度も設定していないブースもこれ」)。`ValidateCongestionLevel` の上限を `BoothCongestionPreparing` に。既存の「3 はエラー」を確かめているテスト(`TestBoothCongestionStatus` の異常値 3)は 4 に直す

Run: `go test ./internal/domain/` → PASS

- [ ] **Step 4: 失敗するテスト**(repository。Redis に混雑度を入れずに作ったブース)

```go
func TestBoothRepository_UnsetCongestionIsPreparing(t *testing.T) {
	db, rdb := setupBoothTestDB(t)
	defer db.Close()
	defer rdb.Close()
	repo := NewBoothRepository(db, rdb)
	ctx := context.Background()
	booth, _ := domain.NewBooth(domain.BoothParams{Name: "未設定"})
	assert.NoError(t, repo.Create(ctx, booth))
	var id int
	assert.NoError(t, db.QueryRow("SELECT id FROM booths LIMIT 1").Scan(&id))
	got, err := repo.GetByID(ctx, id)
	assert.NoError(t, err)
	assert.Equal(t, domain.BoothCongestionPreparing, got.CongestionStatus())
	all, err := repo.GetAll(ctx)
	assert.NoError(t, err)
	assert.Equal(t, domain.BoothCongestionPreparing, all[0].CongestionStatus())
}
```

Run → Expected: FAIL(0 が返る)

- [ ] **Step 5: 実装**: `GetByID`・`GetAll` の `redis.Nil` のときの `domain.BoothCongestionEmpty` を `domain.BoothCongestionPreparing` に。コメントも「準備中にする」に。既存テストで「未登録は空き」を確かめているものがあれば準備中に直す

Run: `go test ./internal/repository/` → PASS

- [ ] **Step 6: e2e**(`TestBoothE2E` の最後に)

```go
	t.Run("混雑度 3(準備中)を保存でき、4 は 400", func(t *testing.T) {
		var id int
		require.NoError(t, db.QueryRow("SELECT id FROM booths LIMIT 1").Scan(&id))
		patch := func(status int) int {
			b, _ := json.Marshal(map[string]int{"congestion_status": status})
			req := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/manage/booths/%d/congestion", id), bytes.NewReader(b))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			req.Header.Set("Authorization", adminAuthHeader)
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)
			return rec.Code
		}
		assert.Less(t, patch(3), 300)
		assert.Equal(t, http.StatusBadRequest, patch(4))
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, fmt.Sprintf("/booths/%d", id), nil))
		var got handler.GetBoothResponse
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
		assert.Equal(t, domain.CongestionStatus(3), got.CongestionStatus)
	})
```

(混雑度の更新の要求の型やエラーの対応が違えば、既存の UpdateCongestion の e2e に合わせる。4 が 400 にならなければ、`handler.go` の 400 の一覧に混雑度のエラーが入っているか確かめ、無ければ domain にエラー変数を作って足す — Ruling に残す)

Run: `go test ./...` → 全部 ok

- [ ] **Step 7: openapi**: congestion_status の説明を「0: 空き 1: 少し混雑 2: 混雑 3: 準備中(未設定もこれ)」に、`maximum` があれば 3 に
- [ ] **Step 8: コミット・PR**

---

## Part B: フロント(ブランチ `feature/congestion-preparing`、作成済み)

### Task 2: 型・変換・並び順・絞り込み

**Files:** `src/lib/api/booths.ts`(+test)、`src/lib/booth-browser.ts`(+test)、`src/lib/manage/ops.ts`(+test)、`src/lib/manage/congestion.ts`

- [ ] **Step 1: 失敗するテスト**
  - `booths.test.ts`: `toCongestionStatus(3)` → `"preparing"`、`toCongestionStatus(9)` → `"preparing"`(既存の「想定外は empty」のテストは preparing に直す)
  - `booth-browser.test.ts`: 混雑度順で準備中が最後(空き・少し・混雑・準備中の 4 件を混ぜて並べる)。「空いている」絞り込みで準備中が出ない。`cardUpdatedLabel({ congestionStatus: "preparing", congestionUpdatedAt: "…" }, now)` は `undefined`、空きなら今までどおりの文言
  - `ops.test.ts`: `sortBooths(…, "crowded")` で 3 のブースが最後、2 → 1 → 0 → 3
- [ ] **Step 2: 実行して失敗を見る**
- [ ] **Step 3: 実装**
  - `booths.ts`: `CongestionStatus = "empty" | "clouded" | "veryClouded" | "preparing"`、map に `3: "preparing"`、フォールバックを `"preparing"`
  - `booth-browser.ts`: `CROWD_RANK` に `preparing: 3`。`cardUpdatedLabel(booth, nowMs)` を足す(準備中なら `undefined`、それ以外は `updatedLabel(booth.congestionUpdatedAt, nowMs)`)
  - `ops.ts`: 「混んでいる順」を `CROWD_ORDER = { 2: 0, 1: 1, 0: 2, 3: 3 }` の順で比べる(知らない値は最後)
  - `congestion.ts`: `CONGESTION_LEVELS` を 準備中(3, `#9CA3AF`)→ 空き → 少し混雑 → 非常に混雑 の順に
- [ ] **Step 4: 実行して通るのを見る**(全件)、tsc(`Record<CongestionStatus, …>` の抜けを型エラーで見つけて埋める)
- [ ] **Step 5: コミット**

### Task 3: カード・一覧・地図

**Files:** `src/components/ui/boothcard.tsx`、`src/components/booths/BoothBrowser.tsx`、`src/components/map/types.ts`、`src/components/map/CampusMap.tsx`、`src/lib/map/map-booths.test.ts`

- [ ] **Step 1: 失敗するテスト**(`map-booths.test.ts`): 混雑度が準備中のブースのピンは `congestion: "preparing"`
- [ ] **Step 2: 実装**
  - `boothcard.tsx`: 文言 `preparing` → 「準備中です」、色 `"bg-[#9CA3AF] border-l border-[#d1d5db]": congestionStatus === "preparing"`
  - `BoothBrowser.tsx`: `updatedLabel={cardUpdatedLabel(booth, serverNow)}`
  - `types.ts`: `PIN_COLORS.preparing = "#9CA3AF"`
  - `CampusMap.tsx`: 凡例に `{ status: "preparing", label: "準備中" }`(最後)
- [ ] **Step 3: tsc・biome・vitest**、コミット

### Task 4: 管理画面

**Files:** `src/app/actions/my-booth.ts`、`src/app/actions/ops.ts`(+各 test)、`src/app/manage/(console)/booths/BoothList.tsx`、`src/app/manage/(console)/ops/CongestionMonitor.tsx`

- [ ] **Step 1: 失敗するテスト**: `setCongestion(…, 3)`(企画担当)と学生会の混雑度の Action が 3 を PATCH で送る。4 は送らずエラー
- [ ] **Step 2: 実装**
  - 両 Action の `[0, 1, 2]` を `CONGESTION_LEVELS.map((l) => l.value)` から作る(0〜3)
  - `BoothList.tsx`: `CONGESTION.preparing = { label: "準備中", color: "bg-[#9CA3AF]" }`
  - `CongestionMonitor.tsx`: ボタンの並びが 4 つになるので `grid-cols-3` を `grid-cols-4` に
- [ ] **Step 3: tsc・biome・vitest**、コミット

### Task 5: 実機確認と PR

- [ ] 一時バックエンド(`$SP/be` を `feature/congestion-preparing` に差し替えて :1324)。DB の形は変わらないので開発用 DB `kctfestnav` と Redis をそのまま **読むだけ** で使う(混雑度のボタンは押さない。押すと本人の Redis が変わる)
- [ ] worktree で build(:3002)、Playwright 390px:
  - クラス展示の一覧: 未設定のブースが「準備中です」(灰色)、「○分前に更新」なし。混雑度順で最後。「空いている展示」で出ない
  - 地図: 灰色のピン、凡例に準備中
  - 企画担当の画面: ボタンが 準備中・空き・少し混雑・非常に混雑。準備中が選ばれている
  - 学生会の監視: 4 つのボタン、混んでいる順で準備中が最後
- [ ] 後片付け、PR(バックエンドを先にマージと書く)
