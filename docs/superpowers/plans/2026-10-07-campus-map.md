# キャンパスマップ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/map` に 3D・2D のキャンパスマップ（ピン・棟の一覧・ブースの具体的な場所・現在地）を作り、管理画面で地図を押してブースの場所と階を登録でき、ブース詳細から「場所を見る」で開けるようにする。

**Architecture:** バックエンドはブースに `floor` 列を足すだけ。フロントは `campus-3d/campus.geojson` を `src/data/campus.json` として取り込み、計算（経緯度↔メートル、点がどの棟か、各階の高さ、ブースの位置）を `src/lib/map/` の純粋関数にする。描画は 3D（three.js、`src/components/map/scene3d.ts` + `Map3D.tsx`）と 2D（SVG、`Map2D.tsx`）に分け、どちらも同じ props（`MapProps`）を受け取る。画面の状態（絞り込み・2D/3D・選択・現在地）は `CampusMap.tsx` が持つ。

**Tech Stack:** Go/Echo v5 + sqlc(MySQL)、Next.js 16 App Router、React 19、three.js、Tailwind v4、vitest（unit）、Playwright（Chrome）

**Spec:** `docs/superpowers/specs/2026-10-07-campus-map-design.md`

## Global Constraints

- `floor`: 0 = 屋外（または未設定）、1 以上 = その階。負は 400。`x / y / z` は残して使わない
- 棟の高さ: 地面に接する部分は実測 `height`（正の数）があればそれ、無ければ `heightUsed`。浮いた部分（`baseHeight > 0`）は `heightUsed`
- 部分の階数: `storeysManual` > `storeys` > 1。階の帯の高さ = 部分の高さ ÷ 部分の階数
- 経緯度 → メートル: viewer と同じ平面近似 `x = (lon - lon0) * 111320 * cos(lat0)`, `y = (lat - lat0) * 110540`。原点は建物全体の範囲の中心
- 会場の外 = 建物全体の範囲 + 100m の外
- 位置未設定（緯度・経度とも 0）のブースはピンを出さない
- 位置情報・向きの許可は「現在地」ボタン（管理画面は「今いる場所を入れる」）を押すまで求めない
- 「今いる場所を入れる」の精度が 30m より悪ければ注意を出す
- three.js は `/map` と管理画面の地図でだけ読み込む
- ユーザーの起動中のサーバー（バックエンド :1323、フロント `npm run dev` :3000）と開発用 DB `kctfestnav` には触らない。開発用 DB へのマイグレーションはマージ後に本人が流す（先に流すと起動中の古いバックエンドの `SELECT *` が壊れる）
- フロントの確認用ビルドは scratchpad の git worktree（`node_modules` は `cp -Rc`）で行う。一時サーバーを止めるのは `kill $(lsof -ti tcp:PORT -sTCP:LISTEN)`
- テスト: フロント `npx vitest run --project unit`、型 `npx tsc --noEmit`、整形 `npx biome check <files>`。バックエンド `go test ./...`
- コミットは日本語「Feat: 〜した」。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。zsh では変数にファイルを並べず、パスを直接書く（単語分割されない）

## Review Focus

1. 統合した棟（8号館: 3・2・2 階の 3 部分）で、2 階しかない部分の上に 3 階のブースを置いた → 3 階がある部分の高さに出る（無ければその点の部分の最上階）
2. 渡り廊下のような浮いた部分の真下（地面に接する部分が無い所）を押した → 「屋外」ではなく浮いた部分の棟として扱い、階は浮いた部分の階から選べる
3. 企画担当（学生）が説明・画像だけ保存した → 管理者が入れた `floor` が 0 に戻らない
4. `/map?booth=` に存在しない ID・位置未設定のブース・数字でない値 → 選ばずに全体で開く（500 にしない）
5. 3D でピンが建物の中に隠れて押せない → ピンは建物を透かして手前に描き、建物より先に当たり判定する

---

## Part A: バックエンド（KCTFestNav-Backend、ブランチ `feature/booth-floor`）

### Task 1: ブースに floor を足す（スキーマ・domain・repository）

**Files:**
- Modify: `db/schema.sql`、`db/query.sql`（CreateBooth / UpdateBooth）、`internal/database/*`（sqlc 生成）
- Create: `db/migrations/2026-10-07-booth-floor.sql`
- Modify: `internal/domain/booth.go`、`internal/domain/errors.go`、`internal/repository/booth_repository.go`
- Test: `internal/domain/booth_test.go`、`internal/repository/booth_repository_test.go`

**Interfaces:**
- Produces: `domain.Booth.Floor int`、`domain.BoothParams.Floor int`、`domain.ErrInvalidFloor`

- [ ] **Step 1: ブランチを切る**

```bash
cd ../KCTFestNav-Backend && git checkout develop && git pull --ff-only origin develop && git checkout -b feature/booth-floor
```

- [ ] **Step 2: domain の失敗するテスト**（`internal/domain/booth_test.go` の末尾）

```go
func TestBoothFloor(t *testing.T) {
	t.Run("階を持てる(0 は屋外)", func(t *testing.T) {
		b, err := NewBooth(BoothParams{Name: "3-1 展示", Floor: 2})
		if err != nil || b.Floor != 2 {
			t.Fatalf("got %v, %v", b, err)
		}
		b, err = NewBooth(BoothParams{Name: "バザー"})
		if err != nil || b.Floor != 0 {
			t.Fatalf("got %v, %v", b, err)
		}
	})

	t.Run("負の階は作成・復元とも ErrInvalidFloor", func(t *testing.T) {
		if _, err := NewBooth(BoothParams{Name: "x", Floor: -1}); !errors.Is(err, ErrInvalidFloor) {
			t.Fatalf("NewBooth: %v", err)
		}
		if _, err := ReconstructBooth(1, BoothCongestionEmpty, BoothParams{Name: "x", Floor: -1}); !errors.Is(err, ErrInvalidFloor) {
			t.Fatalf("ReconstructBooth: %v", err)
		}
	})
}
```

import に `"errors"` を足す。

- [ ] **Step 3: 実行して失敗を見る**

Run: `go test ./internal/domain/ -run TestBoothFloor`
Expected: FAIL（`unknown field Floor`、`undefined: ErrInvalidFloor`）

- [ ] **Step 4: domain を実装**

`internal/domain/errors.go` に:

```go
var ErrInvalidFloor = errors.New("floor must be 0 or greater")
```

`internal/domain/booth.go`:
- `Booth` の `Longitude` の下に `Floor int // 階。0 は屋外(または未設定)、1 以上はその階`
- `BoothParams` の `Longitude` の下に `Floor int`
- `NewBooth` と `ReconstructBooth` の構造体に `Floor: p.Floor,`
- `NewBooth` の名前チェックの後と、`ReconstructBooth` の先頭に:

```go
	if p.Floor < 0 {
		return nil, ErrInvalidFloor
	}
```

- [ ] **Step 5: 実行して通るのを見る**

Run: `go test ./internal/domain/`
Expected: ok

- [ ] **Step 6: スキーマ・クエリ・マイグレーション**

`db/schema.sql` の booths の `longitude DOUBLE` を `longitude DOUBLE,` にし、その下に:

```sql
  floor INT NOT NULL DEFAULT 0 /* 階。0 = 屋外(または未設定) */
```

`db/query.sql`:

```sql
-- name: CreateBooth :exec
INSERT INTO booths (
name, organizer, detail, location, image_url, x, y, z, latitude, longitude, floor
) VALUES (
?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
);

-- name: UpdateBooth :exec
UPDATE booths
SET name = ?, organizer = ?, detail = ?, location = ?, image_url = ?, x = ?, y = ?, z = ?, latitude = ?, longitude = ?, floor = ?
WHERE id = ?;
```

`db/migrations/2026-10-07-booth-floor.sql`:

```sql
-- ブースに階を足す(0 = 屋外/未設定)。マイグレーションツールは未導入のため手動で流す
-- docker compose exec -T mysql mysql --default-character-set=utf8mb4 -uroot kctfestnav < db/migrations/2026-10-07-booth-floor.sql
ALTER TABLE booths ADD COLUMN floor INT NOT NULL DEFAULT 0 AFTER longitude;
```

テスト用 DB にだけ流す（開発用 `kctfestnav` には流さない）:

```bash
docker compose exec -T mysql mysql --default-character-set=utf8mb4 -uroot kctfest_test_repository < db/migrations/2026-10-07-booth-floor.sql
docker compose exec -T mysql mysql --default-character-set=utf8mb4 -uroot kctfest_test_handler < db/migrations/2026-10-07-booth-floor.sql
sqlc generate
```

Expected: `internal/database/models.go` の `Booth` に `Floor int32`、`CreateBoothParams`・`UpdateBoothParams` に `Floor int32`

- [ ] **Step 7: repository の失敗するテスト**（`internal/repository/booth_repository_test.go` の末尾）

```go
func TestBoothRepository_Floor(t *testing.T) {
	db, rdb := setupBoothTestDB(t)
	defer db.Close()
	defer rdb.Close()
	repo := NewBoothRepository(db, rdb)
	ctx := context.Background()

	booth, _ := domain.NewBooth(domain.BoothParams{Name: "3-1 展示", Floor: 2})
	assert.NoError(t, repo.Create(ctx, booth))
	var id int
	assert.NoError(t, db.QueryRow("SELECT id FROM booths LIMIT 1").Scan(&id))

	got, err := repo.GetByID(ctx, id)
	assert.NoError(t, err)
	assert.Equal(t, 2, got.Floor)

	updated, _ := domain.ReconstructBooth(id, domain.BoothCongestionEmpty, domain.BoothParams{Name: "3-1 展示", Floor: 3})
	assert.NoError(t, repo.Update(ctx, updated))
	all, err := repo.GetAll(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 3, all[0].Floor)
}
```

- [ ] **Step 8: 実行して失敗を見る**

Run: `go test ./internal/repository/ -run TestBoothRepository_Floor`
Expected: FAIL（`expected: 2 actual: 0`）

- [ ] **Step 9: repository を実装**（`booth_repository.go`）
- `Create` と `Update` の引数に `Floor: int32(b.Floor),`
- `GetByID` と `GetAll` の `domain.BoothParams{...}` に `Floor: int(dbBooth.Floor),`（GetAll は `int(b.Floor)`）

- [ ] **Step 10: 実行して通るのを見る**

Run: `go test ./internal/domain/ ./internal/repository/`
Expected: ok

- [ ] **Step 11: コミット**

```bash
git add db/schema.sql db/query.sql db/migrations/2026-10-07-booth-floor.sql internal/database internal/domain internal/repository
git commit -m "Feat: ブースに階(floor)を持たせた"
```

### Task 2: API に floor を出し入れする

**Files:**
- Modify: `internal/handler/booth_handler.go`、`internal/handler/handler.go`、`docs/openapi.yaml`、`README.md`
- Test: `internal/handler/booth_e2e_test.go`

**Interfaces:**
- Consumes: `domain.BoothParams.Floor`、`domain.ErrInvalidFloor`（Task 1）
- Produces: JSON `floor`（GET /booths, GET /booths/:id の応答、POST/PUT /manage/booths の本文）

- [ ] **Step 1: e2e の失敗するテスト**（`TestBoothE2E` の最後の `t.Run` の後に追加）

```go
	t.Run("floor を保存して返す。負の階は 400", func(t *testing.T) {
		post := func(body any) *httptest.ResponseRecorder {
			b, _ := json.Marshal(body)
			req := httptest.NewRequest(http.MethodPost, "/manage/booths", bytes.NewReader(b))
			req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
			req.Header.Set("Authorization", adminAuthHeader)
			rec := httptest.NewRecorder()
			e.ServeHTTP(rec, req)
			return rec
		}
		assert.Equal(t, http.StatusCreated, post(handler.CreateBoothRequest{Name: "階のあるブース", Floor: 2}).Code)
		assert.Equal(t, http.StatusBadRequest, post(handler.CreateBoothRequest{Name: "負の階", Floor: -1}).Code)

		var id int
		require.NoError(t, db.QueryRow("SELECT id FROM booths WHERE name = ?", "階のあるブース").Scan(&id))
		rec := httptest.NewRecorder()
		e.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, fmt.Sprintf("/booths/%d", id), nil))
		var got handler.GetBoothResponse
		require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &got))
		assert.Equal(t, 2, got.Floor)

		b, _ := json.Marshal(handler.UpdateBoothRequest{Name: "階のあるブース", Floor: 3})
		req := httptest.NewRequest(http.MethodPut, fmt.Sprintf("/manage/booths/%d", id), bytes.NewReader(b))
		req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
		req.Header.Set("Authorization", adminAuthHeader)
		e.ServeHTTP(httptest.NewRecorder(), req)
		var floor int
		require.NoError(t, db.QueryRow("SELECT floor FROM booths WHERE id = ?", id).Scan(&floor))
		assert.Equal(t, 3, floor)
	})
```

（`GET /booths/:id` の応答が `GetBoothResponse` そのものでなく包まれている場合は、既存の GET テストと同じ形で取り出す。）

- [ ] **Step 2: 実行して失敗を見る**

Run: `go test ./internal/handler/ -run TestBoothE2E`
Expected: FAIL（`unknown field Floor`）

- [ ] **Step 3: 実装**
- `GetBoothResponse`・`CreateBoothRequest`・`UpdateBoothRequest` の `Longitude` の下に `Floor int `json:"floor"``
- `toGetBoothResponse` に `Floor: b.Floor,`、`Create`・`Update` の `domain.BoothParams{...}` に `Floor: req.Floor,`
- `handler.go` の 400 の一覧に `errors.Is(err, domain.ErrInvalidFloor),`
- `docs/openapi.yaml` の Booth の応答と作成・更新の本文（`latitude` がある 3 か所）に:

```yaml
        floor:
          type: integer
          minimum: 0
          description: 階。0 は屋外(または未設定)、1 以上はその階
```

- `README.md` のマイグレーションの説明に `db/migrations/2026-10-07-booth-floor.sql` を足す

- [ ] **Step 4: 実行して通るのを見る**

Run: `go test ./...`
Expected: ok（全パッケージ）

- [ ] **Step 5: コミットして PR**

```bash
git add internal/handler docs/openapi.yaml README.md
git commit -m "Feat: ブースの API で階(floor)を出し入れできるようにした"
git push -u origin feature/booth-floor
gh pr create --base develop --title "ブースに階(floor)を追加" --body "<概要・マイグレーションの流し方(マージ後に kctfestnav へ)・テスト結果>"
```

---

## Part B: フロント（KCTFestNav-Frontend、ブランチ `feature/campus-map`、作成済み）

### Task 3: データの取り込みと計算（src/lib/map/campus.ts）

**Files:**
- Create: `src/data/campus.json`（`../campus-3d/campus.geojson` をコピー）、`src/lib/map/campus.ts`、`src/lib/map/campus.test.ts`
- Modify: `src/lib/api/booths.ts`、`src/lib/api/booths.test.ts`

**Interfaces:**
- Produces:

```ts
export type LonLat = [number, number];
export type XY = [number, number];
export type Part = { polygons: XY[][][]; bottom: number; height: number; storeys: number; baseFloor: number };
export type Building = { id: string; name?: string; parts: Part[]; floors: number; center: XY; top: number };
export type Campus = { buildings: Building[]; toXY(lon: number, lat: number): XY; toLonLat(x: number, y: number): LonLat; bounds: { minX: number; maxX: number; minY: number; maxY: number } };
export function loadCampus(data: CampusData): Campus;
export function buildingAt(campus: Campus, xy: XY): { building: Building; parts: Part[] } | undefined;
export function floorBand(part: Part, floor: number): { bottom: number; top: number } | undefined;
export function placeOnFloor(campus: Campus, xy: XY, floor: number): { elevation: number; building?: Building; floor: number };
export function nearCampus(campus: Campus, xy: XY, marginM?: number): boolean;
export function floorLabel(floor: number): string; // 0 → "屋外", 2 → "2F"
// booths.ts: Booth に floor: number(既定 0)、BoothResponse に floor?: number
```

- [ ] **Step 1: データをコピー**

```bash
mkdir -p src/data && cp ../campus-3d/campus.geojson src/data/campus.json
```

- [ ] **Step 2: 失敗するテスト** `src/lib/map/campus.test.ts`

```ts
import { describe, expect, it } from "vitest";
import realData from "@/data/campus.json";
import {
  buildingAt,
  type CampusData,
  floorBand,
  floorLabel,
  loadCampus,
  nearCampus,
  placeOnFloor,
} from "./campus";

const LAT = 33.816;
const LON = 130.872;
const M_LAT = 1 / 110540;
const M_LON = 1 / (111320 * Math.cos((LAT * Math.PI) / 180));

// 原点から (x0,y0) の位置にある w×h メートルの長方形(経緯度)
const rect = (x0: number, y0: number, w: number, h: number) => [
  [LON + x0 * M_LON, LAT + y0 * M_LAT],
  [LON + (x0 + w) * M_LON, LAT + y0 * M_LAT],
  [LON + (x0 + w) * M_LON, LAT + (y0 + h) * M_LAT],
  [LON + x0 * M_LON, LAT + (y0 + h) * M_LAT],
  [LON + x0 * M_LON, LAT + y0 * M_LAT],
];

type Props = CampusData["features"][number]["properties"];
const feature = (
  buildingId: string,
  ring: number[][],
  props: Partial<Props> = {},
  holes: number[][][] = [],
) => ({
  type: "Feature",
  geometry: { type: "Polygon", coordinates: [ring, ...holes] },
  properties: {
    buildingId,
    buildingName: null,
    height: null,
    heightUsed: 3.5,
    storeys: null,
    storeysManual: null,
    baseFloor: null,
    baseHeight: 0,
    ...props,
  },
});

const data = {
  type: "FeatureCollection",
  features: [
    // 4 階建て(実測 14m)。真ん中に 2m 四方の中庭(穴)
    feature("A", rect(0, 0, 20, 20), { buildingName: "A館", height: 14, storeysManual: 4 }, [rect(9, 9, 2, 2)]),
    // 天井の高い 1 階建て(体育館)
    feature("G", rect(40, 0, 20, 20), { buildingName: "体育館", height: 11.7, storeysManual: 1 }),
    // 統合した棟: 3 階の部分と 2 階の部分
    feature("M", rect(0, 40, 10, 10), { buildingName: "M館", height: 10.5, storeysManual: 3 }),
    feature("M", rect(10, 40, 10, 10), { buildingName: "M館", height: 7, storeysManual: 2 }),
    // 渡り廊下: 2 階から 1 階分浮いている(実測 height は地面からなので使わない)
    feature("W", rect(25, 5, 10, 2), { height: 9, storeysManual: 1, baseFloor: 2, baseHeight: 3.5, heightUsed: 3.5 }),
    // 実測が無く階数も無い倉庫
    feature("S", rect(70, 0, 5, 5), { heightUsed: 6 }),
  ],
} as unknown as CampusData;

const campus = loadCampus(data);
const at = (x: number, y: number) => campus.toXY(LON + x * M_LON, LAT + y * M_LAT);
const byId = (id: string) => campus.buildings.find((b) => b.id === id)!;

describe("loadCampus", () => {
  it("部分を棟にまとめ、名前・階数を持つ", () => {
    expect(campus.buildings.map((b) => [b.id, b.name, b.floors])).toEqual([
      ["A", "A館", 4],
      ["G", "体育館", 1],
      ["M", "M館", 3],
      ["W", undefined, 2],
      ["S", undefined, 1],
    ]);
  });

  it("高さは実測を優先し、浮いた部分と実測の無い部分は heightUsed", () => {
    expect(byId("G").parts[0].height).toBeCloseTo(11.7);
    expect(byId("W").parts[0]).toMatchObject({ bottom: 3.5, height: 3.5, baseFloor: 2 });
    expect(byId("S").parts[0].height).toBe(6);
  });

  it("経緯度とメートルを行き来できる", () => {
    const [x, y] = at(10, 10);
    const [lon, lat] = campus.toLonLat(x, y);
    expect(lon).toBeCloseTo(LON + 10 * M_LON, 9);
    expect(lat).toBeCloseTo(LAT + 10 * M_LAT, 9);
  });
});

describe("buildingAt", () => {
  it("点を含む棟。穴(中庭)と外は undefined", () => {
    expect(buildingAt(campus, at(5, 5))?.building.id).toBe("A");
    expect(buildingAt(campus, at(10, 10))).toBeUndefined();
    expect(buildingAt(campus, at(30, 30))).toBeUndefined();
  });

  it("渡り廊下の下は浮いた部分の棟として返す", () => {
    expect(buildingAt(campus, at(30, 6))?.building.id).toBe("W");
  });
});

describe("floorBand / placeOnFloor", () => {
  it("階の帯 = 部分の高さ ÷ 階数", () => {
    expect(floorBand(byId("A").parts[0], 2)).toEqual({ bottom: 3.5, top: 7 });
    expect(floorBand(byId("G").parts[0], 1)).toEqual({ bottom: 0, top: 11.7 });
    expect(floorBand(byId("A").parts[0], 5)).toBeUndefined();
    expect(floorBand(byId("W").parts[0], 1)).toBeUndefined();
    expect(floorBand(byId("W").parts[0], 2)).toEqual({ bottom: 3.5, top: 7 });
  });

  it("ブースの床の高さ。屋外は地面", () => {
    expect(placeOnFloor(campus, at(5, 5), 3)).toMatchObject({ elevation: 7, floor: 3 });
    expect(placeOnFloor(campus, at(5, 5), 3).building?.id).toBe("A");
    expect(placeOnFloor(campus, at(30, 30), 0)).toEqual({ elevation: 0, building: undefined, floor: 0 });
  });

  it("統合した棟で、その点の部分に無い階は部分の最上階に置く", () => {
    // 2 階建ての部分の上に 3 階のブース
    expect(placeOnFloor(campus, at(15, 45), 3).elevation).toBeCloseTo(3.5);
    expect(placeOnFloor(campus, at(5, 45), 3).elevation).toBeCloseTo(7);
  });

  it("建物の外で階が付いていても地面", () => {
    expect(placeOnFloor(campus, at(30, 30), 2)).toEqual({ elevation: 0, building: undefined, floor: 0 });
  });
});

describe("nearCampus / floorLabel", () => {
  it("建物全体の範囲 + 100m の内側か", () => {
    expect(nearCampus(campus, at(-50, 0))).toBe(true);
    expect(nearCampus(campus, at(-150, 0))).toBe(false);
  });

  it("階の表記", () => {
    expect(floorLabel(0)).toBe("屋外");
    expect(floorLabel(2)).toBe("2F");
  });
});

describe("本物のデータ", () => {
  const real = loadCampus(realData as unknown as CampusData);
  it("名前のある棟と、8号館・体育館の階数と高さ", () => {
    const named = real.buildings.filter((b) => b.name);
    expect(named.length).toBe(12);
    expect(named.find((b) => b.name === "8号館")?.floors).toBe(3);
    const gym = named.find((b) => b.name?.startsWith("体育館"));
    expect(gym?.floors).toBe(1);
    expect(gym?.parts[0].height).toBeCloseTo(11.7);
  });
});
```

- [ ] **Step 3: 実行して失敗を見る**

Run: `npx vitest run --project unit src/lib/map/campus.test.ts`
Expected: FAIL（`./campus` が見つからない）

- [ ] **Step 4: 実装** `src/lib/map/campus.ts`

```ts
/**
 * キャンパスの建物データ(campus-3d/viewer.html で書き出した GeoJSON)と、地図の計算。
 * 座標は「原点(建物全体の範囲の中心)からのメートル」。x は東、y は北
 */

export type LonLat = [number, number];
export type XY = [number, number];

type RingLL = number[][];
type Geometry =
  | { type: "Polygon"; coordinates: RingLL[] }
  | { type: "MultiPolygon"; coordinates: RingLL[][] };

export type CampusData = {
  features: {
    geometry: Geometry;
    properties: {
      buildingId: string;
      buildingName: string | null;
      /** PLATEAU の実測(m)。地面からの高さ */
      height: number | null;
      /** viewer で使った高さ(m) */
      heightUsed: number;
      storeys: number | null;
      storeysManual: number | null;
      baseFloor: number | null;
      baseHeight: number;
    };
  }[];
};

/** 建物の 1 部分。polygons は [外周, ...穴] の配列 */
export type Part = {
  polygons: XY[][][];
  /** 下端の高さ(m)。渡り廊下など浮いた部分は 0 より大きい */
  bottom: number;
  height: number;
  storeys: number;
  /** この部分の一番下の階 */
  baseFloor: number;
};

export type Building = {
  id: string;
  name?: string;
  parts: Part[];
  /** 棟の階数(部分のうち最も上の階) */
  floors: number;
  /** ラベルを置く位置(一番大きい部分の外周の頂点の平均) */
  center: XY;
  /** 一番高い所(m) */
  top: number;
};

export type Campus = {
  buildings: Building[];
  toXY(lon: number, lat: number): XY;
  toLonLat(x: number, y: number): LonLat;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
};

const polygonsOf = (g: Geometry): RingLL[][] =>
  g.type === "MultiPolygon" ? g.coordinates : [g.coordinates];

function area(ring: XY[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
  }
  return Math.abs(a / 2);
}

export function loadCampus(data: CampusData): Campus {
  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLon = Number.POSITIVE_INFINITY;
  let maxLon = Number.NEGATIVE_INFINITY;
  for (const f of data.features) {
    for (const [outer] of polygonsOf(f.geometry)) {
      for (const [lon, lat] of outer) {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
      }
    }
  }
  const lat0 = (minLat + maxLat) / 2;
  const lon0 = (minLon + maxLon) / 2;
  // viewer.html と同じ平面近似(キャンパス程度の範囲なら十分)
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const ky = 110540;
  const toXY = (lon: number, lat: number): XY => [(lon - lon0) * kx, (lat - lat0) * ky];
  const toLonLat = (x: number, y: number): LonLat => [lon0 + x / kx, lat0 + y / ky];

  const byId = new Map<string, { name?: string; parts: Part[] }>();
  for (const f of data.features) {
    const p = f.properties;
    const floating = p.baseHeight > 0;
    // 浮いた部分の実測は地面からの値なので使わない。実測の無い部分は viewer の高さ
    const height = !floating && p.height != null && p.height > 0 ? p.height : p.heightUsed;
    const part: Part = {
      polygons: polygonsOf(f.geometry).map((poly) =>
        poly.map((ring) => ring.map(([lon, lat]) => toXY(lon, lat))),
      ),
      bottom: p.baseHeight,
      height,
      storeys: Math.max(1, p.storeysManual ?? p.storeys ?? 1),
      baseFloor: p.baseFloor ?? 1,
    };
    const entry = byId.get(p.buildingId) ?? { name: p.buildingName ?? undefined, parts: [] };
    entry.parts.push(part);
    byId.set(p.buildingId, entry);
  }

  const buildings: Building[] = [...byId].map(([id, { name, parts }]) => {
    const main = parts.reduce((a, b) =>
      area(a.polygons[0][0]) >= area(b.polygons[0][0]) ? a : b,
    );
    const outer = main.polygons[0][0].slice(0, -1);
    return {
      id,
      name,
      parts,
      floors: Math.max(...parts.map((p) => p.baseFloor + p.storeys - 1)),
      center: [
        outer.reduce((s, [x]) => s + x, 0) / outer.length,
        outer.reduce((s, [, y]) => s + y, 0) / outer.length,
      ],
      top: Math.max(...parts.map((p) => p.bottom + p.height)),
    };
  });

  const [x0, y0] = toXY(minLon, minLat);
  const [x1, y1] = toXY(maxLon, maxLat);
  return {
    buildings,
    toXY,
    toLonLat,
    bounds: { minX: x0, maxX: x1, minY: y0, maxY: y1 },
  };
}

function inRing([x, y]: XY, ring: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 点がこの部分の中か(穴の中は外) */
export const inPart = (xy: XY, part: Part) =>
  part.polygons.some(([outer, ...holes]) => inRing(xy, outer) && !holes.some((h) => inRing(xy, h)));

/** 点を含む棟と、その点を含む部分(下の部分から順) */
export function buildingAt(
  campus: Campus,
  xy: XY,
): { building: Building; parts: Part[] } | undefined {
  for (const building of campus.buildings) {
    const parts = building.parts
      .filter((p) => inPart(xy, p))
      .sort((a, b) => a.baseFloor - b.baseFloor);
    if (parts.length > 0) return { building, parts };
  }
  return undefined;
}

/** その部分のその階の床と天井の高さ。その部分に無い階は undefined */
export function floorBand(part: Part, floor: number): { bottom: number; top: number } | undefined {
  if (floor < part.baseFloor || floor > part.baseFloor + part.storeys - 1) return undefined;
  const h = part.height / part.storeys;
  const bottom = part.bottom + (floor - part.baseFloor) * h;
  return { bottom, top: bottom + h };
}

/**
 * ブースを置く高さ。建物の中ならその階の床、外(または階 0)なら地面。
 * その点の部分にその階が無いとき(統合した棟の低い部分など)は、その点の部分の最上階の床
 */
export function placeOnFloor(
  campus: Campus,
  xy: XY,
  floor: number,
): { elevation: number; building?: Building; floor: number } {
  const hit = floor > 0 ? buildingAt(campus, xy) : undefined;
  if (!hit) return { elevation: 0, building: undefined, floor: 0 };
  for (const part of hit.parts) {
    const band = floorBand(part, floor);
    if (band) return { elevation: band.bottom, building: hit.building, floor };
  }
  const top = hit.parts[hit.parts.length - 1];
  const band = floorBand(top, top.baseFloor + top.storeys - 1);
  return { elevation: band?.bottom ?? 0, building: hit.building, floor };
}

/** 建物全体の範囲 + margin の内側か */
export function nearCampus(campus: Campus, [x, y]: XY, marginM = 100): boolean {
  const { minX, maxX, minY, maxY } = campus.bounds;
  return x >= minX - marginM && x <= maxX + marginM && y >= minY - marginM && y <= maxY + marginM;
}

export const floorLabel = (floor: number) => (floor > 0 ? `${floor}F` : "屋外");
```

- [ ] **Step 5: 実行して通るのを見る**

Run: `npx vitest run --project unit src/lib/map/campus.test.ts`
Expected: PASS（全件）。本物のデータの件で名前のある棟の数が違えば、`python3` で `campus.json` の `buildingName` を数えて実際の数に合わせ、ledger に Ruling を残す

- [ ] **Step 6: Booth に floor を足す（失敗するテスト）** `src/lib/api/booths.test.ts` の `toBooth` の describe に:

```ts
  it("階を受け取る。古いバックエンド(floor なし)は 0", () => {
    expect(toBooth({ ...raw, floor: 2 }).floor).toBe(2);
    const { floor: _floor, ...old } = { ...raw, floor: 1 };
    expect(toBooth(old).floor).toBe(0);
  });
```

（`raw` は同じファイルの既存の BoothResponse の見本。名前が違えばそれに合わせる。）

Run: `npx vitest run --project unit src/lib/api/booths.test.ts`
Expected: FAIL（`floor` が undefined）

- [ ] **Step 7: 実装** `src/lib/api/booths.ts`
- `BoothResponse` に `/** 階。0 は屋外(または未設定)。古いバックエンドでは無い */ floor?: number;`
- `Booth` に `/** 階。0 は屋外(または未設定) */ floor: number;`
- `toBooth` に `floor: res.floor ?? 0,`

Run: `npx vitest run --project unit && npx tsc --noEmit`
Expected: PASS、型エラーなし（`Booth` を手で作っているテストがあれば `floor: 0` を足す）

- [ ] **Step 8: コミット**

```bash
git add src/data/campus.json src/lib/map src/lib/api
git commit -m "Feat: キャンパスの建物データと地図の計算を追加し、ブースに階を持たせた"
```

### Task 4: 地図の画面の状態（src/lib/map/map-booths.ts）

**Files:**
- Create: `src/lib/map/map-booths.ts`、`src/lib/map/map-booths.test.ts`

**Interfaces:**
- Consumes: `Booth`（floor 付き）、`parseGrade`（`@/lib/booth-grade`）、`Campus`・`placeOnFloor`・`buildingAt`（Task 3）
- Produces:

```ts
export type MapType = "all" | "class" | "club";
export type MapView = "3d" | "2d";
export type MapQuery = { type: MapType; view?: MapView; boothId?: number };
export type MapState = { type: MapType; view: MapView; boothId: number | null };
export type MapPin = { id: number; xy: XY; elevation: number; floor: number; kind: "class" | "club"; buildingId?: string };
export function parseMapQuery(p: Record<string, string | string[] | undefined>): MapQuery;
export function resolveInitial(q: MapQuery, booths: Booth[]): MapState;
export function mapQuery(s: MapState): string;
export function boothKind(b: Booth): "class" | "club";
export function mapPins(campus: Campus, booths: Booth[], type: MapType): MapPin[];
export function boothsByFloor(pins: MapPin[], booths: Booth[], buildingId: string): { floor: number; booths: Booth[] }[];
```

- [ ] **Step 1: 失敗するテスト** `src/lib/map/map-booths.test.ts`

```ts
import { describe, expect, it } from "vitest";
import type { Booth } from "@/lib/api/booths";
import { loadCampus, type CampusData } from "./campus";
import {
  boothKind,
  boothsByFloor,
  mapPins,
  mapQuery,
  parseMapQuery,
  resolveInitial,
} from "./map-booths";

const LAT = 33.816;
const LON = 130.872;
const M_LAT = 1 / 110540;
const M_LON = 1 / (111320 * Math.cos((LAT * Math.PI) / 180));
const ll = (x: number, y: number) => ({ longitude: LON + x * M_LON, latitude: LAT + y * M_LAT });
const rect = (x0: number, y0: number, w: number, h: number) =>
  [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h], [x0, y0]].map(([x, y]) => [
    LON + x * M_LON,
    LAT + y * M_LAT,
  ]);
const campus = loadCampus({
  features: [
    {
      geometry: { type: "Polygon", coordinates: [rect(0, 0, 20, 20)] },
      properties: {
        buildingId: "A", buildingName: "A館", height: 14, heightUsed: 14,
        storeys: 4, storeysManual: 4, baseFloor: null, baseHeight: 0,
      },
    },
  ],
} as CampusData);

const booth = (id: number, organizer: string, floor: number, pos?: { latitude: number; longitude: number }): Booth => ({
  id,
  name: `ブース${id}`,
  description: "",
  organizer,
  location: "",
  congestionStatus: "empty",
  floor,
  ...pos,
});

const booths = [
  booth(1, "3-1", 2, ll(5, 5)),
  booth(2, "2-4", 1, ll(15, 15)),
  booth(3, "軽音部", 0, ll(40, 40)),
  booth(4, "1-1", 0), // 位置未設定
];

describe("parseMapQuery", () => {
  it("type・view・booth を読む。おかしな値は無視", () => {
    expect(parseMapQuery({ type: "club", view: "2d", booth: "3" })).toEqual({ type: "club", view: "2d", boothId: 3 });
    expect(parseMapQuery({ type: "x", view: "4d", booth: "abc" })).toEqual({ type: "all" });
    expect(parseMapQuery({ booth: ["1", "2"] })).toEqual({ type: "all" });
  });
});

describe("resolveInitial", () => {
  it("指定が無ければ 3D・全部。クラブバザーなら 2D", () => {
    expect(resolveInitial({ type: "all" }, booths)).toEqual({ type: "all", view: "3d", boothId: null });
    expect(resolveInitial({ type: "club" }, booths)).toEqual({ type: "club", view: "2d", boothId: null });
    expect(resolveInitial({ type: "club", view: "3d" }, booths).view).toBe("3d");
  });

  it("ブース指定: 建物の中は 3D、屋外は 2D。無い・位置未設定のブースは選ばない", () => {
    expect(resolveInitial({ type: "all", boothId: 1 }, booths)).toEqual({ type: "all", view: "3d", boothId: 1 });
    expect(resolveInitial({ type: "all", boothId: 3 }, booths)).toEqual({ type: "all", view: "2d", boothId: 3 });
    expect(resolveInitial({ type: "all", boothId: 4 }, booths).boothId).toBeNull();
    expect(resolveInitial({ type: "all", boothId: 99 }, booths).boothId).toBeNull();
  });
});

describe("mapQuery", () => {
  it("既定値は書かない", () => {
    expect(mapQuery({ type: "all", view: "3d", boothId: null })).toBe("");
    expect(mapQuery({ type: "club", view: "2d", boothId: 3 })).toBe("?type=club&view=2d&booth=3");
  });
});

describe("pins", () => {
  it("種類はクラス(学年-組)かそれ以外", () => {
    expect(boothKind(booths[0])).toBe("class");
    expect(boothKind(booths[2])).toBe("club");
  });

  it("位置のあるブースだけ、絞り込みに合わせて、床の高さに置く", () => {
    const all = mapPins(campus, booths, "all");
    expect(all.map((p) => [p.id, p.kind, p.floor, p.buildingId])).toEqual([
      [1, "class", 2, "A"],
      [2, "class", 1, "A"],
      [3, "club", 0, undefined],
    ]);
    expect(all[0].elevation).toBeCloseTo(3.5);
    expect(mapPins(campus, booths, "club").map((p) => p.id)).toEqual([3]);
  });

  it("棟のブースを階ごとに", () => {
    const pins = mapPins(campus, booths, "all");
    expect(boothsByFloor(pins, booths, "A").map((g) => [g.floor, g.booths.map((b) => b.id)])).toEqual([
      [1, [2]],
      [2, [1]],
    ]);
  });
});
```

- [ ] **Step 2: 実行して失敗を見る**

Run: `npx vitest run --project unit src/lib/map/map-booths.test.ts`
Expected: FAIL（`./map-booths` が見つからない）

- [ ] **Step 3: 実装** `src/lib/map/map-booths.ts`

```ts
import type { Booth } from "@/lib/api/booths";
import { parseGrade } from "@/lib/booth-grade";
import { type Campus, placeOnFloor, type XY } from "./campus";

export type MapType = "all" | "class" | "club";
export type MapView = "3d" | "2d";
export type MapQuery = { type: MapType; view?: MapView; boothId?: number };
export type MapState = { type: MapType; view: MapView; boothId: number | null };
export type MapPin = {
  id: number;
  xy: XY;
  elevation: number;
  floor: number;
  kind: "class" | "club";
  buildingId?: string;
};

const TYPES: MapType[] = ["all", "class", "club"];
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export function parseMapQuery(p: Record<string, string | string[] | undefined>): MapQuery {
  const type = TYPES.find((t) => t === one(p.type)) ?? "all";
  const view = one(p.view) === "2d" || one(p.view) === "3d" ? (one(p.view) as MapView) : undefined;
  const id = Number(one(p.booth));
  return {
    type,
    ...(view && { view }),
    ...(Number.isInteger(id) && id > 0 && { boothId: id }),
  };
}

const hasLocation = (b: Booth) => b.latitude !== undefined && b.longitude !== undefined;

/** 開いたときの状態。指定されたブースが選べなければ選ばずに全体を出す */
export function resolveInitial(q: MapQuery, booths: Booth[]): MapState {
  const booth = booths.find((b) => b.id === q.boothId && hasLocation(b));
  const view = q.view ?? (booth ? (booth.floor > 0 ? "3d" : "2d") : q.type === "club" ? "2d" : "3d");
  return { type: q.type, view, boothId: booth?.id ?? null };
}

/** URL の ?以降。既定値(全部・3D・選択なし)は書かない */
export function mapQuery(s: MapState): string {
  const p = new URLSearchParams();
  if (s.type !== "all") p.set("type", s.type);
  if (s.view !== "3d") p.set("view", s.view);
  if (s.boothId !== null) p.set("booth", String(s.boothId));
  const q = p.toString();
  return q ? `?${q}` : "";
}

/** クラス展示は主催者が「学年-組」 */
export const boothKind = (b: Booth): "class" | "club" =>
  parseGrade(b.organizer) !== null ? "class" : "club";

export function mapPins(campus: Campus, booths: Booth[], type: MapType): MapPin[] {
  return booths
    .filter((b) => hasLocation(b) && (type === "all" || boothKind(b) === type))
    .map((b) => {
      const xy = campus.toXY(b.longitude as number, b.latitude as number);
      const place = placeOnFloor(campus, xy, b.floor);
      return {
        id: b.id,
        xy,
        elevation: place.elevation,
        floor: place.floor,
        kind: boothKind(b),
        buildingId: place.building?.id,
      };
    });
}

/** 棟の中のブースを階の低い順に */
export function boothsByFloor(
  pins: MapPin[],
  booths: Booth[],
  buildingId: string,
): { floor: number; booths: Booth[] }[] {
  const groups = new Map<number, Booth[]>();
  for (const pin of pins) {
    if (pin.buildingId !== buildingId) continue;
    const booth = booths.find((b) => b.id === pin.id);
    if (booth) groups.set(pin.floor, [...(groups.get(pin.floor) ?? []), booth]);
  }
  return [...groups]
    .sort(([a], [b]) => a - b)
    .map(([floor, list]) => ({ floor, booths: list }));
}
```

- [ ] **Step 4: 実行して通るのを見る**

Run: `npx vitest run --project unit src/lib/map/map-booths.test.ts && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/lib/map/map-booths.ts src/lib/map/map-booths.test.ts
git commit -m "Feat: 地図のピンと絞り込み・URL の状態を決める関数を追加した"
```

### Task 5: 3D の描画（three.js）

**Files:**
- Modify: `package.json`、`package-lock.json`（three を追加）
- Create: `src/components/map/types.ts`、`src/components/map/scene3d.ts`、`src/components/map/Map3D.tsx`

**Interfaces:**
- Consumes: `Campus`・`Part`・`floorBand`（Task 3）、`MapPin`（Task 4）
- Produces:

```ts
// types.ts
export type MapFocus = { buildingId: string; floor: number } | null; // floor 0 = 棟全体
export type MapLocation = { xy: XY; accuracy: number; heading?: number } | null;
export type MapProps = {
  campus: Campus; pins: MapPin[]; selectedPinId: number | null; focus: MapFocus; location: MapLocation;
  onPickPin(id: number): void; onPickBuilding(id: string): void; onPickNothing(): void;
};
// Map3D.tsx: export default function Map3D(props: MapProps)
```

- [ ] **Step 1: three を入れる**

```bash
npm install three@0.186.1 && npm install -D @types/three
```

Expected: `package.json` の dependencies に `"three": "0.186.1"`（`^` が付けば外して固定）

- [ ] **Step 2: 型** `src/components/map/types.ts`

```ts
import type { Campus, XY } from "@/lib/map/campus";
import type { MapPin } from "@/lib/map/map-booths";

/** 色を付ける棟と階。floor 0 は棟全体(階を強調しない) */
export type MapFocus = { buildingId: string; floor: number } | null;

export type MapLocation = { xy: XY; accuracy: number; heading?: number } | null;

/** 3D と 2D が共通で受け取るもの */
export type MapProps = {
  campus: Campus;
  pins: MapPin[];
  selectedPinId: number | null;
  focus: MapFocus;
  location: MapLocation;
  onPickPin(id: number): void;
  onPickBuilding(id: string): void;
  onPickNothing(): void;
};

export const PIN_COLORS = { class: "#00B894", club: "#FDCB6E" } as const;
```

- [ ] **Step 3: シーン** `src/components/map/scene3d.ts`

```ts
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { type Campus, floorBand, floorLabel, type Part } from "@/lib/map/campus";
import type { MapPin } from "@/lib/map/map-booths";
import { type MapFocus, type MapLocation, PIN_COLORS } from "./types";

export type Hit = { pin: number } | { building: string } | null;

const COLOR = {
  bg: "#0b0d10",
  ground: "#16191e",
  named: "#d9dde3",
  unnamed: "#59616c",
  dim: "#3a4049",
  focus: "#3d8bff",
  band: "#ffd166",
  me: "#4f8cff",
};

const mat = (color: string, opacity = 1) =>
  new THREE.MeshLambertMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity === 1 });

function shapesOf(part: Part) {
  return part.polygons.map(([outer, ...holes]) => {
    const shape = new THREE.Shape(outer.map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes = holes.map((h) => new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
    return shape;
  });
}

/** 部分を from〜to(m) の高さで押し出した箱。平面図の y(北) は 3D の -z */
function slab(part: Part, from: number, to: number, material: THREE.Material) {
  const geom = new THREE.ExtrudeGeometry(shapesOf(part), { depth: Math.max(to - from, 0.05), bevelEnabled: false });
  geom.rotateX(-Math.PI / 2);
  geom.translate(0, from, 0);
  const mesh = new THREE.Mesh(geom, material);
  if (material instanceof THREE.MeshLambertMaterial && !material.transparent) {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geom, 30), new THREE.LineBasicMaterial({ color: "#20252b" })));
  }
  return mesh;
}

const toScene = ([x, y]: [number, number], elevation = 0) => new THREE.Vector3(x, elevation, -y);

function label(text: string, className: string) {
  const div = document.createElement("div");
  div.className = className;
  div.textContent = text;
  return new CSS2DObject(div);
}

function dispose(obj: THREE.Object3D) {
  obj.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line) {
      o.geometry.dispose();
    }
    if (o instanceof CSS2DObject) o.element.remove();
  });
}

/** 3D の地図。React からは set* を呼ぶだけにして、three.js の状態はここに閉じ込める */
export function createScene(host: HTMLElement, campus: Campus, onHit: (hit: Hit) => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(host.clientWidth, host.clientHeight);
  Object.assign(labelRenderer.domElement.style, { position: "absolute", inset: "0", pointerEvents: "none" });
  host.appendChild(labelRenderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(COLOR.bg);
  scene.add(new THREE.HemisphereLight("#ffffff", "#3a3f46", 1.6));
  const sun = new THREE.DirectionalLight("#ffffff", 1.4);
  sun.position.set(-150, 300, 200);
  scene.add(sun);

  const { minX, maxX, minY, maxY } = campus.bounds;
  const span = Math.max(maxX - minX, maxY - minY);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(span * 1.6, span * 1.6),
    new THREE.MeshLambertMaterial({ color: COLOR.ground }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set((minX + maxX) / 2, -0.05, -(minY + maxY) / 2);
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 1, 5000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.enableDamping = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  const home = toScene([(minX + maxX) / 2, (minY + maxY) / 2]);
  controls.target.copy(home);
  camera.position.set(home.x - span * 0.35, span * 0.75, home.z + span * 0.75);
  controls.update();

  const buildingGroup = new THREE.Group();
  const pinGroup = new THREE.Group();
  const meGroup = new THREE.Group();
  scene.add(buildingGroup, pinGroup, meGroup);

  // ---- 建物 ----
  function setBuildings(focus: MapFocus) {
    dispose(buildingGroup);
    buildingGroup.clear();
    for (const b of campus.buildings) {
      const group = new THREE.Group();
      group.userData.buildingId = b.id;
      const focused = focus?.buildingId === b.id;
      const base = focus ? COLOR.dim : b.name ? COLOR.named : COLOR.unnamed;
      for (const part of b.parts) {
        const top = part.bottom + part.height;
        const band = focused && focus.floor > 0 ? floorBand(part, focus.floor) : undefined;
        if (!focused) {
          group.add(slab(part, part.bottom, top, mat(base)));
        } else if (focus.floor === 0) {
          group.add(slab(part, part.bottom, top, mat(COLOR.focus)));
        } else if (band) {
          // 選んだ階まで色付き、その床を帯で、上の階は半透明にして中のピンを見せる
          if (band.bottom > part.bottom) group.add(slab(part, part.bottom, band.bottom, mat(COLOR.focus)));
          group.add(slab(part, band.bottom, band.bottom + 0.3, mat(COLOR.band)));
          group.add(slab(part, band.bottom + 0.3, top, mat(COLOR.focus, 0.18)));
        } else {
          // この部分にその階が無い: 全部その階より下なら色付き、上なら半透明
          const below = part.baseFloor + part.storeys - 1 < focus.floor;
          group.add(slab(part, part.bottom, top, below ? mat(COLOR.focus) : mat(COLOR.focus, 0.18)));
        }
      }
      if (b.name) {
        const text = focused && focus.floor > 0 ? `${b.name} ${floorLabel(focus.floor)}` : b.name;
        const tag = label(text, focused ? "map3d-label map3d-label-focus" : "map3d-label");
        tag.position.copy(toScene(b.center, b.top + 3));
        group.add(tag);
      }
      buildingGroup.add(group);
    }
  }

  // ---- ピン(建物を透かして手前に描く) ----
  function setPins(pins: MapPin[], selected: number | null) {
    dispose(pinGroup);
    pinGroup.clear();
    for (const pin of pins) {
      const big = pin.id === selected;
      const color = new THREE.Color(PIN_COLORS[pin.kind]);
      const stickMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
      const headMat = new THREE.MeshBasicMaterial({ color, depthTest: false });
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 4), stickMat);
      stick.position.copy(toScene(pin.xy, pin.elevation + 2));
      const head = new THREE.Mesh(new THREE.SphereGeometry(big ? 2.2 : 1.4, 16, 12), headMat);
      head.position.copy(toScene(pin.xy, pin.elevation + 4.5));
      head.userData.pinId = pin.id;
      stick.renderOrder = head.renderOrder = big ? 21 : 20;
      pinGroup.add(stick, head);
    }
  }

  // ---- 現在地 ----
  function setLocation(loc: MapLocation) {
    dispose(meGroup);
    meGroup.clear();
    if (!loc) return;
    const at = toScene(loc.xy, 0.2);
    const flat = (geom: THREE.BufferGeometry, color: string, opacity: number) => {
      const m = new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2;
      m.position.copy(at);
      m.renderOrder = 30;
      return m;
    };
    meGroup.add(flat(new THREE.CircleGeometry(Math.max(loc.accuracy, 2), 48), COLOR.me, 0.15));
    meGroup.add(flat(new THREE.CircleGeometry(1.6, 24), COLOR.me, 1));
    if (loc.heading !== undefined) {
      // 北(-z)向きの扇形を、向き(北から時計回り)の分だけ回す
      const fan = new THREE.Shape();
      fan.moveTo(0, 0);
      fan.lineTo(-4, 12);
      fan.lineTo(4, 12);
      fan.lineTo(0, 0);
      const m = flat(new THREE.ShapeGeometry(fan), COLOR.me, 0.45);
      m.rotation.z = (-loc.heading * Math.PI) / 180;
      meGroup.add(m);
    }
  }

  // ---- カメラを棟に寄せる ----
  function focusOn(focus: MapFocus) {
    const b = focus && campus.buildings.find((x) => x.id === focus.buildingId);
    const target = b ? toScene(b.center, 0) : home;
    const offset = camera.position.clone().sub(controls.target).setLength(b ? 110 : span * 1.05);
    controls.target.copy(target);
    camera.position.copy(target).add(offset);
  }

  // ---- 押した物 ----
  const raycaster = new THREE.Raycaster();
  let downAt: [number, number] | null = null;
  const onDown = (e: PointerEvent) => {
    downAt = [e.clientX, e.clientY];
  };
  const onUp = (e: PointerEvent) => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    downAt = null;
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    // ピンを先に見る(建物の中に隠れていても押せるように)
    const pin = raycaster.intersectObjects(pinGroup.children).find((h) => h.object.userData.pinId);
    if (pin) return onHit({ pin: pin.object.userData.pinId });
    const hit = raycaster.intersectObjects(buildingGroup.children, true).find((h) => h.object instanceof THREE.Mesh);
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.buildingId) o = o.parent;
    onHit(o ? { building: o.userData.buildingId } : null);
  };
  renderer.domElement.addEventListener("pointerdown", onDown);
  renderer.domElement.addEventListener("pointerup", onUp);

  const resize = new ResizeObserver(() => {
    camera.aspect = host.clientWidth / host.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    labelRenderer.setSize(host.clientWidth, host.clientHeight);
  });
  resize.observe(host);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
    labelRenderer.render(scene, camera);
  });

  return {
    setBuildings,
    setPins,
    setLocation,
    focusOn,
    dispose() {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      dispose(scene);
      controls.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      labelRenderer.domElement.remove();
    },
  };
}
```

`src/app/globals.css` の末尾にラベルの見た目:

```css
/* 3D 地図の棟の名前 */
.map3d-label {
  background: #1d2733d9;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 9px;
  white-space: nowrap;
}

.map3d-label-focus {
  background: #3d8bff;
  font-size: 13px;
  font-weight: bold;
}
```

- [ ] **Step 4: React の入れ物** `src/components/map/Map3D.tsx`

```tsx
"use client";

import { useEffect, useRef } from "react";
import { createScene } from "./scene3d";
import type { MapProps } from "./types";

/** three.js の 3D 地図。/map と同じチャンクにだけ入るよう、呼ぶ側で next/dynamic にする */
export default function Map3D(props: MapProps) {
  const { campus, pins, selectedPinId, focus, location } = props;
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<ReturnType<typeof createScene> | null>(null);
  // 押したときは最新の props の関数を呼ぶ(シーンは作り直さない)
  const handlers = useRef(props);
  useEffect(() => {
    handlers.current = props;
  });

  useEffect(() => {
    if (!host.current) return;
    const s = createScene(host.current, campus, (hit) => {
      const h = handlers.current;
      if (!hit) h.onPickNothing();
      else if ("pin" in hit) h.onPickPin(hit.pin);
      else h.onPickBuilding(hit.building);
    });
    scene.current = s;
    return () => {
      s.dispose();
      scene.current = null;
    };
  }, [campus]);

  useEffect(() => {
    scene.current?.setBuildings(focus);
    scene.current?.focusOn(focus);
  }, [focus]);
  useEffect(() => {
    scene.current?.setPins(pins, selectedPinId);
  }, [pins, selectedPinId]);
  useEffect(() => {
    scene.current?.setLocation(location);
  }, [location]);

  return <div ref={host} className="absolute inset-0 touch-none" />;
}
```

`focus` が毎回新しいオブジェクトだとカメラが毎回戻るので、呼ぶ側（Task 7）で `useMemo` にする。

- [ ] **Step 5: 型・整形**

Run: `npx tsc --noEmit && npx biome check --write src/components/map src/app/globals.css && npx biome check src/components/map src/app/globals.css`
Expected: エラーなし（描画は Task 7 の後に Playwright で確かめる）

- [ ] **Step 6: コミット**

```bash
git add package.json package-lock.json src/components/map src/app/globals.css
git commit -m "Feat: three.js で校舎とピンを描く 3D 地図を追加した"
```

### Task 6: 2D の描画（SVG）

**Files:**
- Create: `src/components/map/Map2D.tsx`

**Interfaces:**
- Consumes: `MapProps`（Task 5）、`floorLabel`
- Produces: `export function Map2D(props: MapProps & { onPickPoint?: (xy: XY) => void; className?: string })`。`onPickPoint` があると「場所を選ぶ」モード（どこを押しても座標を返す）

- [ ] **Step 1: 実装** `src/components/map/Map2D.tsx`

```tsx
"use client";

import { type PointerEvent, useEffect, useRef, useState, type WheelEvent } from "react";
import { floorLabel, type XY } from "@/lib/map/campus";
import { cn } from "@/lib/utils";
import { type MapProps, PIN_COLORS } from "./types";

const MARGIN = 30;

/** 平面図。黒地に校舎の形・棟の名前・ピン。指で拡大と移動ができる */
export function Map2D({
  campus,
  pins,
  selectedPinId,
  focus,
  location,
  onPickPin,
  onPickBuilding,
  onPickNothing,
  onPickPoint,
  className,
}: MapProps & { onPickPoint?: (xy: XY) => void; className?: string }) {
  const { minX, maxX, minY, maxY } = campus.bounds;
  const vb = { x: minX - MARGIN, y: -maxY - MARGIN, w: maxX - minX + MARGIN * 2, h: maxY - minY + MARGIN * 2 };
  const svg = useRef<SVGSVGElement>(null);
  const [view, setView] = useState({ k: 1, tx: 0, ty: 0 });
  // 画面の 1px が viewBox の何単位か(文字やピンの大きさを画面上で一定にする)
  const [unit, setUnit] = useState(1);
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const measure = () => setUnit(Math.max(vb.w / el.clientWidth, vb.h / el.clientHeight));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vb.w, vb.h]);
  const px = unit / view.k;

  // 画面の座標 → viewBox の座標
  const toSvg = (clientX: number, clientY: number) => {
    const el = svg.current;
    const ctm = el?.getScreenCTM();
    if (!el || !ctm) return { x: 0, y: 0 };
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  // viewBox の座標 → 地図の座標(拡大・移動を戻し、y を北向きに)
  const toMap = (sx: number, sy: number): XY => [(sx - view.tx) / view.k, -(sy - view.ty) / view.k];

  const zoomAt = (sx: number, sy: number, factor: number) =>
    setView((v) => {
      const k = Math.min(Math.max(v.k * factor, 1), 12);
      const f = k / v.k;
      return { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
    });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; dist?: number }>({ moved: 0 });

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { moved: 0 };
    gesture.current.dist = undefined;
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      const a = toSvg(prev.x, prev.y);
      const b = toSvg(e.clientX, e.clientY);
      gesture.current.moved += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
      setView((v) => ({ ...v, tx: v.tx + b.x - a.x, ty: v.ty + b.y - a.y }));
    } else if (pts.length === 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = toSvg((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2);
      if (gesture.current.dist) zoomAt(mid.x, mid.y, dist / gesture.current.dist);
      gesture.current.dist = dist;
      gesture.current.moved = Number.POSITIVE_INFINITY;
    }
  };
  const onUp = (e: PointerEvent<SVGSVGElement>) => {
    const was = pointers.current.size;
    pointers.current.delete(e.pointerId);
    if (was !== 1 || gesture.current.moved > 6) return;
    const target = e.target as Element;
    if (onPickPoint) {
      const s = toSvg(e.clientX, e.clientY);
      return onPickPoint(toMap(s.x, s.y));
    }
    const pin = target.closest("[data-pin]")?.getAttribute("data-pin");
    if (pin) return onPickPin(Number(pin));
    const building = target.closest("[data-building]")?.getAttribute("data-building");
    if (building) return onPickBuilding(building);
    onPickNothing();
  };
  const onWheel = (e: WheelEvent<SVGSVGElement>) => {
    const s = toSvg(e.clientX, e.clientY);
    zoomAt(s.x, s.y, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  };

  const ring = (r: XY[]) => `M${r.map(([x, y]) => `${x},${-y}`).join("L")}Z`;

  return (
    <svg
      ref={svg}
      role="img"
      aria-label="キャンパスの平面図"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      className={cn("h-full w-full touch-none select-none bg-black", className)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
      onWheel={onWheel}
    >
      <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
        {campus.buildings.map((b) => {
          const focused = focus?.buildingId === b.id;
          return (
            <g key={b.id} data-building={b.id}>
              {b.parts.map((part, i) => (
                <path
                  // biome-ignore lint/suspicious/noArrayIndexKey: 部分の並びは変わらない
                  key={i}
                  d={part.polygons.map((poly) => poly.map(ring).join("")).join("")}
                  fillRule="evenodd"
                  fill={focused ? "#3d8bff55" : b.name ? "#3a4049" : "#22262b"}
                  stroke={focused ? "#3d8bff" : "#8a93a0"}
                  strokeWidth={px}
                />
              ))}
            </g>
          );
        })}
        {campus.buildings
          .filter((b) => b.name)
          .map((b) => (
            <text
              key={b.id}
              x={b.center[0]}
              y={-b.center[1]}
              fontSize={11 * px}
              fill="#e5e7eb"
              textAnchor="middle"
              dominantBaseline="middle"
              pointerEvents="none"
            >
              {b.name}
            </text>
          ))}
        {location && (
          <g pointerEvents="none">
            <circle cx={location.xy[0]} cy={-location.xy[1]} r={Math.max(location.accuracy, 2)} fill="#4f8cff26" />
            {location.heading !== undefined && (
              <path
                d={`M0,0 L${-5 * px},${-16 * px} L${5 * px},${-16 * px} Z`}
                transform={`translate(${location.xy[0]} ${-location.xy[1]}) rotate(${location.heading})`}
                fill="#4f8cff88"
              />
            )}
            <circle cx={location.xy[0]} cy={-location.xy[1]} r={6 * px} fill="#4f8cff" stroke="#fff" strokeWidth={2 * px} />
          </g>
        )}
        {pins.map((pin) => {
          const big = pin.id === selectedPinId;
          const r = (big ? 10 : 7) * px;
          return (
            <g key={pin.id} data-pin={pin.id} transform={`translate(${pin.xy[0]} ${-pin.xy[1]})`}>
              <circle r={r} fill={PIN_COLORS[pin.kind]} stroke="#fff" strokeWidth={2 * px} />
              {pin.floor > 0 && (
                <text x={r + 2 * px} y={0} fontSize={10 * px} fill="#fff" dominantBaseline="middle">
                  {floorLabel(pin.floor)}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 2: 型・整形**

Run: `npx tsc --noEmit && npx biome check --write src/components/map/Map2D.tsx && npx biome check src/components/map/Map2D.tsx`
Expected: エラーなし

- [ ] **Step 3: コミット**

```bash
git add src/components/map/Map2D.tsx
git commit -m "Feat: SVG の平面図(2D 地図)を追加した"
```

### Task 7: /map の画面（絞り込み・切り替え・選択・棟の一覧）

**Files:**
- Create: `src/components/map/CampusMap.tsx`、`src/components/map/BuildingSheet.tsx`
- Modify: `src/app/map/page.tsx`
- Delete: `src/app/map/MapTypeToggle.tsx`

**Interfaces:**
- Consumes: Task 3〜6 のすべて、`BoothCard`、`fetchBooths`
- Produces: `CampusMap({ booths, initial, loadFailed })`。Task 8 が `location` を、Task 9 は何も足さない

- [ ] **Step 1: 棟の一覧** `src/components/map/BuildingSheet.tsx`

```tsx
import { X } from "lucide-react";
import type { Booth } from "@/lib/api/booths";
import { floorLabel } from "@/lib/map/campus";

/** 棟を押したときに下から出る、その棟のブースの一覧(階ごと) */
export function BuildingSheet({
  name,
  groups,
  onPick,
  onClose,
}: {
  name: string;
  groups: { floor: number; booths: Booth[] }[];
  onPick(id: number): void;
  onClose(): void;
}) {
  return (
    <div className="max-h-[45dvh] overflow-y-auto rounded-t-xl border border-white/20 bg-black/95 p-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-bold text-lg">{name}</h2>
        <button type="button" aria-label="閉じる" onClick={onClose} className="p-1 text-gray-400">
          <X size={20} />
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">この棟のブースはありません。</p>
      ) : (
        groups.map((g) => (
          <section key={g.floor} className="pb-2">
            <h3 className="text-gray-400 text-xs">{floorLabel(g.floor)}</h3>
            <ul>
              {g.booths.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => onPick(b.id)} className="w-full py-2 text-left">
                    {b.name}
                    <span className="pl-2 text-gray-400 text-xs">{b.organizer}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 2: 画面の本体** `src/components/map/CampusMap.tsx`

```tsx
"use client";

import { X } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BoothCard } from "@/components/ui/boothcard";
import campusData from "@/data/campus.json";
import type { Booth } from "@/lib/api/booths";
import { type CampusData, loadCampus } from "@/lib/map/campus";
import { boothsByFloor, type MapState, type MapType, mapPins, mapQuery } from "@/lib/map/map-booths";
import { cn } from "@/lib/utils";
import { BuildingSheet } from "./BuildingSheet";
import { Map2D } from "./Map2D";
import type { MapFocus, MapLocation } from "./types";

const Map3D = dynamic(() => import("./Map3D"), {
  ssr: false,
  loading: () => <p className="p-6 text-center text-gray-400">地図を読み込んでいます…</p>,
});

const TYPES: { value: MapType; label: string }[] = [
  { value: "all", label: "すべて" },
  { value: "class", label: "クラス展示" },
  { value: "club", label: "クラブバザー" },
];

export function CampusMap({
  booths,
  initial,
  loadFailed,
  location = null,
  locationControl,
}: {
  booths: Booth[];
  initial: MapState;
  loadFailed: boolean;
  /** 現在地(Task 8 で渡す) */
  location?: MapLocation;
  locationControl?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const campus = useMemo(() => loadCampus(campusData as unknown as CampusData), []);
  const [state, setState] = useState(initial);
  const [buildingId, setBuildingId] = useState<string | null>(null);

  const update = (patch: Partial<MapState>) => {
    const next = { ...state, ...patch };
    setState(next);
    router.replace(`${pathname}${mapQuery(next)}`, { scroll: false });
  };

  const pins = useMemo(() => mapPins(campus, booths, state.type), [campus, booths, state.type]);
  const selectedPin = pins.find((p) => p.id === state.boothId);
  const selectedBooth = booths.find((b) => b.id === state.boothId);
  const focusKey = selectedPin?.buildingId
    ? `${selectedPin.buildingId}:${selectedPin.floor}`
    : buildingId
      ? `${buildingId}:0`
      : "";
  // 同じ選択のままならカメラを動かさないよう、文字列が変わったときだけ作り直す
  const focus: MapFocus = useMemo(() => {
    if (!focusKey) return null;
    const [id, floor] = focusKey.split(":");
    return { buildingId: id, floor: Number(floor) };
  }, [focusKey]);

  const props = {
    campus,
    pins,
    selectedPinId: state.boothId,
    focus,
    location,
    onPickPin: (id: number) => {
      setBuildingId(null);
      update({ boothId: id });
    },
    onPickBuilding: (id: string) => {
      setBuildingId(id);
      update({ boothId: null });
    },
    onPickNothing: () => {
      setBuildingId(null);
      if (state.boothId !== null) update({ boothId: null });
    },
  };
  const building = buildingId ? campus.buildings.find((b) => b.id === buildingId) : undefined;

  return (
    <div className="fixed inset-0 bg-black">
      {state.view === "3d" ? <Map3D {...props} /> : <Map2D {...props} />}

      {/* 絞り込み(右上はメニューのボタンがあるので空ける) */}
      <div className="absolute top-3 left-3 right-16 z-40 flex gap-2 overflow-x-auto">
        {TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            aria-pressed={state.type === t.value}
            onClick={() =>
              update({
                type: t.value,
                boothId: null,
                // バザーは屋外なので 2D が分かりやすい
                ...(t.value === "club" && { view: "2d" }),
              })
            }
            className={cn(
              "h-9 shrink-0 rounded-full border px-3 text-sm font-bold",
              state.type === t.value ? "border-white bg-white text-black" : "border-white/30 bg-black/70 text-gray-200",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loadFailed && (
        <p className="absolute top-14 left-3 right-3 z-40 rounded-md bg-black/80 p-2 text-center text-gray-300 text-sm">
          ブースの情報を読み込めませんでした。地図だけ表示しています。
        </p>
      )}

      <div className="absolute right-4 bottom-6 z-40 flex flex-col items-end gap-3">
        {locationControl}
        <button
          type="button"
          onClick={() => update({ view: state.view === "3d" ? "2d" : "3d" })}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/80 font-bold"
          aria-label={state.view === "3d" ? "2D に切り替える" : "3D に切り替える"}
        >
          {state.view === "3d" ? "2D" : "3D"}
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-md pr-16 pl-3">
        {selectedBooth && (
          <div className="relative pb-4">
            <button
              type="button"
              aria-label="選択を外す"
              onClick={() => update({ boothId: null })}
              className="absolute -top-3 right-0 z-10 rounded-full bg-black/80 p-1 text-gray-300"
            >
              <X size={18} />
            </button>
            <BoothCard
              name={selectedBooth.name}
              description={selectedBooth.description}
              organizer={selectedBooth.organizer}
              location={selectedBooth.location}
              imageUrl={selectedBooth.imageUrl}
              imageAlt={selectedBooth.name}
              congestionStatus={selectedBooth.congestionStatus}
              latitude={selectedBooth.latitude}
              longitude={selectedBooth.longitude}
            />
          </div>
        )}
        {!selectedBooth && building && (
          <BuildingSheet
            name={building.name ?? "建物"}
            groups={boothsByFloor(pins, booths, building.id)}
            onPick={(id) => props.onPickPin(id)}
            onClose={() => setBuildingId(null)}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: ページ** `src/app/map/page.tsx` を置き換え、`git rm src/app/map/MapTypeToggle.tsx`

```tsx
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { CampusMap } from "@/components/map/CampusMap";
import { RefreshEvery } from "@/components/RefreshEvery";
import { type Booth, fetchBooths } from "@/lib/api/booths";
import { parseMapQuery, resolveInitial } from "@/lib/map/map-booths";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  let booths: Booth[] = [];
  let loadFailed = false;
  try {
    // 混雑度が変わるので、キャッシュしない
    booths = await fetchBooths({ cache: "no-store" });
  } catch (e) {
    // API が落ちていても地図は出す
    console.error("ブースの取得に失敗しました", e);
    loadFailed = true;
  }
  const initial = resolveInitial(parseMapQuery(await searchParams), booths);
  return (
    <div>
      <CampusMap booths={booths} initial={initial} loadFailed={loadFailed} />
      <SideMenu />
      <RefreshEvery seconds={60} />
    </div>
  );
}
```

（SideMenu のボタンは `absolute ... z-50` なので地図の上に出る。出なければ SideMenu の位置クラスを確かめ、ledger に Ruling を残して `fixed` で包む。）

- [ ] **Step 4: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check --write src/components/map src/app/map && npx biome check src/components/map src/app/map && npx vitest run --project unit`
Expected: エラーなし、全件 PASS

- [ ] **Step 5: コミット**

```bash
git add -A src/components/map src/app/map
git commit -m "Feat: /map を 3D・2D の切り替え、絞り込み、ピンと棟の選択ができる地図にした"
```

### Task 8: 現在地

**Files:**
- Create: `src/hooks/useCurrentLocation.ts`、`src/components/map/LocationButton.tsx`
- Modify: `src/components/map/CampusMap.tsx`

**Interfaces:**
- Produces:

```ts
export type CurrentLocation =
  | { status: "idle" } | { status: "locating" }
  | { status: "active"; latitude: number; longitude: number; accuracy: number; heading?: number }
  | { status: "denied" } | { status: "unavailable" };
export function useCurrentLocation(): { location: CurrentLocation; start(): Promise<void> };
```

- [ ] **Step 1: フック** `src/hooks/useCurrentLocation.ts`

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CurrentLocation =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "active"; latitude: number; longitude: number; accuracy: number; heading?: number }
  | { status: "denied" }
  | { status: "unavailable" };

type CompassOrientationEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
type OrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied" | "prompt">;
};

/**
 * 現在地と向き。start() を押されたときだけ許可を求める(iOS は向きの許可もタップの中で求める必要がある)
 */
export function useCurrentLocation() {
  const [position, setPosition] = useState<CurrentLocation>({ status: "idle" });
  const [heading, setHeading] = useState<number>();
  const watchId = useRef<number | null>(null);

  const onOrientation = useCallback((e: DeviceOrientationEvent) => {
    const compass = (e as CompassOrientationEvent).webkitCompassHeading;
    if (compass !== undefined) setHeading(compass);
    else if (e.alpha !== null) setHeading((360 - e.alpha) % 360);
  }, []);

  const start = useCallback(async () => {
    if (!("geolocation" in navigator)) return setPosition({ status: "unavailable" });
    setPosition({ status: "locating" });
    const O = typeof DeviceOrientationEvent !== "undefined" ? (DeviceOrientationEvent as OrientationWithPermission) : undefined;
    try {
      if (typeof O?.requestPermission === "function") {
        if ((await O.requestPermission()) === "granted") window.addEventListener("deviceorientation", onOrientation);
      } else if (O) {
        window.addEventListener("deviceorientation", onOrientation);
      }
    } catch {
      // 向きが取れなくても位置だけは出す
    }
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = navigator.geolocation.watchPosition(
      (p) =>
        setPosition({
          status: "active",
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      (err) => setPosition({ status: err.code === err.PERMISSION_DENIED ? "denied" : "unavailable" }),
      { enableHighAccuracy: true },
    );
  }, [onOrientation]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      window.removeEventListener("deviceorientation", onOrientation);
    },
    [onOrientation],
  );

  const location: CurrentLocation =
    position.status === "active" ? { ...position, heading } : position;
  return { location, start };
}
```

- [ ] **Step 2: ボタンと案内** `src/components/map/LocationButton.tsx`

```tsx
import { LocateFixed } from "lucide-react";
import type { CurrentLocation } from "@/hooks/useCurrentLocation";

const MESSAGES: Partial<Record<CurrentLocation["status"] | "outside", string>> = {
  locating: "現在地を探しています…",
  denied: "位置情報が使えません。設定から許可してください",
  unavailable: "現在地を取得できませんでした",
  outside: "会場の外にいます",
};

export function LocationButton({
  status,
  outside,
  onStart,
}: {
  status: CurrentLocation["status"];
  outside: boolean;
  onStart(): void;
}) {
  const message = outside ? MESSAGES.outside : MESSAGES[status];
  return (
    <div className="flex items-center gap-2">
      {message && <span className="rounded-md bg-black/80 px-2 py-1 text-gray-200 text-xs">{message}</span>}
      <button
        type="button"
        onClick={onStart}
        aria-label="現在地を表示"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-black/80"
      >
        <LocateFixed size={20} className={status === "active" ? "text-[#4f8cff]" : ""} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: CampusMap につなぐ**（`CampusMap.tsx`）
- props から `location` と `locationControl` を外し、中で:

```tsx
  const { location: current, start } = useCurrentLocation();
  const here =
    current.status === "active" ? campus.toXY(current.longitude, current.latitude) : null;
  const outside = here !== null && !nearCampus(campus, here);
  const location: MapLocation = useMemo(
    () =>
      here && !outside && current.status === "active"
        ? { xy: here, accuracy: current.accuracy, heading: current.heading }
        : null,
    // here は毎回新しい配列なので、値で比べる
    // biome-ignore lint/correctness/useExhaustiveDependencies: 座標と向きの値が変わったときだけ作り直す
    [here?.[0], here?.[1], outside, current],
  );
```

- 右下の `{locationControl}` を `<LocationButton status={current.status} outside={outside} onStart={start} />` に置き換える
- import に `useCurrentLocation`、`nearCampus`、`LocationButton` を足す

- [ ] **Step 4: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check --write src/hooks/useCurrentLocation.ts src/components/map && npx biome check src/hooks/useCurrentLocation.ts src/components/map && npx vitest run --project unit`
Expected: エラーなし、全件 PASS（biome-ignore が不要と言われたら外す）

- [ ] **Step 5: コミット**

```bash
git add src/hooks/useCurrentLocation.ts src/components/map
git commit -m "Feat: 地図に現在地と向きを出せるようにした"
```

### Task 9: ブース詳細の「場所を見る」

**Files:**
- Modify: `src/components/ui/boothcard.tsx`、`src/components/booths/BoothBrowser.tsx`

**Interfaces:**
- Produces: `BoothCard` の任意 prop `mapHref?: string`

- [ ] **Step 1: 実装**
- `BoothCard` の props に `/** 地図でこのブースを開くリンク。位置が無いブースや地図の上では渡さない */ mapHref?: string;`
- ダイアログの最後の行（NaviButton の行）を、`mapHref` か座標があるときに出すようにして、左に:

```tsx
                {mapHref && (
                  <Link
                    href={mapHref}
                    className="mr-auto flex items-center gap-1 rounded-full border border-black/20 px-3 py-1 text-sm"
                  >
                    <MapPin size={16} />
                    場所を見る
                  </Link>
                )}
```

（行の条件は `(mapHref || (latitude !== undefined && longitude !== undefined))`、NaviButton は今の条件のまま中に置く。import に `Link`（next/link）と `MapPin`（lucide-react）。）
- `BoothBrowser` の `<BoothCard>` に `mapHref={booth.latitude !== undefined ? `/map?booth=${booth.id}` : undefined}`

- [ ] **Step 2: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check --write src/components/ui/boothcard.tsx src/components/booths/BoothBrowser.tsx && npx vitest run --project unit`
Expected: エラーなし、全件 PASS

- [ ] **Step 3: コミット**

```bash
git add src/components/ui/boothcard.tsx src/components/booths/BoothBrowser.tsx
git commit -m "Feat: ブースの詳細に「場所を見る」を足し、地図でそのブースを開けるようにした"
```

### Task 10: 管理画面で地図を押してブースを置く

**Files:**
- Create: `src/components/map/LocationPicker.tsx`
- Modify: `src/lib/manage/booth-form.ts`、`src/lib/manage/booth-form.test.ts`、`src/app/manage/(console)/booths/BoothFormDialog.tsx`

**Interfaces:**
- Consumes: `Map2D`（`onPickPoint`）、`buildingAt`、`loadCampus`
- Produces: フォームの `floor`（`parseBoothForm` が読む）

- [ ] **Step 1: 失敗するテスト**（`booth-form.test.ts` の `parseBoothForm` の describe に）

```ts
  it("階を読む。空は 0、負や小数は断る", () => {
    const form = (floor: string) => {
      const f = new FormData();
      f.set("name", "3-1 展示");
      f.set("floor", floor);
      return f;
    };
    expect(parseBoothForm(form("2"))).toMatchObject({ ok: true, payload: { floor: 2 } });
    expect(parseBoothForm(form(""))).toMatchObject({ ok: true, payload: { floor: 0 } });
    expect(parseBoothForm(form("-1"))).toEqual({ ok: false, error: "階は 0 以上の整数で入力してください" });
    expect(parseBoothForm(form("1.5"))).toEqual({ ok: false, error: "階は 0 以上の整数で入力してください" });
  });
```

Run: `npx vitest run --project unit src/lib/manage/booth-form.test.ts`
Expected: FAIL（`floor` が無い）

- [ ] **Step 2: 実装**（`booth-form.ts` の `parseBoothForm`。緯度・経度の確認の後に）

```ts
  const floorText = text(formData, "floor");
  const floor = floorText === "" ? 0 : Number(floorText);
  if (!Number.isInteger(floor) || floor < 0) {
    return { ok: false, error: "階は 0 以上の整数で入力してください" };
  }
```

payload に `floor,` を足す。

Run: `npx vitest run --project unit src/lib/manage/booth-form.test.ts`
Expected: PASS

- [ ] **Step 3: 地図で選ぶ部品** `src/components/map/LocationPicker.tsx`

```tsx
"use client";

import { LocateFixed } from "lucide-react";
import { useMemo, useState } from "react";
import campusData from "@/data/campus.json";
import { buildingAt, type CampusData, loadCampus, type XY } from "@/lib/map/campus";
import { Map2D } from "./Map2D";

const POOR_ACCURACY_M = 30;
const fmt = (n: number) => n.toFixed(7);

/**
 * ブースの場所と階を地図で選ぶ。フォームには latitude・longitude・floor として入る。
 * 建物の中を押したらその棟の階から選び、外なら屋外(0)
 */
export function LocationPicker({
  latitude,
  longitude,
  floor,
}: {
  latitude?: number;
  longitude?: number;
  floor?: number;
}) {
  const campus = useMemo(() => loadCampus(campusData as unknown as CampusData), []);
  const has = latitude !== undefined && longitude !== undefined && (latitude !== 0 || longitude !== 0);
  const [lat, setLat] = useState(has ? fmt(latitude) : "");
  const [lon, setLon] = useState(has ? fmt(longitude as number) : "");
  const [floorValue, setFloorValue] = useState(floor ?? 0);
  const [gps, setGps] = useState<"locating" | "denied" | { accuracy: number } | null>(null);

  const xy: XY | null =
    lat !== "" && lon !== "" && Number.isFinite(Number(lat)) && Number.isFinite(Number(lon))
      ? campus.toXY(Number(lon), Number(lat))
      : null;
  const hit = xy ? buildingAt(campus, xy) : undefined;

  const place = (p: XY) => {
    const [lo, la] = campus.toLonLat(...p);
    setLat(fmt(la));
    setLon(fmt(lo));
    const b = buildingAt(campus, p)?.building;
    // 建物の中なら今の階(範囲外なら 1 階)、外なら屋外
    setFloorValue((f) => (b ? Math.min(Math.max(f, 1), b.floors) : 0));
  };

  const useHere = () => {
    setGps("locating");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        place(campus.toXY(p.coords.longitude, p.coords.latitude));
        setGps({ accuracy: p.coords.accuracy });
      },
      () => setGps("denied"),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm">場所（地図を押して置く）</span>
      <div className="h-64 overflow-hidden rounded-md border">
        <Map2D
          campus={campus}
          pins={xy ? [{ id: 0, xy, elevation: 0, floor: floorValue, kind: "class" }] : []}
          selectedPinId={0}
          focus={hit ? { buildingId: hit.building.id, floor: 0 } : null}
          location={null}
          onPickPin={() => {}}
          onPickBuilding={() => {}}
          onPickNothing={() => {}}
          onPickPoint={place}
        />
      </div>
      <p className="text-sm">
        {!xy ? "未設定" : hit ? `${hit.building.name ?? "建物"}（${hit.building.floors}階建て）` : "屋外"}
      </p>
      {hit ? (
        <label className="flex items-center gap-2 text-sm">
          階
          <select
            name="floor"
            value={floorValue}
            onChange={(e) => setFloorValue(Number(e.target.value))}
            className="h-9 rounded-md border px-2"
          >
            {Array.from({ length: hit.building.floors }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}階
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="floor" value={0} />
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={useHere} className="flex items-center gap-1 rounded-md border px-3 py-1 text-sm">
          <LocateFixed size={16} />
          今いる場所を入れる
        </button>
        {gps === "locating" && <span className="text-gray-500 text-xs">取得しています…</span>}
        {gps === "denied" && <span className="text-red-600 text-xs">位置情報が使えません</span>}
        {gps && typeof gps === "object" && (
          <span className={gps.accuracy > POOR_ACCURACY_M ? "text-red-600 text-xs" : "text-gray-500 text-xs"}>
            精度 ±{Math.round(gps.accuracy)}m
            {gps.accuracy > POOR_ACCURACY_M && "。誤差が大きいので地図で確かめてください"}
          </span>
        )}
      </div>
      <details>
        <summary className="cursor-pointer text-gray-500 text-xs">数字で入力</summary>
        <div className="flex gap-2 pt-2">
          <input name="latitude" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="緯度" inputMode="decimal" className="h-9 w-full rounded-md border px-2 text-sm" />
          <input name="longitude" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="経度" inputMode="decimal" className="h-9 w-full rounded-md border px-2 text-sm" />
        </div>
      </details>
    </div>
  );
}
```

- [ ] **Step 4: フォームに入れる**（`BoothFormDialog.tsx`）
- 緯度・経度の 2 つの `Field`（`name="latitude"`・`name="longitude"` とそれを包む要素）を消し、その場所に:

```tsx
      <LocationPicker latitude={current?.latitude} longitude={current?.longitude} floor={current?.floor} />
```

- `coord` 関数が使われなくなったら消す。import に `LocationPicker`（`@/components/map/LocationPicker`）

（ダイアログの背景が白なので、2D の地図は黒地のままでよい。地図がダイアログの高さに収まらなければダイアログの中身を `overflow-y-auto max-h-[85dvh]` にする。）

- [ ] **Step 5: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check --write src/components/map/LocationPicker.tsx src/lib/manage "src/app/manage/(console)/booths/BoothFormDialog.tsx" && npx vitest run --project unit`
Expected: エラーなし、全件 PASS

- [ ] **Step 6: コミット**

```bash
git add src/components/map/LocationPicker.tsx src/lib/manage "src/app/manage/(console)/booths/BoothFormDialog.tsx"
git commit -m "Feat: 管理画面で地図を押してブースの場所と階を登録できるようにした"
```

### Task 11: 実機確認と PR

ユーザーの 1323・3000・開発用 DB `kctfestnav` には触らない。

- [ ] **Step 1: 確認用の DB とバックエンド**
- `docker compose exec -T mysql mysqldump -uroot --default-character-set=utf8mb4 kctfestnav > $SP/kct.sql`（読むだけ）
- `docker compose exec -T mysql mysql -uroot -e "CREATE DATABASE IF NOT EXISTS kctfestnav_map"` → `$SP/kct.sql` を流す → `db/migrations/2026-10-07-booth-floor.sql` を流す
- `$SP/be` を `feature/booth-floor` の中身に差し替えて（`rsync -a --delete --exclude .env --exclude .git ../KCTFestNav-Backend/ $SP/be/`）ビルドし、`.env` の `DB_NAME=kctfestnav_map` にして :1324 で起動
- `kctfestnav_map` のブースに位置と階を入れる: クラス展示 1 件を 3 号館の中（`campus.json` の 3 号館の中心の経緯度）・2 階、バザー 1 件を屋外に（SQL の UPDATE）
- [ ] **Step 2: 確認用ビルド**: `git worktree add --detach $SP/fe-wt HEAD`、`cp -Rc node_modules`、`NEXT_PUBLIC_API_BASE_URL=http://localhost:1324 npx next build`、`next start -p 3002`
- [ ] **Step 3: Playwright（Chrome、390×844、`--use-gl=angle --use-angle=swiftshader`）**
  - `/map`: canvas が出る、絞り込み 3 つ、ピン（3D は canvas なので、`page.evaluate` でエラーが無いことと、スクリーンショットで目視）
  - 「クラブバザー」→ URL `?type=club&view=2d`、SVG にバザーのピンだけ
  - 2D でピンを押す → 下に BoothCard、URL に `booth=`
  - 2D で 3 号館を押す → 棟の一覧に「2F」とクラス展示
  - `/map?booth=<クラス展示>` → 3D で 3 号館が青、ラベル「3号館 2F」、スクリーンショット
  - `/map?booth=<バザー>` → 2D。`/map?booth=999`・`/map?booth=abc` → 200 で全体
  - 現在地: `context.grantPermissions(["geolocation"])` + 3 号館の座標 → 青い点。会場から 1km 離れた座標 → 「会場の外にいます」。許可なし → 「位置情報が使えません…」
  - クラス展示のページのカード → 「場所を見る」→ `/map?booth=`
  - 管理画面（`$SP/admin.jwt` を Cookie `kct_manage_token`、path `/manage`）: ブース編集で 2D を押す → 「3号館（3階建て）」と階の選択、保存 → DB の floor が変わる。「今いる場所を入れる」（geolocation を許可して座標を渡す）→ 精度表示
  - 学生の「説明を保存」で floor が 0 に戻らない（Review Focus 3）: DB で floor を 2 にしてから my-booth の保存 → floor が 2 のまま
- [ ] **Step 4: 後片付け**: 3002・1324 を止める、worktree を消す、`kctfestnav_map` を消す（`DROP DATABASE kctfestnav_map`）
- [ ] **Step 5: PR**: `git push -u origin feature/campus-map`、`gh pr create --base develop`（バックエンドの PR を先にマージすること、マージ後に開発用 DB へマイグレーションを流してバックエンドを再起動することを書く）
