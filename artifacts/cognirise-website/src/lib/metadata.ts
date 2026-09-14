import { createContext, createElement, useContext, useEffect, type ReactNode } from "react";
import type { SeoMetadata } from "@workspace/api-client-react";

const PreviewMetadataContext = createContext(false);

export function PreviewMetadataBoundary({ children }: { children: ReactNode }) {
  return createElement(PreviewMetadataContext.Provider, { value: true }, children);
}

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl?: string | null;
  imageUrl?: string | null;
  noIndex?: boolean;
}

function setMeta(selector: string, key: string, value: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    const match = selector.match(/\[([^=]+)="([^"]+)"\]/);
    if (match) element.setAttribute(match[1], match[2]);
    document.head.appendChild(element);
  }
  element.setAttribute(key, value);
}

function removeMeta(selector: string) {
  document.head.querySelector<HTMLMetaElement>(selector)?.remove();
}

export function applyMetadata(metadata: PageMetadata) {
  document.title = metadata.title;
  setMeta('meta[name="description"]', "content", metadata.description);
  setMeta('meta[property="og:title"]', "content", metadata.title);
  setMeta('meta[property="og:description"]', "content", metadata.description);
  setMeta('meta[name="twitter:title"]', "content", metadata.title);
  setMeta('meta[name="twitter:description"]', "content", metadata.description);
  if (metadata.imageUrl) {
    setMeta('meta[property="og:image"]', "content", metadata.imageUrl);
    setMeta('meta[name="twitter:image"]', "content", metadata.imageUrl);
  } else {
    removeMeta('meta[property="og:image"]');
    removeMeta('meta[name="twitter:image"]');
  }
  setMeta('meta[name="robots"]', "content", metadata.noIndex ? "noindex,nofollow" : "index,follow");

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (metadata.canonicalUrl === null) {
    canonical?.remove();
    return;
  }
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = metadata.canonicalUrl || `${window.location.origin}${window.location.pathname}`;
}

export function metadataFromSeo(
  seo: SeoMetadata | undefined,
  fallback: PageMetadata,
): PageMetadata {
  if (!seo) return fallback;
  return {
    title: seo.title || fallback.title,
    description: seo.description || fallback.description,
    canonicalUrl: seo.canonicalUrl || fallback.canonicalUrl,
    noIndex: seo.noIndex,
    imageUrl: fallback.imageUrl,
  };
}

export function useDynamicMetadata(metadata: PageMetadata | undefined) {
  const preview = useContext(PreviewMetadataContext);
  useEffect(() => {
    if (metadata && !preview) applyMetadata(metadata);
  }, [metadata, preview]);
}