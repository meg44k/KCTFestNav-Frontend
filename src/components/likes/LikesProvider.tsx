"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { myLikes, toggleLike } from "@/app/actions/likes";
import { FAILED, nextVote, voteMessage } from "@/lib/likes";

type Likes = {
  /** 自分が投票している展示(1 人 1 票)。入れていなければ null */
  voted: number | null;
  /** name は押したあとの一言に使う展示の名前 */
  toggle: (boothId: number, name: string) => void;
};

const LikesContext = createContext<Likes | null>(null);

/** 投票のボタンが使う。Provider の外では null(ボタンを出さない) */
export function useLikes(): Likes | null {
  return useContext(LikesContext);
}

/**
 * 自分の票を持つ。一覧は全員で同じ HTML なので、開いたあとに自分が入れた展示を問い合わせる。
 * 押した瞬間に見た目を変え(ほかの展示に入れていた票はすぐ外れる)、通ったら何をしたかの一言、
 * 失敗したら戻して短いメッセージを出す
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [voted, setVoted] = useState<number | null>(null);
  // 問い合わせの答えより先に押していたら、押したほうを残す
  const touched = useRef(false);
  const [notice, setNotice] = useState<{
    text: string;
    note?: string;
    error: boolean;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let alive = true;
    myLikes().then((ids) => {
      if (alive && !touched.current) setVoted(ids[0] ?? null);
    });
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, []);

  const show = useCallback((text: string, error: boolean, note?: string) => {
    setNotice({ text, note, error });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(null), 3000);
  }, []);

  const toggle = useCallback(
    (boothId: number, name: string) => {
      touched.current = true;
      const before = voted;
      const next = nextVote(before, boothId);
      const message = voteMessage(before, boothId, name);
      setVoted(next);
      // つながらないなどで Server Action 自体が失敗したときも元に戻す
      toggleLike(boothId, next === boothId)
        .catch(() => ({ error: FAILED }))
        .then((res) => {
          if (!res.error) {
            show(message.text, false, message.note);
            return;
          }
          // 失敗した間にほかを押していなければ、押す前に戻す
          setVoted((cur) => (cur === next ? before : cur));
          show(res.error, true);
        });
    },
    [voted, show],
  );

  return (
    <LikesContext.Provider value={{ voted, toggle }}>
      {children}
      {notice && (
        <div
          role={notice.error ? "alert" : "status"}
          // 黒い背景のページでも見えるよう、薄い枠を付ける
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto max-w-md rounded-md border border-white/20 bg-black/90 px-4 py-3 text-center text-sm text-white"
        >
          {notice.text}
          {notice.note && (
            <span className="block text-white/60 text-xs">{notice.note}</span>
          )}
        </div>
      )}
    </LikesContext.Provider>
  );
}
