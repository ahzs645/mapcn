import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { ExamplesGrid, exampleCount } from "./_components/examples-grid";

export const metadata: Metadata = {
  title: "Examples",
  description: "Interactive examples showcasing mapcn map components.",
};

export default function ExamplesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full p-4 container">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="text-muted-foreground text-sm">/</span>
            <span className="text-sm font-medium">Examples</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/docs">Docs</Link>
            </Button>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1 container pb-20">
        <div className="max-w-2xl pt-8 pb-10">
          <h1 className="text-3xl font-semibold tracking-tight">Examples</h1>
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            {exampleCount} interactive examples showcasing what you can build
            with mapcn. Ported from{" "}
            <a
              href="https://github.com/geoql/v-maplibre"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              v-maplibre
            </a>
            .
          </p>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="size-3.5" /> Home
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/docs">Documentation</Link>
            </Button>
          </div>
        </div>

        <ExamplesGrid />
      </main>
    </div>
  );
}
