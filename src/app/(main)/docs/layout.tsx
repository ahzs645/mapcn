import { SidebarProvider } from "@/components/ui/sidebar";
import { DocsSidebar } from "./_components/docs-sidebar";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="container flex flex-col flex-1">
      <SidebarProvider>
        <DocsSidebar />
        <main className="size-full">{children}</main>
      </SidebarProvider>
    </div>
  );
}
