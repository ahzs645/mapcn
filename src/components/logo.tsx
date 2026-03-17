import Link from "next/link";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export function Logo({ className, onClick }: LogoProps) {
  return (
    <Button
      asChild
      size="sm"
      variant="ghost"
      className={cn("px-2.5 text-base font-semibold", className)}
    >
      <Link href="/" onClick={onClick}>
        <MapPin />
        mapcn
      </Link>
    </Button>
  );
}
