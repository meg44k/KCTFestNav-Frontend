/** タイトル画面を一度見たら付ける Cookie。次からはタイトルを出さずに入口へ移す */
export const INTRO_COOKIE = "kct_intro_seen";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const INTRO_COOKIE_SET = `${INTRO_COOKIE}=1; max-age=${THIRTY_DAYS}; path=/; samesite=lax`;

export const introSeen = (value: string | undefined) => value === "1";
