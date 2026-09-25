import { eventYear } from "@/lib/constants";

export default function Home() {
  return (
    <div className="flex justify-center items-center h-dvh">
      <a href="/main" className="text-center">
        <div>{eventYear} 北九州高専</div>
        <div className="text-5xl">高専祭</div>
      </a>
    </div>
  );
}
