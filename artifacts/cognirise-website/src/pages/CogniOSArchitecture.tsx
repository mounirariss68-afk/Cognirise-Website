import { Link } from "wouter";
import { ArrowRight, Activity, Database, Key, CheckCircle, Search, Terminal } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useState } from "react";
import { useMarketStore } from "@/store/market";

export default function CogniOSArchitecture() {
  const { market } = useMarketStore();
  const [activeLayer, setActiveLayer] = useState<number | null>(null);
  const [tracing, setTracing] = useState(false);
  const [traceStep, setTraceStep] = useState(0);

  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const architectureLayers = [
    { id: 6, title: "Experience Layer", desc: "Human and agent interactions designed for real operational context.", icon: <Search className="w-5 h-5" /> },
    { id: 5, title: "Agent Layer", desc: "CogniAgents coordinate governed tasks, decisions and specialist actions.", icon: <Activity className="w-5 h-5" /> },
    { id: 4, title: "Knowledge Layer", desc: "CogniDocs turns enterprise knowledge into controlled, retrievable context.", icon: <Database className="w-5 h-5" /> },
    { id: 3, title: "Intelligence Layer", desc: "Models, prompts and orchestration selected for the work at hand.", icon: <Terminal className="w-5 h-5" /> },
    { id: 2, title: "Integration Layer", desc: "Connects the systems where work, data and decisions already live.", icon: <Key className="w-5 h-5" /> },
    { id: 1, title: "Foundation Layer", desc: "Infrastructure, data and identity controls shaped around the deployment context.", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  const handleTrace = () => {
    if (tracing) return;
    setTracing(true);
    setTraceStep(0);
    
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setTraceStep(step);
      if (step > architectureLayers.length) {
        clearInterval(interval);
        setTimeout(() => setTracing(false), 2000);
      }
    }, 800);
  };

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Platforms / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-end pb-12 min-h-[50vh]">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[85px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              How intelligence <em className="not-italic text-[hsl(var(--brand-pink))]">moves.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Explore the six layers of the CogniOS architecture. See how requests are processed, governed, and fulfilled safely.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Architecture Section */}
      <section className="bg-[hsl(var(--brand-deep))] py-24 text-white relative overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            
            {/* Left: Diagram */}
            <div className="relative">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold uppercase tracking-widest text-white/50 text-[11px]">System Architecture</h3>
                <button 
                  onClick={handleTrace}
                  disabled={tracing}
                  className="text-[11px] font-bold uppercase tracking-widest bg-[hsl(var(--brand-coral))] hover:bg-white hover:text-[hsl(var(--brand-deep))] text-white px-4 py-2 transition-colors disabled:opacity-50"
                >
                  {tracing ? "Tracing Request..." : "Trace a Request"}
                </button>
              </div>

              <div className="flex flex-col gap-2 relative">
                {/* Trace Line */}
                <div className="absolute left-6 top-6 bottom-6 w-[2px] bg-white/10 z-0" />
                {tracing && traceStep > 0 && (
                  <div 
                    className="absolute left-6 top-6 w-[2px] bg-gradient-to-b from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] z-10 transition-all duration-300"
                    style={{ height: `${(traceStep / architectureLayers.length) * 100}%` }}
                  />
                )}

                {architectureLayers.map((layer, index) => {
                  const isTraced = tracing && traceStep > index;
                  const isActive = activeLayer === layer.id || isTraced;

                  return (
                    <button
                      key={layer.id}
                      onMouseEnter={() => !tracing && setActiveLayer(layer.id)}
                      onMouseLeave={() => !tracing && setActiveLayer(null)}
                      onClick={() => !tracing && setActiveLayer(layer.id)}
                      className={`relative z-20 flex items-center gap-6 p-4 rounded-sm border text-left transition-all duration-300 ${
                        isActive 
                          ? "bg-white/10 border-[hsl(var(--brand-pink))]/50 translate-x-2 shadow-[0_0_20px_rgba(219,80,158,0.1)]" 
                          : "bg-white/5 border-transparent hover:bg-white/10"
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 transition-colors ${
                        isActive ? "bg-[hsl(var(--brand-coral))]" : "bg-white/20"
                      }`} />
                      <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-1">
                          Layer 0{layer.id}
                        </div>
                        <div className="text-lg font-semibold">{layer.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Info Panel / Accessible Fallback */}
            <div className="lg:py-16">
              <div className="sticky top-32">
                {activeLayer || (tracing && traceStep > 0 && traceStep <= architectureLayers.length) ? (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    {(() => {
                      const id = tracing && traceStep > 0 && traceStep <= architectureLayers.length ? architectureLayers[traceStep - 1].id : activeLayer;
                      const layer = architectureLayers.find(l => l.id === id);
                      if (!layer) return null;
                      return (
                        <div className="bg-white/5 border border-white/10 p-8 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                          <div className="text-[hsl(var(--brand-coral))] mb-6">{layer.icon}</div>
                          <h4 className="text-3xl font-display font-semibold mb-4 text-white">Layer 0{layer.id}: {layer.title}</h4>
                          <p className="text-white/70 text-lg leading-relaxed">{layer.desc}</p>
                          <div className="mt-8 pt-6 border-t border-white/10 text-sm text-white/50">
                            {tracing ? "Tracing in progress..." : "Hover over a layer to inspect its role in the architecture."}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-white/50 text-lg leading-relaxed">
                    Select a layer to inspect its architectural responsibility, or run a trace to see how a request moves from user interaction through the infrastructure and back.
                  </div>
                )}
                
                {/* Screen reader accessible list */}
                <div className="sr-only">
                  <h2>CogniOS Architecture Layers</h2>
                  <ul>
                    {architectureLayers.map(l => (
                      <li key={l.id}>Layer {l.id}: {l.title} - {l.desc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="bg-[hsl(var(--secondary))] px-6 md:px-12 py-24 w-full">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr] gap-12 lg:gap-[7vw] items-center">
          <div className="lg:py-16">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Accountability
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-[76px] leading-[0.97] font-semibold mb-8">
              Audit in the <em className="not-italic text-[hsl(var(--brand-coral))]">flow.</em>
            </h2>
            <p className="text-lg text-foreground/70 max-w-[415px] mb-10">
              The architecture is designed so that governance is not an external process. Controls, identity, and logging are enforced natively at the Foundation and Integration layers.
            </p>
          </div>
          
          <div className="relative h-[400px] lg:h-[570px] lg:-mt-10 clip-diagonal-bottom">
            <img 
              src="/images/cognirise/cognirise-pulse-outcomes.jpg" 
              alt="Data pathways moving through an architectural framework." 
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute right-6 bottom-6 text-[10px] font-semibold uppercase tracking-widest text-white">
              built-in governance
            </div>
          </div>
        </div>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          MOVE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            The first move
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[110px] leading-[0.88] font-semibold tracking-tight mb-8">
            Bring one process.<br />
            <em className="not-italic text-[#ff8470]">Leave with a route.</em>
          </h2>
          <BrandButton href="/value-scan" variant="submit">Book a value scan</BrandButton>
        </div>
      </section>
    </div>
  );
}