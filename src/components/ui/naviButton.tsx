import { Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

function NaviButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={cn(
        "flex border border-black rounded-full w-8 h-8 justify-center items-center",
        className,
      )}
    >
      <Navigation
        className="text-black -translate-x-0.5 translate-y-0.5 fill-current"
        strokeWidth={1}
        size={20}
      />
    </button>
  );
}

export { NaviButton };
