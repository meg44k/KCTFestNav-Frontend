import { X } from "lucide-react";
import type { Booth } from "@/lib/api/booths";
import { floorLabel } from "@/lib/map/campus";

/** 棟を押したときに下から出る、その棟のブースの一覧(階ごと)。メニューと同じ黄色に黒い文字 */
export function BuildingSheet({
  name,
  groups,
  onPick,
  onClose,
}: {
  name: string;
  groups: { floor: number; booths: Booth[] }[];
  onPick(id: number): void;
  onClose(): void;
}) {
  // ぴょこっと上に行き過ぎたとき下に隙間が見えないよう、同じ黄色の影を下に 40px 伸ばしておく
  return (
    <div className="max-h-[45dvh] overflow-y-auto rounded-t-xl border border-amber-300 bg-amber-400 p-4 text-black shadow-[0_40px_0_#fbbf24]">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-bold text-lg">{name}</h2>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="p-1 text-black/60"
        >
          <X size={20} />
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-black/70 text-sm">この棟のブースはありません。</p>
      ) : (
        groups.map((g) => (
          <section key={g.floor} className="pb-2">
            <h3 className="font-bold text-black/60 text-xs">
              {floorLabel(g.floor)}
            </h3>
            <ul>
              {g.booths.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onPick(b.id)}
                    className="w-full border-black/10 border-b py-2 text-left font-bold"
                  >
                    {b.name}
                    <span className="pl-2 font-normal text-black/60 text-xs">
                      {b.organizer}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
