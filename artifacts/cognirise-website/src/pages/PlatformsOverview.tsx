import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { scrollToSection } from "@/lib/motion";
import { contentRecord, useCmsCollection, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import { ALLIANCE_PLATFORM_LIST } from "@/lib/alliancePlatforms";
import { SpatialDisclosure, SpatialDisclosureItem, SpatialDisclosureTrigger, SpatialDisclosurePanel } from "@/components/ui/spatial-disclosure";
import { PulseImage } from "@/components/ui/pulse-image";

const platformFallback = [
  { name: "CogniOS", description: "The core operating system for governed enterprise intelligence.", link: "/platforms/cognios", category: "Foundation & Orchestration" },
  { name: "CogniDocs", description: "Knowledge made available with context and control.", link: "/platforms/cognidocs", category: "Specialist Engines" },
  { name: "CogniAgents", description: "Governed agents coordinating operational tasks.", link: "/platforms/cogniagents", category: "Specialist Engines" },
  { name: "CogniTalk", description: "Conversational layer for human-AI interaction in the flow of work.", link: "/platforms/cognitalk", category: "Specialist Engines" },
  { name: "CogniWare", description: "Composable intelligence integrations for enterprise systems.", link: "/platforms/cogniware", category: "Specialist Engines" },
];

export default function PlatformsOverview() {
  const { market } = useMarketStore();
  const platformsQuery = useCmsCollection("platform", platformFallback, (item) => {
    const content = contentRecord(item, "platform");
    return {
      name: item.title,
      description: content.summary,
      link: `/platforms/${item.slug}`,
      category: content.category,
    };
  });
  const page = useCmsEntry("platform", "platforms");
  useDynamicMetadata(page.data?.seo && metadataFromSeo(page.data.seo, {
    title: "CogniOS Platform Ecosystem | Cognirise",
    description: "Discover the platform architecture connecting enterprise knowledge, agents and accountability.",
  }));
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const categories = ["Foundation & Orchestration", "Specialist Engines"];
  const matrix = categories.map((category) => ({
    category,
    products: platformsQuery.data.filter((product) => product.category === category),
  })).filter((section) => section.products.length);

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Platforms / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 items-end gap-12 pb-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="pb-4 relative z-10">
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              Ecosystem for <em className="not-italic text-[hsl(var(--brand-pink))]">execution.</em>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production. CogniOS connects enterprise knowledge, specialist agents and human accountability under one governed operating system.
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">Bring us one process</BrandButton>
              <button 
                onClick={() => scrollToSection("matrix")}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                Explore capability matrix <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative h-[400px] lg:h-[640px] clip-diagonal-bottom bg-[hsl(var(--brand-deep))]">
            <PulseImage
              src={assetUrl("/images/cognirise/site-cognios.jpg")}
              alt="A network of luminous paths connecting within a larger structure." 
              className="absolute inset-0 h-full w-full object-cover opacity-90 scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              system
            </div>
            
            <div className="absolute bottom-8 left-8 z-20 text-[10px] uppercase tracking-widest text-white">
              <span className="mb-2 block opacity-75">CogniOS Ecosystem</span>
              One governed flow
            </div>
          </div>
        </div>
      </section>

      <section id="matrix" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="mb-16">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            Capability Matrix
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[68px] leading-[0.97] font-semibold max-w-[700px]">
            Connected capabilities.
          </h2>
        </div>

        <SpatialDisclosure orientation="vertical" allowCollapse={true} defaultValue={matrix[0]?.category} className="flex flex-col">
          {matrix.map((section, idx) => (
            <SpatialDisclosureItem key={idx} id={section.category} className="border-t border-foreground">
              <SpatialDisclosureTrigger id={section.category} className="w-full flex items-center justify-between text-left group pt-8 pb-8">
                <h3 className="text-xl font-bold uppercase tracking-widest text-muted-foreground group-hover:text-[hsl(var(--brand-pink))] transition-colors text-[11px] m-0">{section.category}</h3>
                <Plus className="h-6 w-6 text-foreground group-hover:text-[hsl(var(--brand-pink))] transition-transform duration-300 group-data-[state=active]:rotate-45 group-data-[state=active]:text-[hsl(var(--brand-pink))]" />
              </SpatialDisclosureTrigger>
              <SpatialDisclosurePanel id={section.category} className="data-[state=inactive]:hidden pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                  {section.products.map((product) => (
                    <Link href={product.link} key={product.name}>
                      <div className="group block bg-[hsl(var(--secondary))] p-8 hover:bg-[hsl(var(--brand-violet))/5] transition-colors border border-transparent hover:border-[hsl(var(--brand-pink))/20] cursor-pointer relative overflow-hidden h-full">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
                        <div className="flex justify-between items-start mb-6">
                          <h4 className="text-3xl md:text-4xl font-semibold text-[hsl(var(--brand-deep))] transition-colors group-hover:text-[hsl(var(--brand-pink))]">{product.name}</h4>
                          <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-foreground/70 leading-relaxed text-base max-w-[300px]">{product.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </SpatialDisclosurePanel>
            </SpatialDisclosureItem>
          ))}

          {/* Alliance Platforms Section */}
          <SpatialDisclosureItem id="alliances" className="border-t border-foreground">
            <SpatialDisclosureTrigger id="alliances" className="w-full flex items-center justify-between text-left group pt-8 pb-8">
              <h3 className="text-xl font-bold uppercase tracking-widest text-muted-foreground group-hover:text-[hsl(var(--brand-pink))] transition-colors text-[11px] m-0">Platform Alliances</h3>
              <Plus className="h-6 w-6 text-foreground group-hover:text-[hsl(var(--brand-pink))] transition-transform duration-300 group-data-[state=active]:rotate-45 group-data-[state=active]:text-[hsl(var(--brand-pink))]" />
            </SpatialDisclosureTrigger>
            <SpatialDisclosurePanel id="alliances" className="data-[state=inactive]:hidden pb-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                {ALLIANCE_PLATFORM_LIST.map((platform) => (
                  <Link href={`/platforms/${platform.slug}`} key={platform.slug} data-testid={`link-platform-${platform.slug}`}>
                    <div className="group block bg-[hsl(var(--secondary))] p-8 hover:bg-[hsl(var(--brand-violet))/5] transition-colors border border-transparent hover:border-[hsl(var(--brand-pink))/20] cursor-pointer relative overflow-hidden h-full">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
                      <div className="flex justify-between items-start mb-6">
                        <h4 className="text-3xl font-semibold text-[hsl(var(--brand-deep))] transition-colors group-hover:text-[hsl(var(--brand-pink))]">{platform.name}</h4>
                        <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
                      </div>
                        <p className="text-foreground/70 leading-relaxed text-sm">{platform.summary}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </SpatialDisclosurePanel>
          </SpatialDisclosureItem>
        </SpatialDisclosure>
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
          <p className="text-lg text-white/80 max-w-[515px] mb-12">
            Start with the work where urgency, complexity and value have already collided. In a focused working session, we surface the opportunity, constraints and a practical route to production.
          </p>
          <BrandButton href="/value-scan" variant="submit">Book a value scan</BrandButton>
        </div>
      </section>
    </div>
  );
}
