import type {
  PerformerResponse,
  StageBlockResponse,
  StageSectionResponse,
} from "@/lib/api/stage";

const TZ = "Asia/Tokyo";

// 日本時間の日付。並べ替えにも使うので YYYY-MM-DD
const dayKey = (iso: string | number) =>
  new Date(iso).toLocaleDateString("sv-SE", { timeZone: TZ });

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const md = d.toLocaleDateString("ja-JP", {
    timeZone: TZ,
    month: "long",
    day: "numeric",
  });
  const wd = d.toLocaleDateString("ja-JP", { timeZone: TZ, weekday: "short" });
  return `${md}（${wd}）`;
};

// タブ用の短い表記「10/31(土)」
const dayShort = (iso: string) => {
  const d = new Date(iso);
  const md = d.toLocaleDateString("ja-JP", {
    timeZone: TZ,
    month: "numeric",
    day: "numeric",
  });
  const wd = d.toLocaleDateString("ja-JP", { timeZone: TZ, weekday: "short" });
  return `${md}(${wd})`;
};

const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });

const ms = (iso: string) => new Date(iso).getTime();

export type StageDay = { key: string; label: string; short: string };

/** 番組のある日(日本時間)。日付順 */
export function stageDays(sections: StageSectionResponse[]): StageDay[] {
  const days = new Map<string, StageDay>();
  for (const s of sections) {
    for (const b of s.blocks) {
      const key = dayKey(b.start_time);
      if (!days.has(key))
        days.set(key, {
          key,
          label: dayLabel(b.start_time),
          short: dayShort(b.start_time),
        });
    }
  }
  return [...days.values()].sort((a, b) => a.key.localeCompare(b.key));
}

/** 開く日。URL で指定された日 > 今日 > 最初の日 */
export function pickDay(
  days: StageDay[],
  requested: string | undefined,
  nowMs: number,
): StageDay | undefined {
  return (
    days.find((d) => d.key === requested) ??
    days.find((d) => d.key === dayKey(nowMs)) ??
    days[0]
  );
}

/**
 * その日のブロックだけを持つセクション。ブロックは開始順、
 * セクションは並び順の値 → 最初のブロックの開始 → id の順
 */
export function sectionsOn(
  sections: StageSectionResponse[],
  key: string,
): StageSectionResponse[] {
  return sections
    .map((s) => ({
      ...s,
      blocks: s.blocks
        .filter((b) => dayKey(b.start_time) === key)
        .sort((a, b) => ms(a.start_time) - ms(b.start_time) || a.id - b.id),
    }))
    .filter((s) => s.blocks.length > 0)
    .sort(
      (a, b) =>
        a.sort_order - b.sort_order ||
        ms(a.blocks[0].start_time) - ms(b.blocks[0].start_time) ||
        a.id - b.id,
    );
}

export type PerformerMark = "done" | "playing" | "none";

/**
 * 出演者の印。current_order は「何組目か」なので、出演順の番号ではなく
 * 並び(index + 1)と比べる(削除で番号が飛んでもずれない)。
 * 演奏中は時間内(now_playing)のときだけ付ける
 */
export function performerMark(
  block: StageBlockResponse,
  index: number,
): PerformerMark {
  const position = index + 1;
  if (position < block.current_order) return "done";
  if (position === block.current_order && block.now_playing) return "playing";
  return "none";
}

export type NowPlaying = {
  section: StageSectionResponse;
  block: StageBlockResponse;
  current: PerformerResponse;
  next?: PerformerResponse;
};

/** 演奏中のブロックごとの、今と次の出演者 */
export function nowPlaying(sections: StageSectionResponse[]): NowPlaying[] {
  const out: NowPlaying[] = [];
  for (const section of sections) {
    for (const block of section.blocks) {
      const current = block.performers[block.current_order - 1];
      if (!block.now_playing || !current) continue;
      out.push({
        section,
        block,
        current,
        next: block.performers[block.current_order],
      });
    }
  }
  return out;
}

/** これから始まるブロックのうち最も早いもの */
export function nextUp(
  sections: StageSectionResponse[],
  nowMs: number,
): { section: StageSectionResponse; block: StageBlockResponse } | undefined {
  let found:
    | { section: StageSectionResponse; block: StageBlockResponse }
    | undefined;
  for (const section of sections) {
    for (const block of section.blocks) {
      if (ms(block.start_time) <= nowMs) continue;
      if (!found || ms(block.start_time) < ms(found.block.start_time)) {
        found = { section, block };
      }
    }
  }
  return found;
}

/** 全ブロックの終了時刻を過ぎたか。延びて演奏中のブロックがあれば終わっていない */
export function sectionFinished(
  section: StageSectionResponse,
  nowMs: number,
): boolean {
  return section.blocks.every((b) => ms(b.end_time) <= nowMs && !b.now_playing);
}

export function blockTimeRange(block: StageBlockResponse): string {
  return `${hm(block.start_time)}〜${hm(block.end_time)}`;
}

/** セクションの時間帯 = 最初のブロックの開始〜最後に終わるブロックの終了 */
export function sectionTimeRange(section: StageSectionResponse): string {
  const starts = section.blocks.map((b) => b.start_time);
  const ends = section.blocks.map((b) => b.end_time);
  const first = starts.reduce((a, b) => (ms(b) < ms(a) ? b : a));
  const last = ends.reduce((a, b) => (ms(b) > ms(a) ? b : a));
  return `${hm(first)}〜${hm(last)}`;
}

/**
 * 「次のバンドへ」「前に戻す」を押した後の current_order(バックエンドと同じ計算)。
 * 出演者が消されて数を超えていても、戻すと 1 回で最後の出演者になる
 */
export function stepOrder(
  current: number,
  count: number,
  dir: "next" | "prev",
): number {
  return dir === "next"
    ? Math.min(current + 1, count + 1)
    : Math.max(Math.min(current, count + 1) - 1, 0);
}

/** 時間になったのに、学生会がまだ 1 組目を始めていないブロック */
export function startingNow(
  sections: StageSectionResponse[],
  nowMs: number,
): { section: StageSectionResponse; block: StageBlockResponse }[] {
  return sections.flatMap((section) =>
    section.blocks
      .filter(
        (b) =>
          b.current_order === 0 &&
          b.performers.length > 0 &&
          ms(b.start_time) <= nowMs &&
          nowMs < ms(b.end_time),
      )
      .map((block) => ({ section, block })),
  );
}

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
