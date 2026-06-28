/**
 * components/seo/JsonLd.tsx
 *
 * Generic JSON-LD injector.
 * Renders a <script type="application/ld+json"> tag in the document head.
 * Uses dangerouslySetInnerHTML — safe here because the data comes from our
 * own constants, never from user input.
 *
 * Usage:
 *   <JsonLd data={mySchemaObject} />
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
