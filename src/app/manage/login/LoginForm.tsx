"use client";

import { useActionState } from "react";
import { type LoginState, loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="loginId">ログイン ID</Label>
        <Input
          id="loginId"
          name="loginId"
          autoComplete="username"
          defaultValue={state?.loginId}
          // 失敗のたびに作り直して、返ってきた ID を入れ直す
          key={state?.loginId}
          className="h-12 text-base"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">パスワード</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="h-12 text-base"
          required
        />
      </div>
      {state?.error && (
        <p role="alert" className="text-[#e54141]">
          {state.error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="h-14 text-lg font-bold bg-white text-black hover:bg-white/90"
      >
        {pending ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}
