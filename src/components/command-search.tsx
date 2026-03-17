"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  CornerDownLeft,
  FileText,
  SearchIcon,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { siteNavigation } from "@/lib/site-navigation";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function CommandSearch({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((open) => !open);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Search documentation"
        className={cn(
          "hidden md:flex h-8 w-48 items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-2.5 text-muted-foreground hover:bg-muted/70 hover:text-foreground",
          className
        )}
      >
        <SearchIcon className="size-3.5" />
        <span>Search...</span>
        <KbdGroup className="ml-auto">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search..."
        description="Jump to pages, components, and docs"
        showCloseButton={false}
      >
        <CommandInput
          placeholder="Search..."
          className="border-none text-sm h-10"
        />
        <CommandList>
          <CommandEmpty className="py-8 text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-1.5">
              <FileText className="size-5 opacity-40" />
              <span>No results found.</span>
            </div>
          </CommandEmpty>
          {siteNavigation.map((group) => (
            <CommandGroup key={group.title} heading={group.title}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.title}
                  onSelect={() => handleSelect(item.href)}
                  className="p-0"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
        <div className="border-t p-3 text-xs text-muted-foreground/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center gap-1.5">
              <Kbd>
                <ArrowUp className="size-3" />
              </Kbd>
              <Kbd>
                <ArrowDown className="size-3" />
              </Kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>
                <CornerDownLeft className="size-3" />
              </Kbd>
              <span>select</span>
            </span>
          </div>
          <span className="flex items-baseline gap-1.5">
            <Kbd>esc</Kbd>
            <span>close</span>
          </span>
        </div>
      </CommandDialog>
    </>
  );
}
