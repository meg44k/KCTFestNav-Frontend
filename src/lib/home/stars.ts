export type BackgroundStar = {
  x: number;
  y: number;
  r: number;
  opacity: number;
};

/** 決まった種から 0〜1 の数を順に出す(mulberry32)。毎回同じ並びになる */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 背景の星。x・y は画面の幅・高さに対する %、r は半径(px)。
 * 小さく暗い星を多く、大きく明るい星を少しにする(3 乗で偏らせる)
 */
export function makeStars(count: number, seed: number): BackgroundStar[] {
  const next = random(seed);
  return Array.from({ length: count }, () => {
    const size = next() ** 3;
    return {
      x: next() * 100,
      y: next() * 100,
      r: 0.4 + size * 1.2,
      opacity: 0.25 + (0.35 * next() + 0.35 * size),
    };
  });
}
