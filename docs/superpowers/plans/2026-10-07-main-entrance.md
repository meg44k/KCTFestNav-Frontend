# 入口ページとタイトル画面 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/main` を「入口タイル 2×2 ＋ お知らせ ＋ ステージの帯」のページに作り替え、`/` を自動で移るタイトル画面に、`/map` を新しい入れ物にする。

**Architecture:** 行き先の一覧を `src/lib/navigation.ts` の配列 1 つにまとめ、メニューとタイルの両方がそこから作る。ステージの帯に出すものは純粋関数 `stageHeadline` が決め、表示の部品は受け取って描くだけ。タイトル画面は Cookie をサーバーで見て、見たことがあればすぐ移す。

**Tech Stack:** Next.js 16 App Router（Server Components）、React 19、Tailwind v4、lucide-react、vitest（unit プロジェクト）、Playwright（実機確認）

**Spec:** `docs/superpowers/specs/2026-10-07-main-entrance-design.md`

## Global Constraints

- バックエンドは変えない。ステージは `GET /stage`（`apiFetch`、`cache: "no-store"`）
- 「今日」は JST（`Asia/Tokyo`）の日付
- 演奏中は日付に関係なく出す。「まもなく」と「次は」は今日の分だけ
- ステージの取得に失敗しても、お知らせとタイルは出す。帯だけ出さず、エラー文も出さない
- タイトル画面の Cookie は `kct_intro_seen=1`、30 日、path `/`。移動は `router.replace`、約 2 秒
- 幅 390px で横にはみ出さない
- テストは `npx vitest run --project unit`（storybook プロジェクトは Playwright のブラウザ未導入で元から失敗する）
- 型は `npx tsc --noEmit`、整形は `npx biome check`（対象ファイルを指定）
- コミットの文は既存に合わせ「Feat: 〜した」の日本語。末尾に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 当日でない日（例: 10/7）に学生会が進めたブロック → 入口ページにも演奏中が出る（日付で絞らない）
2. 今日の予定が全部終わった・延びて終了時刻を過ぎた → 「次は」に翌日のブロックを出さない。演奏中なら出す
3. API が落ちている → 入口ページは 500 にならず、タイルとお知らせが出る
4. 2 回目に `/` を開いた → タイトルが一瞬も見えずに `/main`
5. メニューとタイルの行き先がずれない（同じ配列から作る）

---

### Task 1: 行き先の一覧・メニュー・/map

**Files:**
- Create: `src/lib/navigation.ts`、`src/lib/navigation.test.ts`、`src/app/map/page.tsx`
- Move: `src/app/main/MapTypeToggle.tsx` → `src/app/map/MapTypeToggle.tsx`
- Modify: `src/components/layout/SideMenu.tsx/SideMenu.tsx`

**Interfaces:**
- Produces: `NAV_ENTRANCES: NavItem[]`（マップ・クラス展示・クラブバザー・ステージイベントの順）、`NAV_HOME: NavItem`（トップ `/main`）、`type NavItem = { label: string; href: string; icon: LucideIcon }`

- [ ] **Step 1: 失敗するテストを書く** `src/lib/navigation.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { NAV_ENTRANCES, NAV_HOME } from "./navigation";

describe("行き先の一覧", () => {
  it("入口は 4 つで、マップは /map", () => {
    expect(NAV_ENTRANCES.map((n) => [n.label, n.href])).toEqual([
      ["マップ", "/map"],
      ["クラス展示", "/class-booth"],
      ["クラブバザー", "/bazaar"],
      ["ステージイベント", "/stage-event"],
    ]);
  });

  it("トップは入口ページ", () => {
    expect(NAV_HOME.href).toBe("/main");
  });
});
```

- [ ] **Step 2: 実行して失敗を見る**

Run: `npx vitest run --project unit src/lib/navigation.test.ts`
Expected: FAIL（`./navigation` が見つからない）

- [ ] **Step 3: 実装する** `src/lib/navigation.ts`

```ts
import {
  House,
  type LucideIcon,
  Map as MapIcon,
  MicVocal,
  Store,
  Utensils,
} from "lucide-react";

export type NavItem = { label: string; href: string; icon: LucideIcon };

/** 入口ページのタイルとメニューに並べる行き先(同じ順で出す) */
export const NAV_ENTRANCES: NavItem[] = [
  { label: "マップ", href: "/map", icon: MapIcon },
  { label: "クラス展示", href: "/class-booth", icon: Store },
  { label: "クラブバザー", href: "/bazaar", icon: Utensils },
  { label: "ステージイベント", href: "/stage-event", icon: MicVocal },
];

export const NAV_HOME: NavItem = { label: "トップ", href: "/main", icon: House };
```

- [ ] **Step 4: 実行して通るのを見る**

Run: `npx vitest run --project unit src/lib/navigation.test.ts`
Expected: PASS 2/2

- [ ] **Step 5: メニューを配列から作る** `SideMenu.tsx` の 4 つの `DrawerLabel` を次に置き換え、使わなくなった lucide の import（Map, MicVocal, Store, Utensils）を消す

```tsx
          {[NAV_HOME, ...NAV_ENTRANCES].map(({ label, href, icon: Icon }) => (
            <DrawerLabel key={href} href={href}>
              <div className="flex items-center gap-1">
                <Icon size={20} strokeWidth={1.5} />
                <span className="-translate-y-0.5">{label}</span>
              </div>
            </DrawerLabel>
          ))}
```

- [ ] **Step 6: /map を作る**

`git mv src/app/main/MapTypeToggle.tsx src/app/map/MapTypeToggle.tsx` し、`src/app/map/page.tsx`:

```tsx
import { PageTitle } from "@/components/layout/PageTitle";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { MapTypeToggle } from "./MapTypeToggle";

export default function MapPage() {
  return (
    <div>
      <SideMenu />
      <PageTitle>マップ</PageTitle>
      <p className="mt-10 flex justify-center text-gray-400">
        マップは準備中です
      </p>
      <MapTypeToggle />
    </div>
  );
}
```

`src/app/main/page.tsx` から `MapTypeToggle` の import と使用を消す（Task 3 で作り替えるまでの間もビルドが通るように）。

- [ ] **Step 7: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check src/lib/navigation.ts src/lib/navigation.test.ts src/app/map src/app/main src/components/layout && npx vitest run --project unit`
Expected: エラーなし、全テスト PASS

- [ ] **Step 8: コミット**

```bash
git add -A src/lib/navigation.ts src/lib/navigation.test.ts src/app/map src/app/main src/components/layout
git commit -m "Feat: マップを /map に分け、メニューの行き先を一覧から作るようにした"
```

---

### Task 2: stageHeadline

**Files:**
- Modify: `src/lib/stage-schedule.ts`、`src/lib/stage-schedule.test.ts`

**Interfaces:**
- Consumes: 既存の `nowPlaying`、`startingNow`、`nextUp`、`sectionsOn`、内部の `dayKey`
- Produces:

```ts
export type StageHeadline = {
  playing: NowPlaying[];
  starting: { section: StageSectionResponse; block: StageBlockResponse }[];
  next?: { section: StageSectionResponse; block: StageBlockResponse };
};
export function stageHeadline(sections: StageSectionResponse[], nowMs: number): StageHeadline;
```

- [ ] **Step 1: 失敗するテストを書く**（`stage-schedule.test.ts` の末尾。既存の `performer`/`block`/`section`/`ms` を使う。import に `stageHeadline` を足す）

```ts
describe("stageHeadline(入口ページの帯)", () => {
  const today = section(1, [
    block(1, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
    block(2, "2026-10-31T14:00:00+09:00", "2026-10-31T14:40:00+09:00"),
  ]);
  const tomorrow = section(2, [
    block(3, "2026-11-01T12:00:00+09:00", "2026-11-01T12:45:00+09:00"),
  ]);

  it("演奏中は日付に関係なく出す(当日前に学生会が進めた場合も)", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 1,
        now_playing: true,
      }),
    ]);
    const got = stageHeadline([s], ms("2026-10-07T10:00:00+09:00"));
    expect(got.playing.map((p) => p.current.id)).toEqual([41]);
    expect(got.next).toBeUndefined();
  });

  it("演奏中と、まもなく始まるブロックは両方出す", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 2,
        now_playing: true,
      }),
      block(5, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00"),
    ]);
    const got = stageHeadline([s], ms("2026-10-31T13:10:00+09:00"));
    expect(got.playing.map((p) => p.block.id)).toEqual([4]);
    expect(got.starting.map((x) => x.block.id)).toEqual([5]);
    expect(got.next).toBeUndefined();
  });

  it("どちらも無ければ、今日これから始まるブロックを次として出す", () => {
    const got = stageHeadline(
      [today, tomorrow],
      ms("2026-10-31T13:55:00+09:00"),
    );
    expect(got.playing).toEqual([]);
    expect(got.starting).toEqual([]);
    expect(got.next?.block.id).toBe(2);
  });

  it("今日の予定が終わったら、翌日のブロックは出さない", () => {
    const got = stageHeadline(
      [today, tomorrow],
      ms("2026-10-31T16:00:00+09:00"),
    );
    expect(got).toEqual({ playing: [], starting: [] });
  });

  it("お祭りの日でなければ何も出さない", () => {
    expect(
      stageHeadline([today, tomorrow], ms("2026-10-07T10:00:00+09:00")),
    ).toEqual({ playing: [], starting: [] });
  });

  it("全員終わったブロックは演奏中にしない", () => {
    const s = section(3, [
      block(4, "2026-10-31T13:00:00+09:00", "2026-10-31T13:50:00+09:00", {
        current_order: 3,
        now_playing: false,
      }),
    ]);
    expect(
      stageHeadline([s], ms("2026-10-31T13:40:00+09:00")).playing,
    ).toEqual([]);
  });
});
```

- [ ] **Step 2: 実行して失敗を見る**

Run: `npx vitest run --project unit src/lib/stage-schedule.test.ts`
Expected: FAIL（`stageHeadline` is not a function / not exported）

- [ ] **Step 3: 実装する**（`stage-schedule.ts` の末尾）

```ts
export type StageHeadline = {
  playing: NowPlaying[];
  starting: { section: StageSectionResponse; block: StageBlockResponse }[];
  next?: { section: StageSectionResponse; block: StageBlockResponse };
};

/**
 * 入口ページの帯に出すもの。演奏中は学生会が進めたものを必ず見せるため日付で絞らない。
 * 「まもなく」と「次は」は今日のブロックだけ(翌日の予定を「次」と出さない)
 */
export function stageHeadline(
  sections: StageSectionResponse[],
  nowMs: number,
): StageHeadline {
  const playing = nowPlaying(sections);
  const ofToday = sectionsOn(sections, dayKey(nowMs));
  const starting = startingNow(ofToday, nowMs);
  if (playing.length > 0 || starting.length > 0) return { playing, starting };
  const next = nextUp(ofToday, nowMs);
  return next ? { playing, starting, next } : { playing, starting };
}
```

- [ ] **Step 4: 実行して通るのを見る**

Run: `npx vitest run --project unit src/lib/stage-schedule.test.ts`
Expected: PASS（既存＋新しい 6 件）

- [ ] **Step 5: コミット**

```bash
git add src/lib/stage-schedule.ts src/lib/stage-schedule.test.ts
git commit -m "Feat: 入口ページの帯に出すステージの情報を決める関数を追加した"
```

---

### Task 3: 入口ページ

**Files:**
- Create: `src/components/home/EntranceTiles.tsx`、`src/components/home/StageHeadlineCard.tsx`
- Modify: `src/app/main/page.tsx`

**Interfaces:**
- Consumes: `NAV_ENTRANCES`（Task 1）、`stageHeadline`/`StageHeadline`（Task 2）、`blockTimeRange`
- Produces: `<EntranceTiles />`、`<StageHeadlineCard headline={StageHeadline} />`（空なら null）

- [ ] **Step 1: タイル** `src/components/home/EntranceTiles.tsx`

```tsx
import Link from "next/link";
import { NAV_ENTRANCES } from "@/lib/navigation";

/** 各ページへの入口。親指で押しやすい大きさの 2×2 */
export function EntranceTiles() {
  return (
    <nav className="grid w-full max-w-md grid-cols-2 gap-3">
      {NAV_ENTRANCES.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 p-3 text-center font-bold active:bg-white/15"
        >
          <Icon size={32} strokeWidth={1.5} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: ステージの帯** `src/components/home/StageHeadlineCard.tsx`

```tsx
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { blockTimeRange, type StageHeadline } from "@/lib/stage-schedule";

const place = (location: string) => (location ? `（${location}）` : "");

/** 入口ページのステージの帯。全体を押すとステージイベントへ。出すものが無ければ何も出さない */
export function StageHeadlineCard({ headline }: { headline: StageHeadline }) {
  const { playing, starting, next } = headline;
  if (playing.length === 0 && starting.length === 0 && !next) return null;
  return (
    <Link
      href="/stage-event"
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-white/30 p-3 active:bg-white/10"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {playing.map(({ section, block, current, next: after }) => (
          <div key={block.id}>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded bg-[#e54141] px-1.5 py-0.5 font-bold text-white">
                演奏中
              </span>
              <span className="truncate text-gray-300">
                {section.name}
                {section.location && `・${section.location}`}
              </span>
            </div>
            <p className="truncate pt-1 font-bold text-lg">{current.name}</p>
            <p className="truncate text-gray-400 text-xs">
              {after ? `次: ${after.name}` : "このブロックの最後です"}
            </p>
          </div>
        ))}
        {starting.map(({ section, block }) => (
          <p key={block.id} className="text-gray-200 text-sm">
            まもなく始まります: <b className="text-white">{section.name}</b>
            {place(section.location)}
          </p>
        ))}
        {next && (
          <p className="text-gray-200 text-sm">
            次は{" "}
            <b className="text-white">
              {blockTimeRange(next.block).split("〜")[0]}〜 {next.section.name}
            </b>
            {place(next.section.location)}
          </p>
        )}
      </div>
      <ChevronRight size={20} className="shrink-0 text-gray-400" />
    </Link>
  );
}
```

- [ ] **Step 3: 入口ページ** `src/app/main/page.tsx` を置き換える

```tsx
import { EntranceTiles } from "@/components/home/EntranceTiles";
import { StageHeadlineCard } from "@/components/home/StageHeadlineCard";
import SideMenu from "@/components/layout/SideMenu.tsx/SideMenu";
import { RefreshEvery } from "@/components/RefreshEvery";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { apiFetch } from "@/lib/api/client";
import type { StageSectionResponse } from "@/lib/api/stage";
import { eventYear } from "@/lib/constants";
import { announcementOrDefault } from "@/lib/live-schedule";
import { stageHeadline } from "@/lib/stage-schedule";

export default async function Main() {
  // 学生会が管理画面から書き換えるので、どちらもキャッシュしない。
  // 片方が落ちていても、もう片方とタイルは出す
  const [announcement, stage] = await Promise.allSettled([
    apiFetch<{ content: string }>("/announcements", { cache: "no-store" }),
    apiFetch<{ sections: StageSectionResponse[] }>("/stage", {
      cache: "no-store",
    }),
  ]);
  if (announcement.status === "rejected") {
    console.error("お知らせの取得に失敗しました", announcement.reason);
  }
  if (stage.status === "rejected") {
    console.error("ステージイベントの取得に失敗しました", stage.reason);
  }
  const content =
    announcement.status === "fulfilled" ? announcement.value.content : undefined;
  const sections = stage.status === "fulfilled" ? stage.value.sections : [];

  return (
    <div>
      <BulletinBoard content={announcementOrDefault(content)} />
      <SideMenu />
      <RefreshEvery seconds={60} />
      <div className="flex flex-col items-center gap-4 px-4 pb-10">
        <h1 className="pt-10 pb-2 text-center">
          <span className="block">{eventYear} 北九州高専</span>
          <span className="block font-extrabold text-5xl">高専祭</span>
        </h1>
        <StageHeadlineCard headline={stageHeadline(sections, Date.now())} />
        <EntranceTiles />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check src/components/home src/app/main && npx vitest run --project unit`
Expected: エラーなし、全テスト PASS

- [ ] **Step 5: コミット**

```bash
git add src/components/home src/app/main
git commit -m "Feat: /main を入口タイルとステージの帯のページに作り替えた"
```

---

### Task 4: タイトル画面

**Files:**
- Create: `src/lib/intro.ts`、`src/lib/intro.test.ts`、`src/components/home/IntroRedirect.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Produces: `INTRO_COOKIE = "kct_intro_seen"`、`introSeen(value: string | undefined): boolean`、`INTRO_COOKIE_SET: string`（`document.cookie` に入れる文字列）

- [ ] **Step 1: 失敗するテスト** `src/lib/intro.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { INTRO_COOKIE_SET, introSeen } from "./intro";

describe("タイトル画面を見たか", () => {
  it("Cookie が 1 のときだけ見たことにする", () => {
    expect(introSeen("1")).toBe(true);
    expect(introSeen(undefined)).toBe(false);
    expect(introSeen("")).toBe(false);
  });

  it("30 日、サイト全体で覚える", () => {
    expect(INTRO_COOKIE_SET).toBe(
      "kct_intro_seen=1; max-age=2592000; path=/; samesite=lax",
    );
  });
});
```

- [ ] **Step 2: 実行して失敗を見る**

Run: `npx vitest run --project unit src/lib/intro.test.ts`
Expected: FAIL（`./intro` が見つからない）

- [ ] **Step 3: 実装** `src/lib/intro.ts`

```ts
/** タイトル画面を一度見たら付ける Cookie。次からはタイトルを出さずに入口へ移す */
export const INTRO_COOKIE = "kct_intro_seen";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const INTRO_COOKIE_SET = `${INTRO_COOKIE}=1; max-age=${THIRTY_DAYS}; path=/; samesite=lax`;

export const introSeen = (value: string | undefined) => value === "1";
```

- [ ] **Step 4: 実行して通るのを見る**

Run: `npx vitest run --project unit src/lib/intro.test.ts`
Expected: PASS 2/2

- [ ] **Step 5: 自動で移る部品** `src/components/home/IntroRedirect.tsx`

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { INTRO_COOKIE_SET } from "@/lib/intro";

/** タイトルを少し見せてから入口ページへ。戻るでタイトルに戻らないよう履歴は置き換える */
export function IntroRedirect({ to, afterMs }: { to: string; afterMs: number }) {
  const router = useRouter();
  useEffect(() => {
    // biome-ignore lint/suspicious/noDocumentCookie: 一度見たことを覚えるだけの値
    document.cookie = INTRO_COOKIE_SET;
    router.prefetch(to);
    const timer = setTimeout(() => router.replace(to), afterMs);
    return () => clearTimeout(timer);
  }, [router, to, afterMs]);
  return null;
}
```

- [ ] **Step 6: タイトル画面** `src/app/page.tsx` を置き換える

```tsx
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IntroRedirect } from "@/components/home/IntroRedirect";
import { eventYear } from "@/lib/constants";
import { INTRO_COOKIE, introSeen } from "@/lib/intro";

export default async function Home() {
  // 一度見た人にはタイトルを出さず、すぐ入口へ(画面をちらつかせない)
  if (introSeen((await cookies()).get(INTRO_COOKIE)?.value)) redirect("/main");
  return (
    // JavaScript が動かなくても、押せば移れる
    <Link
      href="/main"
      replace
      className="flex h-dvh flex-col items-center justify-center text-center"
    >
      <div>{eventYear} 北九州高専</div>
      <div className="text-5xl">高専祭</div>
      <IntroRedirect to="/main" afterMs={2000} />
    </Link>
  );
}
```

- [ ] **Step 7: 型・整形・テスト**

Run: `npx tsc --noEmit && npx biome check src/lib/intro.ts src/lib/intro.test.ts src/components/home src/app/page.tsx && npx vitest run --project unit`
Expected: エラーなし、全テスト PASS（biome-ignore のルール名が違うと警告が出るので、出たら biome の示す名前に合わせる）

- [ ] **Step 8: コミット**

```bash
git add src/lib/intro.ts src/lib/intro.test.ts src/components/home/IntroRedirect.tsx src/app/page.tsx
git commit -m "Feat: タイトル画面から自動で入口ページへ移り、2回目からはすぐ移るようにした"
```

---

### Task 5: 実機確認（Playwright、390px）

ユーザーの 3000/1323 には触らない。一時バックエンド（scratchpad/be、:1324）と `NEXT_PUBLIC_API_BASE_URL=http://localhost:1324 npx next build && npx next start -p 3002` で確かめる。

- [ ] **Step 1:** `/` を Cookie 無しで開く → タイトルが出て、約 2 秒後に URL が `/main`。戻るで `/` に戻らない
- [ ] **Step 2:** 同じブラウザで `/` を開く → 応答がリダイレクト（307）で、すぐ `/main`
- [ ] **Step 3:** `/main` を、ブロックを `next` で 1 組目にした状態で開く → 帯に「演奏中」と出演者名、押すと `/stage-event`。スクリーンショットで横はみ出しが無いこと
- [ ] **Step 4:** すべて `prev` で 0 に戻した状態（今日はお祭りの日でない）→ 帯が出ない、タイル 4 つ
- [ ] **Step 5:** 一時バックエンドを止めて `/main` → 500 にならず、既定のお知らせとタイルが出る
- [ ] **Step 6:** `/map` → 「マップは準備中です」と 2D/3D ボタン。メニューに「トップ」と 4 つの入口
- [ ] **Step 7:** 一時サーバーを止め（`kill $(lsof -ti:1324)`、`kill $(lsof -ti:3002)`）、確認で変えた current_order を元に戻す
