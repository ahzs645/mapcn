"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";

type HeaderAlign = "center" | "left";

const PageHeaderContext = createContext<{ align: HeaderAlign }>({
  align: "center",
});

function usePageHeaderContext() {
  return useContext(PageHeaderContext);
}

interface PageHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Show the dot grid background (default: true) */
  showBackground?: boolean;
  /** Header content alignment (default: center) */
  align?: HeaderAlign;
}

function PageHeader({
  children,
  className,
  showBackground = true,
  align = "center",
}: PageHeaderProps) {
  return (
    <PageHeaderContext.Provider value={{ align }}>
      <div className="relative">
        {showBackground && (
          <div className="pointer-events-none absolute inset-x-0 -inset-y-10 overflow-hidden">
            <div
              className="absolute inset-0 opacity-[0.20] dark:opacity-[0.12]"
              style={{
                backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="from-background to-background absolute inset-0 bg-linear-to-b via-transparent" />
          </div>
        )}

        <section
          className={cn(
            "container mx-auto flex w-full max-w-6xl flex-col gap-4 py-16 md:py-20 lg:py-24",
            align === "center"
              ? "items-center text-center"
              : "items-start text-left",
            className,
          )}
        >
          {children}
        </section>
      </div>
    </PageHeaderContext.Provider>
  );
}

interface PageHeaderHeadingProps {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2";
}

function PageHeaderHeading({
  children,
  className,
  as: Comp = "h1",
}: PageHeaderHeadingProps) {
  const { align } = usePageHeaderContext();

  return (
    <Comp
      className={cn(
        "animate-fade-up max-w-4xl text-4xl font-semibold tracking-tight delay-100 sm:text-5xl md:text-6xl",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      <span className="from-foreground via-foreground to-foreground/65 bg-linear-to-b bg-clip-text text-transparent">
        {children}
      </span>
    </Comp>
  );
}

interface PageHeaderDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

function PageHeaderDescription({
  children,
  className,
}: PageHeaderDescriptionProps) {
  const { align } = usePageHeaderContext();

  return (
    <p
      className={cn(
        "text-muted-foreground animate-fade-up max-w-2xl leading-relaxed delay-200 sm:text-lg sm:leading-relaxed md:text-xl md:leading-relaxed",
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </p>
  );
}

interface PageContentProps {
  children: React.ReactNode;
  className?: string;
}

function PageContent({ children, className }: PageContentProps) {
  return (
    <div className={cn("animate-fade-up w-full max-w-lg delay-300", className)}>
      {children}
    </div>
  );
}

interface PageActionsProps {
  children: React.ReactNode;
  className?: string;
}

function PageActions({ children, className }: PageActionsProps) {
  const { align } = usePageHeaderContext();

  return (
    <div
      className={cn(
        "animate-fade-up mt-3 flex flex-wrap items-center gap-3 delay-400",
        align === "center" ? "justify-center" : "justify-start",
        className,
      )}
    >
      {children}
    </div>
  );
}

export {
  PageHeader,
  PageHeaderHeading,
  PageHeaderDescription,
  PageContent,
  PageActions,
};
