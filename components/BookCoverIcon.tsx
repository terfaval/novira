"use client";

import { useEffect, useState } from "react";

const DEFAULT_COVER_SLUG = "icon_default";

export function BookCoverIcon({ slug, title }: { slug: string; title?: string }) {
  const [svg, setSvg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSvgBySlug(nextSlug: string): Promise<string | null> {
      const res = await fetch(`/covers/SVG/${encodeURIComponent(nextSlug)}.svg`, { cache: "force-cache" });
      if (!res.ok) return null;
      return res.text();
    }

    async function load() {
      try {
        const normalizedSlug = slug.trim().toLowerCase();
        const primarySlug = normalizedSlug || DEFAULT_COVER_SLUG;
        const primarySvg = await fetchSvgBySlug(primarySlug);
        if (primarySvg) {
          if (!cancelled) setSvg(primarySvg);
          return;
        }

        if (primarySlug === DEFAULT_COVER_SLUG) {
          if (!cancelled) setSvg(null);
          return;
        }

        const fallbackSvg = await fetchSvgBySlug(DEFAULT_COVER_SLUG);
        if (!cancelled) setSvg(fallbackSvg);
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
      aria-label={title ? `${title} borito ikon` : "borito ikon"}
      // Assumes SVG assets are trusted local files.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
