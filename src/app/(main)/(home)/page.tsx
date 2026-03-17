import { ExamplesGrid } from "./_components/examples-grid";
import { Footer } from "@/components/footer";
import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderDescription,
  PageActions,
} from "@/components/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <>
      <PageHeader>
        <PageHeaderHeading>Beautiful maps, made simple</PageHeaderHeading>
        <PageHeaderDescription>
          Ready to use, customizable map components for React.
          <br className="hidden sm:block" />
          Built on MapLibre. Styled with Tailwind.
        </PageHeaderDescription>

        <PageActions>
          <Button size="lg" asChild>
            <Link href="/docs">Get Started</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/docs/basic-map">View Components</Link>
          </Button>
        </PageActions>
      </PageHeader>

      <section className="container-wide">
        <ExamplesGrid />
      </section>

      <Footer />
    </>
  );
}
