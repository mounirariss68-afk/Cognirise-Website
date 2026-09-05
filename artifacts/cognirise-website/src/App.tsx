import { Switch, Route, Redirect, useLocation, useSearch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";
import { useCmsPublishedPage } from "@/lib/cms";
import { useMarketStore } from "@/store/market";
import { safePublicHref, useCmsRuntime } from "@/lib/cms-runtime";

function RedirectWithSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}#architecture` : `${to}#architecture`} />;
}

// Pages
import Home from "@/pages/Home";
import ServicesOverview from "@/pages/ServicesOverview";
import AgenticTransformation from "@/pages/AgenticTransformation";
import DataAIFoundations from "@/pages/DataAIFoundations";
import EngineeringWithAI from "@/pages/EngineeringWithAI";
import SovereignRegulatedAI from "@/pages/SovereignRegulatedAI";
import DigitalAIWorkforce from "@/pages/DigitalAIWorkforce";

import PlatformsOverview from "@/pages/PlatformsOverview";
import CogniOSPlatform from "@/pages/CogniOSPlatform";
import CogniDocs from "@/pages/CogniDocs";
import CogniAgents from "@/pages/CogniAgents";
import CogniTalk from "@/pages/CogniTalk";
import CogniWare from "@/pages/CogniWare";

import IndustriesOverview from "@/pages/IndustriesOverview";
import IndustryBanking from "@/pages/IndustryBanking";
import PublicSector from "@/pages/PublicSector";
import IndustryTelecoms from "@/pages/IndustryTelecoms";
import IndustryTravel from "@/pages/IndustryTravel";
import IndustryEnergy from "@/pages/IndustryEnergy";
import IndustryManufacturing from "@/pages/IndustryManufacturing";

import WorkProof from "@/pages/WorkProof";
import InsightsEditorial from "@/pages/InsightsEditorial";
import InsightArticle from "@/pages/InsightArticle";
import AboutPeople from "@/pages/AboutPeople";
import Partners from "@/pages/Partners";
import Advisors from "@/pages/Advisors";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import ValueScan from "@/pages/ValueScan";
import CmsPreview from "@/pages/CmsPreview";

const hardCodedRoutes: Record<string, React.ComponentType> = {
  "/": Home,
  "/what-we-do": ServicesOverview,
  "/what-we-do/agentic-enterprise-transformation": AgenticTransformation,
  "/what-we-do/data-ai-foundations": DataAIFoundations,
  "/what-we-do/engineering-with-ai": EngineeringWithAI,
  "/what-we-do/sovereign-regulated-ai": SovereignRegulatedAI,
  "/what-we-do/digital-ai-workforce": DigitalAIWorkforce,
  "/platforms": PlatformsOverview,
  "/platforms/cognios": CogniOSPlatform,
  "/platforms/cognidocs": CogniDocs,
  "/platforms/cogniagents": CogniAgents,
  "/platforms/cognitalk": CogniTalk,
  "/platforms/cogniware": CogniWare,
  "/industries": IndustriesOverview,
  "/industries/banking": IndustryBanking,
  "/industries/public-sector": PublicSector,
  "/industries/telecoms": IndustryTelecoms,
  "/industries/travel": IndustryTravel,
  "/industries/energy": IndustryEnergy,
  "/industries/manufacturing": IndustryManufacturing,
  "/work": WorkProof,
  "/insights": InsightsEditorial,
  "/about": AboutPeople,
  "/partners": Partners,
  "/advisors": Advisors,
  "/faq": FAQ,
  "/contact": Contact,
  "/value-scan": ValueScan,
};

function cmsRouteMatches(pathname: string, page: { slug: string; routeKind: string }): boolean {
  const localized = page.slug;
  if (pathname === "/") return page.routeKind === "home" && localized === "home";
  if (pathname === `/what-we-do/${localized}` || (pathname === "/what-we-do" && page.routeKind === "service")) return page.routeKind === "service";
  if (pathname === `/platforms/${localized}` || (pathname === "/platforms" && page.routeKind === "platform")) return page.routeKind === "platform";
  if (pathname === `/industries/${localized}` || (pathname === "/industries" && page.routeKind === "industry")) return page.routeKind === "industry";
  if (pathname === `/insights/${localized}`) return page.routeKind === "landing";
  return pathname === `/${localized}` && ["caseStudy", "about", "contact", "landing", "legal"].includes(page.routeKind);
}

/**
 * The route registry remains code-owned. A CMS document can replace the content
 * inside an approved public route, but can never create an executable route.
 * Missing/unavailable/malformed CMS content uses the reviewed route component.
 */
function CmsBackedPublicPage() {
  const [location] = useLocation();
  const { market } = useMarketStore();
  const pathname = location.split("?")[0].replace(/\/+$/, "") || "/";
  const insight = /^\/insights\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
  const Fallback = hardCodedRoutes[pathname];
  const approved = Boolean(Fallback || insight);
  const safeLocalizedPath = /^\/(?:what-we-do|platforms|industries|insights)\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pathname);
  const cmsEnabled = approved || safeLocalizedPath;
  const cms = useCmsPublishedPage(market, pathname, cmsEnabled);

  if (cmsEnabled && cms.data?.page && cmsRouteMatches(pathname, cms.data.page)) return <CmsPageRenderer page={cms.data.page} />;
  if (!approved && cms.isLoading) return <section className="px-6 py-16" role="status">Loading page…</section>;
  if (!approved) return <NotFound />;
  if (insight) return <InsightArticle />;
  return Fallback ? <Fallback /> : <NotFound />;
}

function GovernedRedirects() {
  const [location] = useLocation();
  const { market } = useMarketStore();
  const runtime = useCmsRuntime(market);
  const pathname = location.split("?")[0];
  const redirect = runtime.data?.redirects.find((item) => item.sourcePath === pathname);
  const destination = safePublicHref(redirect?.destinationPath);
  return destination ? <Redirect to={destination} /> : <CmsBackedPublicPage />;
}

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/preview/:market/:slug" component={CmsPreview} />
        {/* Legacy aliases */}
        <Route path="/services"><Redirect to="/what-we-do" /></Route>

        {/* Legacy aliases */}
        <Route path="/sectors"><Redirect to="/industries" /></Route>

        {/* Legacy aliases */}
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
        <Route component={GovernedRedirects} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;