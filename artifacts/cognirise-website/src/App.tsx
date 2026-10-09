import { Switch, Route, Redirect, useLocation, useSearch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";
import { AnalyticsBridge } from "@/lib/analytics";
import { PublicSitemap } from "@/components/PublicSitemap";
import { launchHrefAllowed } from "@workspace/api-zod";
import { normalisePath, redirectFor } from "@/site/routes";

// Public pages (code-owned copy from the website redesign)
import HomePage from "@/site/pages/HomePage";
import WhatWeDoPage from "@/site/pages/WhatWeDoPage";
import HowWeWorkPage from "@/site/pages/HowWeWorkPage";
import IndustriesPage from "@/site/pages/IndustriesPage";
import { IndustryPage } from "@/site/pages/IndustryPage";
import PublicSectorPage from "@/site/pages/PublicSectorPage";
import CogniOSPage from "@/site/pages/CogniOSPage";
import CaseStudiesPage from "@/site/pages/CaseStudiesPage";
import MethodsPage from "@/site/pages/MethodsPage";
import AboutPage from "@/site/pages/AboutPage";
import ValueScanPage from "@/site/pages/ValueScanPage";
import PrivacyPage from "@/site/pages/PrivacyPage";
import PublicSectorPovPage from "@/site/pages/PublicSectorPovPage";
import { INDUSTRY_PAGES } from "@/site/content/industries";

// Pages kept from the current site
import CoreValues from "@/pages/CoreValues";
import CmsPreview from "@/pages/CmsPreview";
import AgentAuthorityModel from "@/pages/AgentAuthorityModel";
import GuardrailsFramework from "@/pages/GuardrailsFramework";
import IDAOMethodology from "@/pages/IDAOMethodology";
import AIValueToScale from "@/pages/AIValueToScale";
import HumanAgentOperatingModel from "@/pages/HumanAgentOperatingModel";
import AgenticOperationsReadiness from "@/pages/AgenticOperationsReadiness";
import AIUseCasePrioritization from "@/pages/AIUseCasePrioritization";

/** A permanent move that keeps the query string, so market views survive it. */
function MovedTo({ to }: { to: string }) {
  const search = useSearch();
  const [path, anchor] = to.split("#");
  return <Redirect replace to={`${path}${search ? `?${search}` : ""}${anchor ? `#${anchor}` : ""}`} />;
}

export function Router() {
  const [location] = useLocation();
  const path = normalisePath(location);
  const isPreview = path.startsWith("/preview/");

  if (isPreview) return <CmsPreview />;

  const moved = redirectFor(path);
  if (moved) return <MovedTo to={moved} />;

  if (!launchHrefAllowed(path)) return <Shell><NotFound /></Shell>;

  const page = (
    <>
      <PublicSitemap />
      <Shell>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/what-we-do" component={WhatWeDoPage} />
          <Route path="/how-we-work" component={HowWeWorkPage} />

          <Route path="/industries" component={IndustriesPage} />
          {INDUSTRY_PAGES.map((industry) => (
            <Route key={industry.slug} path={industry.path}>{() => <IndustryPage page={industry} />}</Route>
          ))}
          <Route path="/industries/public-sector" component={PublicSectorPage} />
          <Route path="/industries/public-sector/point-of-view" component={PublicSectorPovPage} />

          <Route path="/platforms/cognios" component={CogniOSPage} />
          <Route path="/case-studies" component={CaseStudiesPage} />

          <Route path="/methodologies" component={MethodsPage} />
          <Route path="/methodologies/ai-use-case-prioritization" component={AIUseCasePrioritization} />
          <Route path="/methodologies/ai-value-to-scale" component={AIValueToScale} />
          <Route path="/methodologies/agentic-operations-readiness" component={AgenticOperationsReadiness} />
          <Route path="/methodologies/idao" component={IDAOMethodology} />
          <Route path="/methodologies/agent-authority-model" component={AgentAuthorityModel} />
          <Route path="/methodologies/guardrails-framework" component={GuardrailsFramework} />
          <Route path="/methodologies/human-agent-operating-model" component={HumanAgentOperatingModel} />

          <Route path="/about" component={AboutPage} />
          <Route path="/about/core-values" component={CoreValues} />
          <Route path="/value-scan" component={ValueScanPage} />
          <Route path="/privacy" component={PrivacyPage} />

          <Route component={NotFound} />
        </Switch>
      </Shell>
    </>
  );

  return page;
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
