import { Component, createContext, useContext, useEffect, type ComponentType, type ErrorInfo, type ReactNode } from "react";
import { CmsPreviewRequestBoundary, type CmsRecord } from "@/lib/cms";
import { PreviewMetadataBoundary } from "@/lib/metadata";
import type { LandingPageContent } from "@workspace/api-zod";
import { contentRecord, governedLandingDelivery, LandingSlotDeliveryError, useCmsCollection } from "@/lib/cms";
import { ServiceError } from "@/components/error-boundary";

export type GovernedLandingRouteProps = {
  pagePath: "/about" | "/partners" | "/platforms" | "/insights" | "/methodologies";
  compiled: ComponentType;
  pageOverride?: CmsRecord<LandingPageContent>;
};
const GovernedLandingContext = createContext<CmsRecord<LandingPageContent> | null>(null);
export const useGovernedLanding = () => useContext(GovernedLandingContext);

function PageUnavailable({ missingEdition = false }: { missingEdition?: boolean }) {
  return <main className="min-h-[60vh] px-6 py-24"><h1 className="text-5xl">Page unavailable</h1><p>{missingEdition ? "No published edition exists for this market and locale." : "The published page could not be delivered."}</p></main>;
}

class LandingSlotErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (error instanceof LandingSlotDeliveryError) {
      console.error(error.message, info.componentStack);
    }
  }

  render() {
    if (this.state.error instanceof LandingSlotDeliveryError) return <PageUnavailable />;
    if (this.state.error) throw this.state.error;
    return this.props.children;
  }
}

function GovernedLandingPreviewRoute({ compiled: Compiled, pageOverride }: Required<Pick<GovernedLandingRouteProps, "compiled" | "pageOverride">>) {
  return (
    <CmsPreviewRequestBoundary>
      <PreviewMetadataBoundary>
        <LandingSlotErrorBoundary key={`${pageOverride.id}:${pageOverride.updatedAt}`}>
          <GovernedLandingContext.Provider value={pageOverride}>
            <Compiled />
          </GovernedLandingContext.Provider>
        </LandingSlotErrorBoundary>
      </PreviewMetadataBoundary>
    </CmsPreviewRequestBoundary>
  );
}

function GovernedLandingPublishedRoute({ pagePath, compiled: Compiled }: GovernedLandingRouteProps) {
  const query = useCmsCollection("landing-page", [], (item) => contentRecord(item, "landing-page"));
  const page = query.data.find((candidate) => candidate.pagePath === pagePath);
  const delivery = governedLandingDelivery(
    query.delivery,
    query.configuredPagePaths,
    pagePath,
    Boolean(page),
  );

  useEffect(() => {
    if (!page) return;
    const previousTitle = document.title;
    if (page.seo.title) document.title = page.seo.title;
    const description = page.seo.description;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const previousDescription = meta?.content;
    const previousRobots = robots?.content;
    const previousCanonical = canonical?.href;
    if (description) {
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.append(meta);
      }
      meta.content = description;
    }
    if (page.seo.noIndex) {
      if (!robots) {
        robots = document.createElement("meta");
        robots.name = "robots";
        document.head.append(robots);
      }
      robots.content = "noindex,nofollow";
    }
    if (page.seo.canonicalUrl) {
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.rel = "canonical";
        document.head.append(canonical);
      }
      canonical.href = page.seo.canonicalUrl;
    }
    return () => {
      document.title = previousTitle;
      if (meta && previousDescription !== undefined) meta.content = previousDescription;
      if (robots && previousRobots !== undefined) robots.content = previousRobots;
      if (canonical && previousCanonical !== undefined) canonical.href = previousCanonical;
    };
  }, [page]);

  if (delivery === "compiled-fallback") return <Compiled />;
  if (delivery === "loading") return <main aria-busy="true" className="min-h-[60vh] px-6 py-24">Loading published page…</main>;
  if (delivery === "api-error" || delivery === "contract-error") {
    return (
      <ServiceError
        onRetry={() => { void query.refetch(); }}
        message="The published page could not be loaded. Please try again."
      />
    );
  }
  if (delivery !== "cms") return <PageUnavailable />;
  if (!page) return <PageUnavailable missingEdition />;

  return (
    <LandingSlotErrorBoundary key={`${page.id}:${page.updatedAt}`}>
      <GovernedLandingContext.Provider value={page}>
        <Compiled />
      </GovernedLandingContext.Provider>
    </LandingSlotErrorBoundary>
  );
}

export function GovernedLandingRoute({ pageOverride, ...props }: GovernedLandingRouteProps) {
  if (pageOverride) return <GovernedLandingPreviewRoute compiled={props.compiled} pageOverride={pageOverride} />;
  return <GovernedLandingPublishedRoute {...props} />;
}