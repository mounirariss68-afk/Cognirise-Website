import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { Link } from "wouter";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { contentRecord, useCmsCollection, usePublishedContactEmail, useCmsPreviewRequestDisabled } from "@/lib/cms";
import { LAUNCH_POLICY } from "@workspace/api-zod";
import { launchContactOffices, sortedContactOffices } from "@/content/contact-launch";
import { assetUrl } from "@/lib/assets";
import { OfficeContactCard } from "@/components/OfficeContactCard";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

export default function Contact() {
  const { market } = useMarketStore();
  const contactEmail = usePublishedContactEmail();
  const protectedPreview = useCmsPreviewRequestDisabled();
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
  const visibleOffices = LAUNCH_POLICY.enabled && !protectedPreview
    ? launchContactOffices(offices.data)
    : sortedContactOffices(offices.data);
  const heroKicker = cleanHeroIdentifier(`Contact / ${marketLocation}`, { marketLocation });

  return (
    <div className="flex flex-col [overflow-wrap:anywhere]">
      <section className="public-hero-shell py-8 grid gap-10 lg:grid-cols-[.9fr_1.1fr] lg:items-stretch">
        <div className="flex min-w-0 flex-col">
        <NavigationBackControl embedded className="mb-5" />
        <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
          <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
          {heroKicker}
        </div>
        
          <div className="lg:mt-auto pb-8">
            <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold mb-8">
              Connect with the team.
            </h1>
            <p className="text-lg text-muted-foreground max-w-[400px] mb-8">
              For general inquiries, press, or partnership opportunities. To explore a specific process automation, please book a Value Scan.
            </p>
            <BrandButton href="/value-scan" className="!min-w-0 max-w-full whitespace-normal">Book a Value Scan</BrandButton>
             <a href={`mailto:${contactEmail}`} className="mt-6 block w-fit text-sm font-semibold underline underline-offset-4">General enquiries</a>
          </div>
        </div>
        {!protectedPreview && <figure className="clip-diagonal relative overflow-hidden h-[380px] lg:h-auto lg:min-h-[540px]">
          <img src={assetUrl("/images/cognirise/contact-emea-presence.jpg")} alt="Architectural illustration connecting European cityscapes, the Bosphorus and Gulf towers, representing Cognirise’s Europe and Middle East presence." className="absolute inset-0 h-full w-full object-cover" fetchPriority="high" />
        </figure>}
      </section>
      <section className="public-hero-shell py-20">
          <div className="border-t border-foreground pt-10">
            <h2 className="text-4xl font-semibold mb-12">Our offices</h2>
            
            <div className="grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {visibleOffices
                .map((office) => (
                  <OfficeContactCard key={`${office.city}-${office.address}`} {...office} />
                ))}
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <h4 className="font-bold mb-2">Email</h4>
              <a href={`mailto:${contactEmail}`} className="text-sm text-[hsl(var(--brand-coral))] hover:underline">{contactEmail}</a>
            </div>
          </div>
      </section>
    </div>
  );
}