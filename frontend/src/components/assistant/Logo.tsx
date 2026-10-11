import { cn } from "@/lib/utils";
import logoUrl from "@/assets/logo.png";

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl || "/logo.png"}
      alt="Lenny's Podcast"
      className={cn("shrink-0 object-contain select-none", className)}
      draggable={false}
      aria-hidden="true"
    />
  );
}
