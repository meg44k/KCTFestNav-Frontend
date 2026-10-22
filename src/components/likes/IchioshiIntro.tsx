"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { markIntroSeen, shouldShowIntro } from "@/lib/likes";

// 端末に覚える場所。使えない(プライベートモードなど)ときは null
function introStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// 説明の中に出す、本物と同じ見た目のボタン(押せない)
const SAMPLE =
  "inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-full border px-3 font-bold text-xs";

/** クラス展示を初めて開いたときに 1 回だけ出す、イチオシの説明 */
export function IchioshiIntro() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const storage = introStorage();
    if (storage && shouldShowIntro(storage)) setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    const storage = introStorage();
    if (storage) markIntroSeen(storage);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="gap-5 bg-white p-6 text-black"
      >
        <DialogTitle className="text-center font-bold text-xl">
          あなたの「イチオシ」を選ぼう
        </DialogTitle>
        <DialogDescription className="flex flex-col items-center gap-4 text-center text-black text-sm">
          <span>
            いちばん気に入ったクラス展示の
            <br />
            ボタンを押してください
          </span>
          <span className="flex items-center gap-2" aria-hidden>
            <span className={`${SAMPLE} border-black bg-white`}>
              イチオシにする
            </span>
            <span className="text-black/40">→</span>
            <span
              className={`${SAMPLE} text-white`}
              style={{ background: "#00B894", borderColor: "#00B894" }}
            >
              <Check size={14} strokeWidth={3} />
              イチオシ済
            </span>
          </span>
          <span className="text-black/60 text-xs">
            1 人 1 つまで。あとから別の展示に変えられます
          </span>
        </DialogDescription>
        <button
          type="button"
          onClick={close}
          className="h-11 rounded-full bg-black font-bold text-white active:scale-95"
        >
          わかった
        </button>
      </DialogContent>
    </Dialog>
  );
}
