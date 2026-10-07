import Link from "next/link";
import { TILE_ENTRANCES } from "@/lib/navigation";

/** 各ページへの入口。親指で押しやすい大きさの 2×2 */
export function EntranceTiles() {
  return (
    <nav className="grid w-full max-w-md grid-cols-2 gap-3">
      {TILE_ENTRANCES.map(({ label, href, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 p-3 text-center font-bold active:bg-white/15"
        >
          <Icon size={32} strokeWidth={1.5} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
