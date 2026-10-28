"use client";

import { useMemo, useState, useTransition } from "react";
import { type BoothMove, moveBooths } from "@/app/actions/manage-booths";
import { Map2D } from "@/components/map/Map2D";
import campusData from "@/data/campus.json";
import { type Booth, type BoothResponse, toBooth } from "@/lib/api/booths";
import { type CampusData, loadCampus, type XY } from "@/lib/map/campus";
import { mapPins } from "@/lib/map/map-booths";
import { floorAfterMove } from "@/lib/map/pin-move";

// 動かしたピンの色(ブランドの黄)。動かしていないピンは白っぽく
const MOVED = "#F2A900";
const STILL = "#E5E7EB";

type Place = { latitude: number; longitude: number; floor: number };

/**
 * 全部のブースのピンを地図に出し、押さえたまま動かして位置を直す。動かしたものはまとめて保存する。
 * 階は、建物の外に出したら屋外、建物に入れたらその棟の階(floorAfterMove)
 */
export function PinEditor({ booths }: { booths: BoothResponse[] }) {
  const campus = useMemo(
    () => loadCampus(campusData as unknown as CampusData),
    [],
  );
  // 保存してある位置(保存のたびに更新)と、動かした位置
  const [saved, setSaved] = useState<Map<number, Place>>(
    () =>
      new Map(
        booths.map((b) => [
          b.id,
          { latitude: b.latitude, longitude: b.longitude, floor: b.floor ?? 0 },
        ]),
      ),
  );
  const [moved, setMoved] = useState<Map<number, Place>>(new Map());
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current: Booth[] = useMemo(
    () =>
      booths.map((b) => {
        const p = moved.get(b.id) ?? saved.get(b.id);
        return toBooth({ ...b, ...p });
      }),
    [booths, moved, saved],
  );
  const pins = useMemo(
    () =>
      mapPins(campus, current, "all").map((p) => ({
        ...p,
        color: moved.has(p.id) ? MOVED : STILL,
      })),
    [campus, current, moved],
  );

  const onMovePin = (id: number, xy: XY) => {
    const base = saved.get(id);
    if (!base) return;
    const [longitude, latitude] = campus.toLonLat(...xy);
    const floor = floorAfterMove(campus, xy, base.floor);
    setMoved((m) => new Map(m).set(id, { latitude, longitude, floor }));
    setMessage(null);
  };

  const save = () =>
    startTransition(async () => {
      const list: BoothMove[] = [...moved].map(([id, p]) => ({ id, ...p }));
      const res = await moveBooths(list);
      // 保存できた分は「保存してある位置」に移す
      const done = list.slice(0, res.saved);
      setSaved((s) => {
        const next = new Map(s);
        for (const m of done) next.set(m.id, m);
        return next;
      });
      setMoved((m) => {
        const next = new Map(m);
        for (const d of done) next.delete(d.id);
        return next;
      });
      setMessage(
        res.error
          ? `${res.saved} 件保存しました。残りは保存できませんでした: ${res.error}`
          : `${res.saved} 件の位置を保存しました`,
      );
    });

  const noLocation = booths.filter((b) => !b.latitude && !b.longitude).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-gray-600 text-sm">
        ピンを押さえたまま動かすと、位置を直せます。建物の外に出すと屋外、建物に入れるとその棟の階になります(階は各ブースの編集でも直せます)。
        {noLocation > 0 &&
          ` 場所がまだ無いブース ${noLocation} 件は、地図に出ていません(各ブースの編集で場所を選んでください)。`}
      </p>
      <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-lg">
        <Map2D
          campus={campus}
          pins={pins}
          selectedPinId={null}
          focus={null}
          location={null}
          onPickPin={() => {}}
          onPickBuilding={() => {}}
          onPickNothing={() => {}}
          onMovePin={onMovePin}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={moved.size === 0 || pending}
          onClick={save}
          className="h-10 rounded-full bg-black px-5 font-bold text-sm text-white disabled:opacity-40"
        >
          {pending ? "保存しています…" : `変更 ${moved.size} 件を保存`}
        </button>
        <button
          type="button"
          disabled={moved.size === 0 || pending}
          onClick={() => {
            setMoved(new Map());
            setMessage(null);
          }}
          className="h-10 rounded-full border border-black/20 px-5 font-bold text-sm disabled:opacity-40"
        >
          元に戻す
        </button>
        <span className="flex items-center gap-1.5 text-gray-600 text-xs">
          <span
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: MOVED }}
          />
          動かしたピン(まだ保存していない)
        </span>
        {message && <output className="w-full text-sm">{message}</output>}
      </div>
    </div>
  );
}
