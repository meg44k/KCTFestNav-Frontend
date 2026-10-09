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
import { FAILED, withLike } from "@/lib/likes";

type Likes = {
  isLiked: (boothId: number) => boolean;
  toggle: (boothId: number) => void;
};

const LikesContext = createContext<Likes | null>(null);

/** ハートのボタンが使う。Provider の外では null(ハートを出さない) */
export function useLikes(): Likes | null {
  return useContext(LikesContext);
}

/**
 * 自分のいいねを持つ。一覧は全員で同じ HTML なので、開いたあとに自分が押したものを問い合わせる。
 * 押した瞬間に見た目を変え、失敗したら戻して短いメッセージを出す
 */
export function LikesProvider({ children }: { children: ReactNode }) {
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let alive = true;
    myLikes().then((ids) => {
      if (alive) setLiked((cur) => new Set([...cur, ...ids]));
    });
    return () => {
      alive = false;
      clearTimeout(timer.current);
    };
  }, []);

  const toggle = useCallback(
    (boothId: number) => {
      const on = !liked.has(boothId);
      setLiked((cur) => withLike(cur, boothId, on));
      // つながらないなどで Server Action 自体が失敗したときも元に戻す
      toggleLike(boothId, on)
        .catch(() => ({ error: FAILED }))
        .then((res) => {
          if (!res.error) return;
          setLiked((cur) => withLike(cur, boothId, !on));
          setError(res.error);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setError(null), 3000);
        });
    },
    [liked],
  );

  return (
    <LikesContext.Provider value={{ isLiked: (id) => liked.has(id), toggle }}>
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
