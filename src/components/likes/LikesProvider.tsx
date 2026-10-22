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
import { FAILED, nextVote } from "@/lib/likes";

type Likes = {
  /** 自分が投票している展示(1 人 1 票)。入れていなければ null */
  voted: number | null;
  toggle: (boothId: number) => void;
};

const LikesContext = createContext<Likes | null>(null);

/** 投票のボタンが使う。Provider の外では null(ボタンを出さない) */
export function useLikes(): Likes | null {
  return useContext(LikesContext);
}

/**
 * 自分の票を持つ。一覧は全員で同じ HTML なので、開いたあとに自分が入れた展示を問い合わせる。
 * 押した瞬間に見た目を変え(ほかの展示に入れていた票はすぐ外れる)、失敗したら戻して短いメッセージを出す
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [voted, setVoted] = useState<number | null>(null);
  // 問い合わせの答えより先に押していたら、押したほうを残す
  const touched = useRef(false);
  const [error, setError] = useState<string | null>(null);
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

  const toggle = useCallback(
    (boothId: number) => {
      touched.current = true;
      const before = voted;
      const next = nextVote(before, boothId);
      setVoted(next);
      // つながらないなどで Server Action 自体が失敗したときも元に戻す
      toggleLike(boothId, next === boothId)
        .catch(() => ({ error: FAILED }))
        .then((res) => {
          if (!res.error) return;
          // 失敗した間にほかを押していなければ、押す前に戻す
          setVoted((cur) => (cur === next ? before : cur));
          setError(res.error);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setError(null), 3000);
        });
    },
    [voted],
  );

  return (
    <LikesContext.Provider value={{ voted, toggle }}>
      {children}
      {error && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-50 mx-auto max-w-md rounded-md bg-black/90 px-4 py-3 text-center text-sm text-white"
        >
          {error}
        </div>
      )}
    </LikesContext.Provider>
  );
}
