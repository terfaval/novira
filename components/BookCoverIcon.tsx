"use client";

import { useEffect, useState } from "react";

export function BookCoverIcon({ slug, title }: { slug: string; title?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/covers/SVG/${slug}.svg`, { cache: "force-cache" });
        if (!res.ok) {
          if (!cancelled) setSvg(null);
          return;
        }
        const text = await res.text();
        if (!cancelled) setSvg(text);
      } catch {
        if (!cancelled) setSvg(null);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!svg) return null;

  return (
    <span
      className="cover-svg"
      aria-label={title ? `${title} borító ikon` : "borító ikon"}
      // feltételezés: az SVG-k a saját assetjeid, nem user input
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
