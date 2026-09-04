import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Shell } from "@/components/layout/Shell";

// Pages
import Home from "@/pages/Home";
import ServicesOverview from "@/pages/ServicesOverview";
import AgenticTransformation from "@/pages/AgenticTransformation";
import CogniOSPlatform from "@/pages/CogniOSPlatform";
import IndustriesOverview from "@/pages/IndustriesOverview";
import PublicSector from "@/pages/PublicSector";
import WorkProof from "@/pages/WorkProof";
import InsightsEditorial from "@/pages/InsightsEditorial";
import InsightArticle from "@/pages/InsightArticle";
import AboutPeople from "@/pages/AboutPeople";
import ValueScan from "@/pages/ValueScan";

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        
        {/* Services & Platforms */}
        <Route path="/what-we-do" component={ServicesOverview} />
        <Route path="/what-we-do/agentic-enterprise-transformation" component={AgenticTransformation} />
        <Route path="/platforms/cognios" component={CogniOSPlatform} />
        
        {/* Industries */}
        <Route path="/industries" component={IndustriesOverview} />
        <Route path="/industries/public-sector" component={PublicSector} />
        
        {/* Work & Insights */}
        <Route path="/work" component={WorkProof} />
        <Route path="/insights" component={InsightsEditorial} />
        <Route path="/insights/:slug" component={InsightArticle} />
        
        {/* About & Action */}
        <Route path="/about" component={AboutPeople} />
        <Route path="/value-scan" component={ValueScan} />
        
        <Route component={NotFound} />
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
