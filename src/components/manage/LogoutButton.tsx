"use client";

import { useTransition } from "react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/** ログアウトの前に確認する */
export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer border-[#e54141] text-[#e54141] hover:bg-[#e54141] hover:text-white"
          />
        }
      >
        ログアウト
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogTitle>ログアウトしますか？</DialogTitle>
        <div className="grid grid-cols-2 gap-2">
          <DialogClose
            render={
              <Button
                variant="outline"
                className="h-12 cursor-pointer border-black/20 bg-white text-black hover:bg-black/5"
              />
            }
          >
            キャンセル
          </DialogClose>
          <Button
            disabled={pending}
            onClick={() => start(() => logoutAction())}
            className="h-12 cursor-pointer bg-[#e54141] text-white hover:bg-[#e54141]/90 font-bold"
          >
            {pending ? "ログアウト中…" : "ログアウトする"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
