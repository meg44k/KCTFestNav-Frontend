import { X } from "lucide-react";
import type { Booth } from "@/lib/api/booths";
import { floorLabel } from "@/lib/map/campus";

/** 棟を押したときに下から出る、その棟のブースの一覧(階ごと) */
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
  return (
    <div className="max-h-[45dvh] overflow-y-auto rounded-t-xl border border-white/20 bg-black/95 p-4">
      <div className="flex items-center justify-between pb-2">
        <h2 className="font-bold text-lg">{name}</h2>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="p-1 text-gray-400"
        >
          <X size={20} />
        </button>
      </div>
      {groups.length === 0 ? (
        <p className="text-gray-400 text-sm">この棟のブースはありません。</p>
      ) : (
        groups.map((g) => (
          <section key={g.floor} className="pb-2">
            <h3 className="text-gray-400 text-xs">{floorLabel(g.floor)}</h3>
            <ul>
              {g.booths.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => onPick(b.id)}
                    className="w-full py-2 text-left"
                  >
                    {b.name}
                    <span className="pl-2 text-gray-400 text-xs">
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
