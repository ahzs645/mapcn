import Link from "next/link";

import { siteNavigation } from "@/lib/site-navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MainNav({ className, ...props }: React.ComponentProps<"nav">) {
  const navItems = siteNavigation
    .find((group) => group.title === "Pages")
    ?.items.filter((item) => item.title !== "Home");

  if (!navItems?.length) return null;

  return (
    <nav className={cn("flex items-center", className)} {...props}>
      {navItems.map((item) => (
        <Button key={item.href} variant="ghost" asChild size="sm">
          <Link
            href={item.href}
            className="relative inline-flex items-center gap-1.5"
          >
            <span>{item.title}</span>
          </Link>
        </Button>
      ))}
    </nav>
  );
}
