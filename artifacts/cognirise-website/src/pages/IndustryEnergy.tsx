import { Link, useLocation } from "wouter";
import { ArrowRight, ChevronRight, Activity, AlertTriangle, ShieldCheck, Zap, Factory } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";

const sectors = [
  { name: "Banking & Financial Services", path: "/industries/banking" },
  { name: "Public Sector & Government", path: "/industries/public-sector" },
  { name: "Telecoms", path: "/industries/telecoms" },
  { name: "Travel & Hospitality", path: "/industries/travel" },
  { name: "Energy & Resources", path: "/industries/energy" },
  { name: "Manufacturing & Conglomerates", path: "/industries/manufacturing" }
];

export default function IndustryEnergy() {
  const [location] = useLocation();

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Industries
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-12 lg:gap-16 pb-12">
          {/* Sector Selector */}
          <div className="border-r border-border pr-8 hidden lg:block">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">Select Sector</h3>
            <ul className="flex flex-col gap-4">
              {sectors.map(sector => (
                <li key={sector.path}>
                  <Link 
                    href={sector.path}
                    className={`text-sm font-semibold transition-colors flex items-center justify-between ${location === sector.path ? "text-[hsl(var(--brand-pink))]" : "text-muted-foreground hover:text-[hsl(var(--brand-deep))]"}`}
                  >
                    {sector.name}
                    {location === sector.path && <ChevronRight className="w-4 h-4" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Mobile Sector Selector */}
          <div className="lg:hidden border-b border-border pb-6">
            <select 
              className="w-full bg-[hsl(var(--secondary))] border border-border p-4 outline-none font-semibold text-sm"
              value={location}
              onChange={(e) => window.location.pathname = e.target.value}
            >
              {sectors.map(sector => (
                <option key={sector.path} value={sector.path}>{sector.name}</option>
              ))}
            </select>
          </div>

          <div className="relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold mb-8 max-w-[800px]">
              Physical operations leave no room for <em className="not-italic text-[hsl(var(--brand-pink))]">theatre.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[560px] mb-12 leading-relaxed">
              Connect field reality, planning and assurance so critical work is safer, faster and visible at the point decisions are made.
            </p>
            
            {/* Value Leak Map */}
            <div className="mb-16">
              <h3 className="text-xl font-bold mb-6">Value Leak Map: Where Energy Operations Lose Velocity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[hsl(var(--secondary))] p-6 border-l-2 border-[hsl(var(--brand-coral))]">
                  <Zap className="w-5 h-5 text-[hsl(var(--brand-coral))] mb-4" />
                  <h4 className="font-semibold mb-2">Field Data Isolation</h4>
                  <p className="text-sm text-muted-foreground">Maintenance engineers on-site cannot rapidly access schematics or historical failure logs when assessing a critical asset.</p>
                </div>
                <div className="bg-[hsl(var(--secondary))] p-6 border-l-2 border-[hsl(var(--brand-pink))]">
                  <Activity className="w-5 h-5 text-[hsl(var(--brand-pink))] mb-4" />
                  <h4 className="font-semibold mb-2">Supply Chain Disconnect</h4>
                  <p className="text-sm text-muted-foreground">Predictive maintenance flags are not connected to parts inventory, causing operational downtime while waiting for spares.</p>
                </div>
                <div className="bg-[hsl(var(--secondary))] p-6 border-l-2 border-[hsl(var(--brand-violet))]">
                  <ShieldCheck className="w-5 h-5 text-[hsl(var(--brand-violet))] mb-4" />
                  <h4 className="font-semibold mb-2">HSE Compliance</h4>
                  <p className="text-sm text-muted-foreground">Health, Safety, and Environment incident reporting remains a slow, manual process prone to transcription errors.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 border-t border-border pt-12">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--brand-deep))] text-white px-6 md:px-12 py-24 relative overflow-hidden clip-diagonal-bottom">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
          <div>
            <h2 className="text-4xl lg:text-5xl font-semibold mb-8">The Cognirise Play</h2>
            <p className="text-white/80 text-lg leading-relaxed mb-8">
              We extract and structure engineering knowledge via CogniDocs, making critical operating context securely available to field teams, and deploy predictive orchestration to align maintenance events with supply chain reality.
            </p>
          </div>
          <div className="flex flex-col gap-6 border-l border-white/20 pl-8">
             <div className="flex items-center gap-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] uppercase tracking-widest font-bold">Services</span>
                 <span className="text-white/80">AI Platforms</span>
             </div>
             <div className="flex items-center gap-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] uppercase tracking-widest font-bold">Platforms</span>
                <span className="text-white/80">CogniDocs, CogniWare</span>
             </div>
             <div className="flex items-center gap-4">
                <span className="text-[hsl(var(--brand-pink))] text-[10px] uppercase tracking-widest font-bold">First move</span>
                <span className="text-white/80">Maintenance Visibility Scan</span>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}