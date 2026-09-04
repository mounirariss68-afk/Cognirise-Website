import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";

export default function Contact() {
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  return (
    <div className="flex flex-col">
      <section className="px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full min-h-[70vh] flex flex-col justify-center">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          Contact / {marketLocation}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 border-t border-border pt-16">
          <div>
            <h1 className="text-5xl md:text-6xl font-semibold mb-8">
              Connect with the team.
            </h1>
            <p className="text-lg text-muted-foreground max-w-[400px] mb-8">
              For general inquiries, press, or partnership opportunities. To explore a specific process automation, please book a Value Scan.
            </p>
            <BrandButton href="/value-scan">Book a Value Scan</BrandButton>
          </div>

          <div className="bg-[hsl(var(--secondary))] p-12 border border-border">
            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-[hsl(var(--brand-pink))] mb-6">Global Offices</h3>
            
            <div className="space-y-8">
              <div>
                <h4 className="font-bold mb-2">Dubai</h4>
                <p className="text-sm text-muted-foreground">Dubai International Financial Centre (DIFC)<br />United Arab Emirates</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">Riyadh</h4>
                <p className="text-sm text-muted-foreground">King Abdullah Financial District (KAFD)<br />Kingdom of Saudi Arabia</p>
              </div>
              <div>
                <h4 className="font-bold mb-2">London</h4>
                <p className="text-sm text-muted-foreground">The City<br />United Kingdom</p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="font-bold mb-2">Email</h4>
              <a href="mailto:hello@cognirise.ai" className="text-sm text-[hsl(var(--brand-coral))] hover:underline">hello@cognirise.ai</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}