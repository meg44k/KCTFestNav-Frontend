/**
 * 着いたとみなす距離(m)。GPS は 10〜20m ずれるため、これより近いと矢印があてにならない
 */
export const ARRIVE_M = 20;

/** 着いたか。距離 0 は現在地がまだ取れていないときなので、着いたことにしない */
export const hasArrived = (distance: number) =>
  distance > 0 && distance <= ARRIVE_M;

/**
 * 現在地が取れないときに出す文。GeolocationPositionError の code
 * (1: 許可されていない / 2: 取れない / 3: 時間切れ)ごとに、何をすればいいかを書く
 */
export function geoErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "位置情報が許可されていません。iPhone は「設定」→「プライバシーとセキュリティ」→「位置情報サービス」、Android はブラウザのサイトの設定から、このサイトの位置情報を許可してください。";
    case 3:
      return "現在地が取れませんでした。空が見える所に出て、もう一度開いてください。";
    default:
      return "現在地が取れませんでした。少し待ってから、もう一度開いてください。";
  }
}

/** 向きが取れない理由。noSensor: 値が無い(センサーの無い PC など) / notAbsolute: 北基準でない */
export type HeadingProblem = "noSensor" | "notAbsolute";

/**
 * 向きのイベントから、北から時計回りの向き(度)を読む。
 * 目的地の方角は北基準なので、北基準でない値は引き算できず使えない
 */
export function readHeading(e: {
  webkitCompassHeading?: number;
  alpha: number | null;
  absolute: boolean;
}): number | HeadingProblem {
  // iOS Safari だけが持つ、真北基準の方位
  if (e.webkitCompassHeading !== undefined) return e.webkitCompassHeading;
  if (e.alpha === null) return "noSensor";
  if (!e.absolute) return "notAbsolute";
  // alpha は反時計回りなので、時計回りに直す
  return (360 - e.alpha) % 360;
}

export function sensorErrorMessage(problem: HeadingProblem): string {
  return problem === "noSensor"
    ? "端末の向きを取得できませんでした。"
    : "この端末では北の向きが分からないため、矢印が正しくない場合があります。地図で場所を確かめてください。";
}
