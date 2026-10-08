// 管理画面のログイン Cookie。proxy からも読むため next/headers に依存させない
export const TOKEN_COOKIE = "kct_manage_token";
/** バックエンドの JWT と同じ 72 時間 */
export const TOKEN_MAX_AGE = 60 * 60 * 72;
