import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { contentRecord, useCmsCollection, usePublishedContactEmail } from "@/lib/cms";
import { OfficeContactCard } from "@/components/OfficeContactCard";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

export default function Contact() {
  const { market } = useMarketStore();
  const contactEmail = usePublishedContactEmail();
  const offices = useCmsCollection("office", [], (item) => {
    const office = contentRecord(item, "office");
    return {
      city: office.city,
      address: office.address,
      phone: office.phone,
      order: office.order,
    };
  });
  
  const marketLocation = getMarketLocationLabel(market);
  const heroKicker = cleanHeroIdentifier(`Contact / ${marketLocation}`, { marketLocation });

  return (
    <div className="flex flex-col">
      <section className="public-hero-shell px-6 md:px-12 py-24 max-w-[1440px] mx-auto w-full min-h-[70vh] flex flex-col justify-center">
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {heroKicker}
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
              {offices.data
                .toSorted((left, right) => left.order - right.order)
                .map((office) => (
                  <OfficeContactCard key={`${office.city}-${office.address}`} {...office} />
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="font-bold mb-2">Email</h4>
              <a href={`mailto:${contactEmail}`} className="text-sm text-[hsl(var(--brand-coral))] hover:underline">{contactEmail}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}