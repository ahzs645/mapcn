import Link from "next/link";
import { Heart } from "lucide-react";

import { Logo } from "@/components/logo";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GitHubButton } from "@/components/github-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CommandSearch } from "@/components/command-search";
import { cn } from "@/lib/utils";

export function Header({ className }: { className?: string }) {
  return (
    <header
      className={cn("bg-background sticky top-0 z-50 h-14 w-full", className)}
    >
      <nav className="container flex size-full items-center">
        <MobileNav />
        <Logo className="mr-3 hidden shrink-0 lg:flex" />
        <MainNav className="hidden lg:flex" />

        <div className="ml-auto flex h-4.5 items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/examples">Examples</Link>
          </Button>
          <CommandSearch />
          <Separator orientation="vertical" className="ml-2 hidden md:block" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href="https://github.com/sponsors/AnmolSaini16"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Heart className="size-3.5 text-pink-500" />
                  Sponsor
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sponsor this project</p>
            </TooltipContent>
          </Tooltip>
          <Separator orientation="vertical" />
          <GitHubButton />
          <Separator orientation="vertical" />
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
