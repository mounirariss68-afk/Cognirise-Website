import { Switch, Route, Redirect, useLocation, useSearch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { AnalyticsBridge } from "@/lib/analytics";
import { PublicSitemap } from "@/components/PublicSitemap";
import { GovernedLandingRoute } from "@/components/GovernedLandingRoute";
import { useMarketStore } from "@/store/market";
import { ServiceError } from "@/components/error-boundary";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import {
  ReleaseProvider,
  registryRouteForPath,
  releaseHasPath,
  releaseRedirectForPath,
  useActiveRelease,
} from "@/lib/releases";

function RedirectWithSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect replace to={search ? `${to}?${search}#architecture` : `${to}#architecture`} />;
}

function CanonicalRedirect({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect replace to={search ? `${to}?${search}` : to} />;
}

function AnchoredRedirect({ to, anchor }: { to: string; anchor: string }) {
  const search = useSearch();
  return <Redirect replace to={`${to}${search ? `?${search}` : ""}#${anchor}`} />;
}

const legacyIndustryPaths = new Set([
  "/industries/financial-services",
  "/industries/travel-hospitality",
  "/industries/energy-resources",
  "/industries/telecoms",
  "/industries/public-sector",
  "/industries/education",
  "/industries/banking",
  "/industries/government",
  "/industries/travel",
  "/industries/energy",
  "/industries/manufacturing",
  "/pov-banking",
  "/pov-government",
  "/pov-telecoms",
  "/pov-travel",
  "/pov-energy",
  "/pov-manufacturing",
  "/pov-public-sector",
  "/sectors",
]);
// Pages
import Home from "@/pages/Home";
import AgenticTransformation from "@/pages/AgenticTransformation";
import DataAIFoundations from "@/pages/DataAIFoundations";
import EngineeringWithAI from "@/pages/EngineeringWithAI";
import SovereignRegulatedAI from "@/pages/SovereignRegulatedAI";
import DigitalAIWorkforce from "@/pages/DigitalAIWorkforce";

import PlatformsOverview from "@/pages/PlatformsOverview";
import CogniOSPlatform from "@/pages/CogniOSPlatform";
import CogniDocs from "@/pages/CogniDocs";
import CogniAgents from "@/pages/CogniAgents";
import CogniBase from "@/pages/CogniBase";
import PlatformDetail from "@/pages/PlatformDetail";

import AlliancePlatformDetail from "@/pages/AlliancePlatformDetail";
import DatatoolpackAutoData from "@/pages/DatatoolpackAutoData";

import IndustriesOverview from "@/pages/IndustriesOverview";
import IndustryBanking from "@/pages/IndustryBanking";
import IndustryTelecoms from "@/pages/IndustryTelecoms";
import IndustryTravel from "@/pages/IndustryTravel";
import IndustryEnergy from "@/pages/IndustryEnergy";
import IndustryPublicSector from "@/pages/IndustryPublicSector";
import IndustryEducation from "@/pages/IndustryEducation";

import CaseStudyDetail from "@/pages/CaseStudyDetail";
import InsightsEditorial from "@/pages/InsightsEditorial";
import InsightArticle from "@/pages/InsightArticle";
import AboutPeople from "@/pages/AboutPeople";
import Partners from "@/pages/Partners";
import Contact from "@/pages/Contact";
import ValueScan from "@/pages/ValueScan";
import CmsPreview from "@/pages/CmsPreview";

import AgentAuthorityModel from "@/pages/AgentAuthorityModel";
import GuardrailsFramework from "@/pages/GuardrailsFramework";
import IDAOMethodology from "@/pages/IDAOMethodology";
import MethodologiesPortfolio from "@/pages/MethodologiesPortfolio";
import AIValueToScale from "@/pages/AIValueToScale";
import HumanAgentOperatingModel from "@/pages/HumanAgentOperatingModel";
import AgenticOperationsReadiness from "@/pages/AgenticOperationsReadiness";
import AIUseCasePrioritization from "@/pages/AIUseCasePrioritization";
import { LAUNCH_POLICY, launchHrefAllowed } from "@workspace/api-zod";
import { useLaunchImageRegion } from "@/lib/launch-region";

export function Router() {
  const [location] = useLocation();
  const { market, locale } = useMarketStore();
  const rawPath = location.split(/[?#]/)[0];
  const path = rawPath === "/" ? rawPath : rawPath.replace(/\/+$/, "");
  const embedsBackInHero = path === "/"
    || path === "/about"
    || path === "/platforms"
    || path === "/methodologies"
    || path === "/methodologies/ai-use-case-prioritization"
    || path === "/methodologies/ai-value-to-scale"
    || path === "/methodologies/agentic-operations-readiness"
    || path === "/methodologies/idao"
    || path === "/methodologies/agent-authority-model"
    || path === "/methodologies/guardrails-framework"
    || path === "/methodologies/human-agent-operating-model"
    || path === "/industries/financial-services"
    || path === "/industries/telecoms"
    || path === "/industries/travel-hospitality"
    || path === "/industries/energy-resources"
    || path === "/industries/public-sector"
    || path === "/industries/education";
  const isPreview = path.startsWith("/preview/");
  const imageRegion = useLaunchImageRegion();
  const release = useActiveRelease(LAUNCH_POLICY.enabled ? "uae" : market, LAUNCH_POLICY.enabled ? "en" : locale, !isPreview);
  // A preview is a capability-scoped composition. CmsPreview fetches its
  // immutable navigation snapshot and supplies it to Shell; do not consult
  // the live public policy or page availability for this route.
  if (isPreview) return <CmsPreview />;
  if (LAUNCH_POLICY.enabled && !imageRegion) return <main aria-busy="true" className="min-h-screen bg-[#fdfcfb] px-6 py-24 text-[#102957]">Loading website…</main>;
  if (!launchHrefAllowed(path)) return <Shell><NotFound /></Shell>;
  if (release.isPending) return <Shell><NavigationBackControl /><div aria-busy="true" className="min-h-[60vh]" /></Shell>;
  if (release.isError && (release.error as { status?: number } | undefined)?.status !== 404) {
    return (
      <Shell>
        <NavigationBackControl />
        <ServiceError onRetry={() => { void release.refetch(); }} message="The published release could not be loaded. Please try again." />
      </Shell>
    );
  }
  if (release.isError || !release.data) return <Shell><NavigationBackControl /><NotFound /></Shell>;
  const governedRedirect = releaseRedirectForPath(release.data.manifest, path);
  if (governedRedirect) {
    return governedRedirect.anchor
      ? <AnchoredRedirect to={governedRedirect.path} anchor={governedRedirect.anchor} />
      : <CanonicalRedirect to={governedRedirect.path} />;
  }
  if (
    legacyIndustryPaths.has(path)
    && typeof window !== "undefined"
    && window.location.hash === "#selected-work"
    && releaseHasPath(release.data.manifest, "/industries")
  ) return <AnchoredRedirect to="/industries" anchor="selected-work" />;
  const released = releaseHasPath(release.data.manifest, path);
  const methodologyUsesReleaseAwareFallback = path === "/methodologies/ai-use-case-prioritization"
    || path === "/methodologies/ai-value-to-scale"
    || path === "/methodologies/agentic-operations-readiness"
    || path === "/methodologies/idao"
    || path === "/methodologies/human-agent-operating-model";
  // The owner explicitly approved the existing UAE website pages for public
  // viewing. Restore their compiled routes while the separate CMS release
  // migration is incomplete; never use this exception for other editions or
  // for unknown URLs. Released pages still use their immutable CMS snapshot.
  const ownerApprovedLegacyRoute = (LAUNCH_POLICY.enabled || (market === "uae" && locale === "en"))
    && Boolean(registryRouteForPath(path));
  const unavailable = !released && !ownerApprovedLegacyRoute;
  const routedPage = (
    <>
      <PublicSitemap />
      <Shell>
        {((!embedsBackInHero && !(path === "/platforms/cognios" && !released)) || unavailable) && <NavigationBackControl />}
        {unavailable ? <NotFound /> :
        <Switch>
        <Route path="/" component={Home} />
        
        {/* Methodologies */}
        <Route path="/methodologies" component={MethodologiesPortfolio} />
        <Route path="/methodologies/ai-use-case-prioritization" component={AIUseCasePrioritization} />
        <Route path="/methodologies/ai-value-to-scale" component={AIValueToScale} />
        <Route path="/methodologies/agentic-operations-readiness" component={AgenticOperationsReadiness} />
        <Route path="/methodologies/idao" component={IDAOMethodology} />
        <Route path="/methodologies/agent-authority-model" component={AgentAuthorityModel} />
        <Route path="/methodologies/guardrails-framework" component={GuardrailsFramework} />
        <Route path="/methodologies/human-agent-operating-model" component={HumanAgentOperatingModel} />

        {/* Services */}
        <Route path="/what-we-do"><AnchoredRedirect to="/" anchor="service-lines" /></Route>
        <Route path="/what-we-do/agentic-enterprise-transformation" component={AgenticTransformation} />
        <Route path="/what-we-do/data-ai-foundations" component={DataAIFoundations} />
        <Route path="/what-we-do/engineering-with-ai" component={EngineeringWithAI} />
        <Route path="/what-we-do/sovereign-regulated-ai" component={SovereignRegulatedAI} />
        <Route path="/what-we-do/digital-ai-workforce" component={DigitalAIWorkforce} />
        
        {/* Legacy aliases */}
        <Route path="/services"><AnchoredRedirect to="/" anchor="service-lines" /></Route>
        
        {/* Platforms */}
        <Route path="/platforms">
          {released
            ? <GovernedLandingRoute pagePath="/platforms" compiled={PlatformsOverview} />
            : <PlatformsOverview />}
        </Route>
        <Route path="/platforms/cognios">{released ? <PlatformDetail /> : <CogniOSPlatform />}</Route>
        <Route path="/platforms/cognidocs">{released ? <PlatformDetail /> : <CogniDocs />}</Route>
        <Route path="/platforms/cogniagents">{released ? <PlatformDetail /> : <CogniAgents />}</Route>
        <Route path="/platforms/cognitalk"><CanonicalRedirect to="/platforms/lupitor" /></Route>
        <Route path="/platforms/cogniware"><CanonicalRedirect to="/platforms/cognibase" /></Route>
        <Route path="/platforms/cognibase">{released ? <PlatformDetail /> : <CogniBase />}</Route>
        <Route path="/platforms/lupitor">{released ? <PlatformDetail /> : <AlliancePlatformDetail slug="lupitor" />}</Route>
        <Route path="/platforms/datatoolpack">{released ? <PlatformDetail /> : <DatatoolpackAutoData />}</Route>
        <Route path="/platforms/bunjee-ai">{released ? <PlatformDetail /> : <AlliancePlatformDetail slug="bunjee-ai" />}</Route>
        <Route path="/platforms/:slug" component={PlatformDetail} />

        {/* Industries */}
        <Route path="/industries" component={IndustriesOverview} />
        <Route path="/industries/financial-services" component={IndustryBanking} />
        <Route path="/industries/travel-hospitality" component={IndustryTravel} />
        <Route path="/industries/energy-resources" component={IndustryEnergy} />
        <Route path="/industries/banking"><CanonicalRedirect to="/industries/financial-services" /></Route>
        <Route path="/industries/government"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/industries/telecoms" component={IndustryTelecoms} />
        <Route path="/industries/travel"><CanonicalRedirect to="/industries/travel-hospitality" /></Route>
        <Route path="/industries/energy"><CanonicalRedirect to="/industries/energy-resources" /></Route>
        <Route path="/industries/public-sector" component={IndustryPublicSector} />
        <Route path="/industries/education" component={IndustryEducation} />
        
        {/* Legacy aliases */}
        <Route path="/sectors"><CanonicalRedirect to="/industries" /></Route>

        {/* Legacy aliases */}
        <Route path="/who"><Redirect replace to="/about" /></Route>
        <Route path="/platforms/cognios/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/cognidocs"><CanonicalRedirect to="/platforms/cognidocs" /></Route>
        <Route path="/cogniagents"><Redirect replace to="/platforms/cogniagents" /></Route>
        <Route path="/cognitalk"><CanonicalRedirect to="/platforms/lupitor" /></Route>
        <Route path="/cogniware"><CanonicalRedirect to="/platforms/cognibase" /></Route>
        
        <Route path="/pov-banking"><CanonicalRedirect to="/industries/financial-services" /></Route>
        <Route path="/pov-government"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-telecoms"><CanonicalRedirect to="/industries/telecoms" /></Route>
        <Route path="/pov-travel"><CanonicalRedirect to="/industries/travel-hospitality" /></Route>
        <Route path="/pov-energy"><CanonicalRedirect to="/industries/energy-resources" /></Route>
        <Route path="/industries/manufacturing"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-manufacturing"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-public-sector"><CanonicalRedirect to="/industries/public-sector" /></Route>


        {/* Work & Insights */}
        <Route path="/work/:slug" component={CaseStudyDetail} />
        <Route path="/insights">
          {released
            ? <GovernedLandingRoute pagePath="/insights" compiled={InsightsEditorial} />
            : <InsightsEditorial />}
        </Route>
        <Route path="/insights/:slug" component={InsightArticle} />
        
        {/* Company */}
        <Route path="/about">
          {released
            ? <GovernedLandingRoute pagePath="/about" compiled={AboutPeople} />
            : <AboutPeople />}
        </Route>
        <Route path="/partners">
          {released
            ? <GovernedLandingRoute pagePath="/partners" compiled={Partners} />
            : <Partners />}
        </Route>
        <Route path="/contact" component={Contact} />
        {/* Explicit retirement keeps old release destinations safely unreachable. */}
        <Route path="/faq" component={NotFound} />
        <Route path="/value-scan" component={ValueScan} />
        <Route path="/preview/:token" component={CmsPreview} />
        
        <Route component={NotFound} />
        </Switch>}
      </Shell>
    </>
  );
  return released || methodologyUsesReleaseAwareFallback
    ? <ReleaseProvider release={release.data}>{routedPage}</ReleaseProvider>
    : routedPage;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsBridge />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
