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
