export type Forward = { id: number; x: number; y: number };

/**
 * 地図の上のボタンや凡例に指が乗ったままピンチしても地図を拡大できるよう、どの指を地図に回すかを決める。
 * 2 本目の指が触れた時点で、地図の外に触れている指をすべて地図に回す。1 本指はボタンとしてそのまま
 */
export function createPinchTracker() {
  const touches = new Map<
    number,
    { x: number; y: number; onMap: boolean; forwarded: boolean }
  >();
  let pinched = false;
  return {
    /** 指が触れた。いま地図に回す指を、先に触れた順で返す */
    down(id: number, x: number, y: number, onMap: boolean): Forward[] {
      if (touches.size === 0) pinched = false;
      touches.set(id, { x, y, onMap, forwarded: false });
      if (touches.size < 2) return [];
      const out: Forward[] = [];
      for (const [tid, t] of touches) {
        if (t.onMap || t.forwarded) continue;
        t.forwarded = true;
        out.push({ id: tid, x: t.x, y: t.y });
      }
      if (out.length > 0) pinched = true;
      return out;
    },
    move(id: number, x: number, y: number) {
      const t = touches.get(id);
      if (t) Object.assign(t, { x, y });
    },
    up(id: number) {
      touches.delete(id);
    },
    /** 地図に回したピンチの最中か、その直後(離したあとのボタンの「押した」を無視する) */
    pinched: () => pinched,
  };
}
