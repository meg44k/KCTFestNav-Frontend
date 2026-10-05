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
