import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  onClick?: () => void;
  isLink?: boolean;
}

export function Logo({ className, onClick, isLink = true }: LogoProps) {
  return isLink ? (
    <Link
      href="/"
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 text-lg font-semibold",
        className,
      )}
    >
      <MapPin className="size-4" />
      mapcn
    </Link>
  ) : (
    <div
      className={cn(
        "flex items-center gap-1.5 text-lg font-semibold",
        className,
      )}
    >
      <MapPin className="size-4" />
      mapcn
    </div>
  );
}
