"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { currentAnnouncement } from "@/app/actions/announcement";
import { BulletinBoard } from "@/components/ui/bulletinBoard";
import { showsBulletin } from "@/lib/bulletin";
import { BG } from "@/lib/home/palette";

// 管理画面で変えたお知らせを、開いている画面にも出すまでの間隔
const RELOAD_MS = 60_000;

/**
 * 来場者のどのページでも、いちばん上に固定して流すお知らせの帯。
 * 全ページ共通の枠に置くので、ページを移っても作り直さず流れが途切れない。
 * 高さは globals.css の --bulletin-h(帯があるときだけ 42px)。固定の地図などはこの分を下げる
 */
export function GlobalBulletin({ initial }: { initial: string }) {
  const pathname = usePathname();
  const show = showsBulletin(pathname);
  const [content, setContent] = useState(initial);

  useEffect(() => {
    if (!show) return;
    let alive = true;
    const id = setInterval(() => {
      currentAnnouncement()
        .then((c) => {
          if (alive) setContent(c);
        })
        .catch(() => {});
    }, RELOAD_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [show]);

  if (!show) return null;
  return (
    // intro-bulletin: タイトル画面から入口ページへ来たときに、ふわっと出す目印(globals.css)
    <div
      data-bulletin
      className="intro-bulletin sticky top-0 z-40 h-[var(--bulletin-h)] shrink-0 overflow-hidden"
      style={{ background: BG }}
    >
      <BulletinBoard content={content} />
    </div>
  );
}
