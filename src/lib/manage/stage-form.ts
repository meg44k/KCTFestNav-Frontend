// 番組表(セクション・ブロック・出演者)の入力を、API に送る形にする

type Parsed<T> = { ok: true; payload: T } | { ok: false; error: string };

export type SectionPayload = {
  name: string;
  location: string;
  sort_order: number;
};
export type BlockPayload = { start_time: string; end_time: string };
export type PerformerPayload = {
  name: string;
  detail: string;
  thumbnail_url: string;
};

const text = (f: FormData, key: string) => String(f.get(key) ?? "").trim();
// datetime-local は秒もタイムゾーンも持たないので、日本時間として扱う
const jst = (local: string) => `${local}:00+09:00`;

export function parseSectionForm(formData: FormData): Parsed<SectionPayload> {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "セクション名を入力してください" };
  const order = text(formData, "sortOrder");
  const sortOrder = order === "" ? 0 : Number(order);
  if (!Number.isInteger(sortOrder)) {
    return { ok: false, error: "並び順は整数で入力してください" };
  }
  return {
    ok: true,
    payload: {
      name,
      location: text(formData, "location"),
      sort_order: sortOrder,
    },
  };
}

export function parseBlockForm(formData: FormData): Parsed<BlockPayload> {
  const start = text(formData, "startTime");
  const end = text(formData, "endTime");
  if (!start || !end) {
    return { ok: false, error: "開始と終了の時刻を入力してください" };
  }
  if (new Date(jst(end)) <= new Date(jst(start))) {
    return { ok: false, error: "終了時刻は開始時刻より後にしてください" };
  }
  return { ok: true, payload: { start_time: jst(start), end_time: jst(end) } };
}

export function parsePerformerForm(
  formData: FormData,
): Parsed<PerformerPayload> {
  const name = text(formData, "name");
  if (!name) return { ok: false, error: "出演者名を入力してください" };
  const thumbnail = text(formData, "thumbnailUrl");
  if (thumbnail && !/^https?:\/\//.test(thumbnail)) {
    return {
      ok: false,
      error: "写真の URL は http:// か https:// で始めてください",
    };
  }
  return {
    ok: true,
    payload: {
      name,
      detail: text(formData, "detail"),
      thumbnail_url: thumbnail,
    },
  };
}

/** API の時刻を、日本時間の datetime-local の値(YYYY-MM-DDTHH:mm)にする */
export function toLocalInput(iso: string): string {
  const jstMs = new Date(iso).getTime() + 9 * 60 * 60_000;
  return new Date(jstMs).toISOString().slice(0, 16);
}
