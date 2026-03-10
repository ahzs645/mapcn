import { Metadata } from "next";
import { notFound } from "next/navigation";
import { examples, getExampleBySlug } from "../_data/examples";
import { ExampleViewer } from "../_components/example-viewer";

export function generateStaticParams() {
  return examples.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const example = getExampleBySlug(slug);
  if (!example) return {};
  return {
    title: `${example.title} — mapcn Examples`,
    description: example.description,
  };
}

export default async function ExamplePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const example = getExampleBySlug(slug);
  if (!example) notFound();
  return <ExampleViewer slug={slug} />;
}
