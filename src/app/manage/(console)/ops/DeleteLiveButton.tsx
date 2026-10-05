"use client";

import { useState, useTransition } from "react";
import { deleteLive } from "@/app/actions/ops";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteLiveButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        setError(undefined);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="text-[#e54141]" />
        }
      >
        削除
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>「{name}」を削除しますか？</DialogTitle>
        {error && (
          <p role="alert" className="text-[#e54141]">
            {error}
          </p>
        )}
        <Button
          disabled={pending}
          className="h-12 bg-[#e54141] text-white hover:bg-[#e54141]/90 font-bold"
          onClick={() =>
            start(async () => {
              const res = await deleteLive(id);
              if (res.error) setError(res.error);
              else setOpen(false);
            })
          }
        >
          {pending ? "削除中…" : "削除する"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
