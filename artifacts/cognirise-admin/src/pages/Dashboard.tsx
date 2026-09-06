import { useState } from "react";
import { useGetDashboardKpis, DashboardPeriod } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, Users, FileText, Inbox, Activity, Clock, MousePointerClick, Zap, AlertTriangle, Monitor, Share2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

function KpiCard({ title, value, label, icon: Icon, description }: { title: string, value: string | number, label?: string, icon: any, description?: string }) {
  return (
    <Card className="overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between space-y-0 pb-2">
          <div className="flex flex-col">
            <p className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">{title}</p>
            <div className="text-3xl font-bold tracking-tight text-foreground">{value}</div>
            {label && <p className="text-xs text-muted-foreground mt-1">{label}</p>}
          </div>
          <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {description && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-[10px] text-muted-foreground font-mono truncate">{description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const { data: kpis, isLoading, isError } = useGetDashboardKpis({ period });

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-destructive">
        <AlertTriangle className="w-8 h-8 mb-4 opacity-50" />
        <p className="font-mono text-sm">Failed to load dashboard metrics.</p>
      </div>
    );
  }

  if (!kpis) return null;

  const { analytics } = kpis;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Operational Overview</h1>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono mt-1">
            <Activity className="w-3 h-3 text-emerald-500" />
            <span>Last updated {format(new Date(kpis.generatedAt), "HH:mm:ss")} {kpis.timezone}</span>
            <span className="opacity-50">|</span>
            <span className="opacity-80" title={kpis.definition}>{kpis.period} rolling window</span>
          </div>
        </div>
        <div>
          <Select value={period} onValueChange={(v) => setPeriod(v as DashboardPeriod)}>
            <SelectTrigger className="w-[180px] bg-card border-border font-mono text-xs">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-8">
        {/* Editorial & Publishing Health */}
        <section>
          <h2 className="text-sm font-semibold tracking-tight uppercase mb-4 text-foreground/80 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Editorial Pipeline
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Awaiting Review" 
              value={kpis.contentAwaitingReview} 
              icon={Clock} 
              description="Submitted drafts pending approval"
            />
            <KpiCard 
              title="Overdue Review" 
              value={kpis.overdueContentReview} 
              icon={AlertCircle} 
              description="SLA breached (>48hrs)"
            />
            <KpiCard 
              title="Publish Activity" 
              value={kpis.publishActivity} 
              icon={TrendingUp} 
              description={`Successful pushes in ${period}`}
            />
            <KpiCard 
              title="Publish Failures" 
              value={kpis.publishFailures} 
              icon={AlertTriangle} 
              description={`Errors requiring attention`}
            />
          </div>
        </section>

        {/* Traffic & Conversion */}
        <section>
          <h2 className="text-sm font-semibold tracking-tight uppercase mb-4 text-foreground/80 flex items-center gap-2">
            <GlobeIcon className="w-4 h-4" />
            Traffic & Conversion
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard 
              title="Sessions" 
              value={analytics.sessions.toLocaleString()} 
              icon={Users} 
            />
            <KpiCard 
              title="Page Views" 
              value={analytics.pageViews.toLocaleString()} 
              icon={Monitor} 
            />
            <KpiCard 
              title="CTA Clicks" 
              value={analytics.ctaClicks.toLocaleString()} 
              icon={MousePointerClick} 
            />
            <KpiCard 
              title="Conversion Rate" 
              value={`${(analytics.ctaConversionRate * 100).toFixed(1)}%`} 
              icon={TrendingUp} 
              description="Session to CTA engagement"
            />
          </div>
        </section>

        {/* Analytics Deep Dives */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="col-span-1 lg:col-span-2 border-border/60 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Top Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.topPages.length > 0 ? analytics.topPages.map((page) => (
                  <div key={page.path} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate max-w-[70%]">{page.path}</span>
                    <span className="font-semibold">{page.count.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground font-mono text-center py-4">No page data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 border-border/60 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <GlobeIcon className="w-3.5 h-3.5" /> Market Mix
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.marketMix.length > 0 ? analytics.marketMix.map((mix) => (
                  <div key={mix.market} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs uppercase">{mix.market}</span>
                    <span className="font-semibold">{mix.count.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground font-mono text-center py-4">No market data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 border-border/60 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Share2 className="w-3.5 h-3.5" /> Traffic Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.sources.length > 0 ? analytics.sources.map((src) => (
                  <div key={src.source} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs truncate max-w-[60%]">{src.source}</span>
                    <span className="font-semibold">{src.count.toLocaleString()}</span>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground font-mono text-center py-4">No source data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1 lg:col-span-2 border-border/60 bg-card/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" /> Core Web Vitals (P75)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg border border-border/50">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground mb-2">LCP</span>
                  <span className="text-xl font-bold">{analytics.coreWebVitals.lcp !== null ? `${analytics.coreWebVitals.lcp}ms` : '-'}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">&lt; 2500ms</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg border border-border/50">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground mb-2">INP</span>
                  <span className="text-xl font-bold">{analytics.coreWebVitals.inp !== null ? `${analytics.coreWebVitals.inp}ms` : '-'}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">&lt; 200ms</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 bg-muted/20 rounded-lg border border-border/50">
                  <span className="text-[10px] uppercase font-mono text-muted-foreground mb-2">CLS</span>
                  <span className="text-xl font-bold">{analytics.coreWebVitals.cls !== null ? analytics.coreWebVitals.cls.toFixed(3) : '-'}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">&lt; 0.1</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function GlobeIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}
