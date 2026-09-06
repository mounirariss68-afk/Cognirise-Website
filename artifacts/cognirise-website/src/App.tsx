import { Switch, Route, Redirect, useLocation, useSearch, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { useCmsPublishedPage } from "@/lib/cms";
import { useMarketStore } from "@/store/market";
import { safePublicHref, useCmsRuntime } from "@/lib/cms-runtime";
import { lazy, Suspense } from "react";

const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const AdminApp = lazy(() => import("@/pages/admin/AdminApp"));

function RedirectWithSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}#architecture` : `${to}#architecture`} />;
}

import InsightArticle from "@/pages/InsightArticle";
import InsightsEditorial from "@/pages/InsightsEditorial";
import CmsPreview from "@/pages/CmsPreview";

const approvedRoutes = new Set([
  "/", "/what-we-do", "/what-we-do/agentic-enterprise-transformation",
  "/what-we-do/data-ai-foundations", "/what-we-do/engineering-with-ai",
  "/what-we-do/sovereign-regulated-ai", "/what-we-do/digital-ai-workforce",
  "/platforms", "/platforms/cognios", "/platforms/cognidocs",
  "/platforms/cogniagents", "/platforms/cognitalk", "/platforms/cogniware",
  "/industries", "/industries/banking", "/industries/public-sector",
  "/industries/telecoms", "/industries/travel", "/industries/energy",
  "/industries/manufacturing", "/work", "/insights", "/about",
  "/partners", "/faq", "/contact", "/value-scan"
]);

function cmsRouteMatches(pathname: string, page: { slug: string; routeKind: string }): boolean {
  const localized = page.slug;
  if (pathname === "/") return page.routeKind === "home" && localized === "home";
  if (pathname === `/what-we-do/${localized}` || (pathname === "/what-we-do" && page.routeKind === "service")) return page.routeKind === "service";
  if (pathname === `/platforms/${localized}` || (pathname === "/platforms" && page.routeKind === "platform")) return page.routeKind === "platform";
  if (pathname === `/industries/${localized}` || (pathname === "/industries" && page.routeKind === "industry")) return page.routeKind === "industry";
  if (pathname === `/insights/${localized}`) return page.routeKind === "landing";
  return pathname === `/${localized}` && ["caseStudy", "about", "contact", "landing", "legal"].includes(page.routeKind);
}

function CmsBackedPublicPage() {
  const [location] = useLocation();
  const { market } = useMarketStore();
  const pathname = location.split("?")[0].replace(/\/+$/, "") || "/";
  const insight = /^\/insights\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
  const approved = Boolean(approvedRoutes.has(pathname) || insight);
  const safeLocalizedPath = /^\/(?:what-we-do|platforms|industries|insights)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
  // Publications are served by their dedicated PostgreSQL endpoints, not page documents.
  const cmsEnabled = (approved || safeLocalizedPath) && pathname !== "/insights" && !insight;
  const cms = useCmsPublishedPage(market, pathname, cmsEnabled);

  if (!cmsEnabled) return <NotFound />;
  if (insight) return <InsightArticle />;
  if (pathname === "/insights") return <InsightsEditorial />;
  if (cms.isLoading) return <section className="px-6 py-16" role="status" data-testid="status-cms-page-loading">Loading page…</section>;
  if (cmsEnabled && cms.data?.page && cmsRouteMatches(pathname, cms.data.page)) return <CmsPageRenderer page={cms.data.page} />;
  if (cms.isError) return <section className="px-6 py-16" role="alert" data-testid="status-cms-page-unavailable">This published page is currently unavailable.</section>;
  return <NotFound />;
}

function GovernedRedirects() {
  const [location] = useLocation();
  const { market } = useMarketStore();
  const runtime = useCmsRuntime(market);
  const pathname = location.split("?")[0];

  if (pathname.startsWith("/admin")) {
    return <NotFound />;
  }

  const redirect = runtime.data?.redirects.find((item) => item.sourcePath === pathname);
  const destination = safePublicHref(redirect?.destinationPath);
  return destination ? <Redirect to={destination} /> : <CmsBackedPublicPage />;
}

function PublicRouter() {
  return (
    <Shell>
      <Switch>
        <Route path="/preview/:market/:slug" component={CmsPreview} />
        <Route path="/services"><Redirect to="/what-we-do" /></Route>
        <Route path="/sectors"><Redirect to="/industries" /></Route>
        <Route path="/who"><Redirect to="/about" /></Route>
        <Route path="/platforms/cognios/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/cognidocs"><Redirect to="/platforms/cognidocs" /></Route>
        <Route path="/cogniagents"><Redirect to="/platforms/cogniagents" /></Route>
        <Route path="/cognitalk"><Redirect to="/platforms/cognitalk" /></Route>
        <Route path="/cogniware"><Redirect to="/platforms/cogniware" /></Route>
        <Route path="/pov-banking"><Redirect to="/industries/banking" /></Route>
        <Route path="/pov-government"><Redirect to="/industries/public-sector" /></Route>
        <Route path="/pov-telecoms"><Redirect to="/industries/telecoms" /></Route>
        <Route path="/pov-travel"><Redirect to="/industries/travel" /></Route>
        <Route path="/pov-energy"><Redirect to="/industries/energy" /></Route>
        <Route path="/pov-manufacturing"><Redirect to="/industries/manufacturing" /></Route>
        <Route path="/advisors"><Redirect to="/about#board-of-advisors" /></Route>

        {/* We exclude /admin inside GovernedRedirects so it falls through to NotFound if matched by GovernedRedirects (which it won't since we route it earlier) */}
        <Route component={GovernedRedirects} />
      </Switch>
    </Shell>
  );
}

function RootRouter() {
  const [location] = useLocation();
  const isAdmin = location.startsWith("/admin");

  if (isAdmin) {
    return (
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--brand-deep))] text-white">
            Loading management console…
          </div>
        }
      >
        <AdminApp />
      </Suspense>
    );
  }

  return <PublicRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={basePath}>
        <RootRouter />
      </WouterRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
