/**
 * 入口ページの部品は、デザインの案(幅 264px)の寸法をそのまま使う。
 * 入れ物(@container)の幅を 264 とみなした長さにするので、どの画面の幅でも案と同じ比率になる
 */
export const DESIGN_WIDTH = 264;

export const u = (px: number) => `calc(${px} * 100cqw / ${DESIGN_WIDTH})`;
