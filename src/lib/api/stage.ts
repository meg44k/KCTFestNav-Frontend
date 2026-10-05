/** GET /stage の出演者。紹介文・写真は空のこともある */
export type PerformerResponse = {
  id: number;
  block_id: number;
  name: string;
  detail: string;
  thumbnail_url: string;
  perform_order: number;
};

/**
 * ブロック(時間帯)。current_order は「何組目まで進んだか」で、
 * 0 = まだ始まっていない、1〜出演者数 = その組が演奏中、出演者数 + 1 = 終了
 */
export type StageBlockResponse = {
  id: number;
  section_id: number;
  start_time: string;
  end_time: string;
  current_order: number;
  /** 時間内で、出演者を指しているときだけ true(サーバーの時計で判定) */
  now_playing: boolean;
  performers: PerformerResponse[];
};

/** セクション(Live1、癒し系ミュージシャン など) */
export type StageSectionResponse = {
  id: number;
  name: string;
  location: string;
  sort_order: number;
  blocks: StageBlockResponse[];
};
