import { Switch, Route, Redirect, useLocation, useSearch } from "wouter";
import { useGetPublicNavigationSettings } from "@workspace/api-client-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { AnalyticsBridge } from "@/lib/analytics";
import { PublicSitemap } from "@/components/PublicSitemap";
import { GovernedLandingRoute } from "@/components/GovernedLandingRoute";
import { useMarketStore } from "@/store/market";

function RedirectWithSearch({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}#architecture` : `${to}#architecture`} />;
}

function CanonicalRedirect({ to }: { to: string }) {
  const search = useSearch();
  return <Redirect to={search ? `${to}?${search}` : to} />;
}

function AnchoredRedirect({ to, anchor }: { to: string; anchor: string }) {
  const search = useSearch();
  return <Redirect to={`${to}${search ? `?${search}` : ""}#${anchor}`} />;
}
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
import CogniTalk from "@/pages/CogniTalk";
import CogniWare from "@/pages/CogniWare";
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

import WorkProof from "@/pages/WorkProof";
import CaseStudyDetail from "@/pages/CaseStudyDetail";
import InsightsEditorial from "@/pages/InsightsEditorial";
import InsightArticle from "@/pages/InsightArticle";
import AboutPeople from "@/pages/AboutPeople";
import Partners from "@/pages/Partners";
import FAQ from "@/pages/FAQ";
import Contact from "@/pages/Contact";
import ValueScan from "@/pages/ValueScan";
import CmsPreview from "@/pages/CmsPreview";

import AgentAuthorityModel from "@/pages/AgentAuthorityModel";
import IDAOMethodology from "@/pages/IDAOMethodology";
import MethodologiesPortfolio from "@/pages/MethodologiesPortfolio";
import AIValueToScale from "@/pages/AIValueToScale";
import HumanAgentOperatingModel from "@/pages/HumanAgentOperatingModel";

export function Router() {
  const [location] = useLocation();
  const { market, locale } = useMarketStore();
  const path = location.split(/[?#]/)[0];
  const isPreview = path.startsWith("/preview/");
  const policy = useGetPublicNavigationSettings({ market, locale }, {
    query: { queryKey: ["public-navigation", market, locale], enabled: !isPreview },
  });
  // A preview is a capability-scoped composition. CmsPreview fetches its
  // immutable navigation snapshot and supplies it to Shell; do not consult
  // the live public policy or page availability for this route.
  if (isPreview) return <CmsPreview />;
  const unavailable = policy.data?.isConfigured === true
    && policy.data.pages.some((page) => page.path === path && !page.enabled);
  if (policy.isPending) return <Shell><div aria-busy="true" className="min-h-[60vh]" /></Shell>;
  if (policy.isError) return <Shell><NotFound /></Shell>;
  return (
    <Shell>
      {unavailable ? <NotFound /> :
      <Switch>
        <Route path="/" component={Home} />
        
        {/* Methodologies */}
        <Route path="/methodologies" component={MethodologiesPortfolio} />
        <Route path="/methodologies/ai-value-to-scale" component={AIValueToScale} />
        <Route path="/methodologies/idao" component={IDAOMethodology} />
        <Route path="/methodologies/agent-authority-model" component={AgentAuthorityModel} />
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
        <Route path="/platforms"><GovernedLandingRoute pagePath="/platforms" compiled={PlatformsOverview} /></Route>
        <Route path="/platforms/cognios" component={CogniOSPlatform} />
        <Route path="/platforms/cognidocs" component={CogniDocs} />
        <Route path="/platforms/cogniagents" component={CogniAgents} />
        <Route path="/platforms/cognitalk" component={CogniTalk} />
        <Route path="/platforms/cogniware" component={CogniWare} />
        <Route path="/platforms/lupitor"><AlliancePlatformDetail slug="lupitor" /></Route>
        <Route path="/platforms/datatoolpack" component={DatatoolpackAutoData} />
        <Route path="/platforms/bunjee-ai"><AlliancePlatformDetail slug="bunjee-ai" /></Route>
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
        <Route path="/sectors"><Redirect to="/industries" /></Route>

        {/* Legacy aliases */}
        <Route path="/who"><Redirect to="/about" /></Route>
        <Route path="/platforms/cognios/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/architecture"><RedirectWithSearch to="/platforms/cognios" /></Route>
        <Route path="/cognidocs"><Redirect to="/platforms/cognidocs" /></Route>
        <Route path="/cogniagents"><Redirect to="/platforms/cogniagents" /></Route>
        <Route path="/cognitalk"><Redirect to="/platforms/cognitalk" /></Route>
        <Route path="/cogniware"><Redirect to="/platforms/cogniware" /></Route>
        
        <Route path="/pov-banking"><CanonicalRedirect to="/industries/financial-services" /></Route>
        <Route path="/pov-government"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-telecoms"><Redirect to="/industries/telecoms" /></Route>
        <Route path="/pov-travel"><CanonicalRedirect to="/industries/travel-hospitality" /></Route>
        <Route path="/pov-energy"><CanonicalRedirect to="/industries/energy-resources" /></Route>
        <Route path="/industries/manufacturing"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-manufacturing"><CanonicalRedirect to="/industries/public-sector" /></Route>
        <Route path="/pov-public-sector"><CanonicalRedirect to="/industries/public-sector" /></Route>


        {/* Work & Insights */}
        <Route path="/work"><GovernedLandingRoute pagePath="/work" compiled={WorkProof} /></Route>
        <Route path="/work/:slug" component={CaseStudyDetail} />
        <Route path="/insights"><GovernedLandingRoute pagePath="/insights" compiled={InsightsEditorial} /></Route>
        <Route path="/insights/:slug" component={InsightArticle} />
        
        {/* Company */}
        <Route path="/about"><GovernedLandingRoute pagePath="/about" compiled={AboutPeople} /></Route>
        <Route path="/partners"><GovernedLandingRoute pagePath="/partners" compiled={Partners} /></Route>
        <Route path="/faq" component={FAQ} />
        <Route path="/contact" component={Contact} />
        <Route path="/value-scan" component={ValueScan} />
        <Route path="/preview/:token" component={CmsPreview} />
        
        <Route component={NotFound} />
      </Switch>}
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsBridge />
      <PublicSitemap />
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
