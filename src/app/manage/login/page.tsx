import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "管理画面ログイン | 高専祭2026" };

export default function LoginPage() {
  return (
    <main className="flex flex-col items-center gap-8 px-4 pt-20">
      <h1 className="font-extrabold text-3xl">管理画面</h1>
      <LoginForm />
    </main>
  );
}
