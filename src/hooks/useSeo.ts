import { useEffect } from "react";

export interface SeoJsonLd {
  "@context"?: string;
  [key: string]: unknown;
}

interface SeoOptions {
  title: string;
  description?: string;
  /** Path starting with "/" — combined with current origin for canonical/og:url. */
  canonicalPath?: string;
  ogImage?: string;
  /** JSON-LD blocks; rendered as script tags and removed on cleanup. */
  jsonLd?: SeoJsonLd[];
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  const prev = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (prev === null) el!.remove();
    else el!.setAttribute("content", prev);
  };
}

/**
 * Lightweight SPA head manager (no external dependencies).
 * Sets title, meta description, canonical, Open Graph/Twitter tags and
 * JSON-LD structured data; restores everything on unmount/update.
 */
export function useSeo({ title, description, canonicalPath, ogImage, jsonLd }: SeoOptions) {
  const jsonLdKey = JSON.stringify(jsonLd);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const addedNodes: Node[] = [];

    const prevTitle = document.title;
    document.title = title;
    cleanups.push(() => {
      document.title = prevTitle;
    });

    if (description) {
      cleanups.push(upsertMeta("name", "description", description));
      cleanups.push(upsertMeta("property", "og:description", description));
      cleanups.push(upsertMeta("name", "twitter:description", description));
    }

    if (canonicalPath) {
      const url = `${window.location.origin}${canonicalPath}`;
      cleanups.push(upsertMeta("property", "og:url", url));
      let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
        addedNodes.push(link);
      }
      const prevHref = link.getAttribute("href");
      link.setAttribute("href", url);
      cleanups.push(() => {
        if (prevHref === null) link!.remove();
        else link!.setAttribute("href", prevHref);
      });
    }

    if (title) {
      cleanups.push(upsertMeta("property", "og:title", title));
      cleanups.push(upsertMeta("name", "twitter:title", title));
    }

    if (ogImage) {
      cleanups.push(upsertMeta("property", "og:image", ogImage));
      cleanups.push(upsertMeta("name", "twitter:image", ogImage));
    }

    cleanups.push(upsertMeta("property", "og:type", "product"));

    if (jsonLdKey) {
      const blocks: SeoJsonLd[] = JSON.parse(jsonLdKey);
      for (const block of blocks) {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.textContent = JSON.stringify(block);
        document.head.appendChild(script);
        addedNodes.push(script);
      }
    }

    return () => {
      cleanups.forEach((fn) => fn());
      addedNodes.forEach((node) => node.parentNode?.removeChild(node));
    };
  }, [title, description, canonicalPath, ogImage, jsonLdKey]);
}
