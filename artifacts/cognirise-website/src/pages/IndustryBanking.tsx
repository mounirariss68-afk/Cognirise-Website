import React from "react";
import { IndustryEditorial } from "@/components/industries/IndustryEditorial";
import { BankingEditorial } from "@/components/industries/BankingEditorial";
import { INDUSTRIES, type IndustryContent } from "@/content/industries";
import { contentRecord, useCmsEntry, type CmsRecord } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import type { IndustryContent as CmsIndustryContent } from "@workspace/api-zod";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { FinancialServicesPage } from "@/components/industries/financial-services/FinancialServicesPage";
import { FINANCIAL_SERVICES_LAUNCH_OVERRIDE, fsHero } from "@/content/financial-services-launch";
import { useCmsPreviewRequestDisabled } from "@/lib/cms";
import { useReleaseContext } from "@/lib/releases";

/** Public launch override applies only outside protected CMS previews. */
export function financialServicesOverrideActive(enabled: boolean, inPreview: boolean) {
  return enabled && !inPreview;
}

export default function IndustryBanking() {
  const releaseContext = useReleaseContext();
  const previewDisabled = useCmsPreviewRequestDisabled();
  const inPreview = Boolean(releaseContext?.preview) || previewDisabled;
  if (financialServicesOverrideActive(FINANCIAL_SERVICES_LAUNCH_OVERRIDE, inPreview)) {
    return <FinancialServicesLaunch />;
  }
  return <IndustryBankingCms />;
}

function FinancialServicesLaunch() {
  useDynamicMetadata({ title: fsHero.metaTitle, description: fsHero.metaDescription, imageUrl: fsHero.image });
  return <FinancialServicesPage />;
}

function IndustryBankingCms() {
  const baseIndustry = INDUSTRIES.find(i => i.slug === "financial-services") || INDUSTRIES[0];
  const cms = useCmsEntry("industry", baseIndustry.slug);
  const published = cms.data ? contentRecord(cms.data, "industry") : null;

  const view = published ? { ...baseIndustry, ...published, slug: baseIndustry.slug } as IndustryContent & Partial<CmsRecord<CmsIndustryContent>> : baseIndustry;

  const pov = view.bankingPov;
  useDynamicMetadata(
    published?.seo
      ? metadataFromSeo(published.seo, {
          title: pov ? `${pov.descriptor} | Cognirise` : `${baseIndustry.name} | Cognirise`,
          description: pov ? pov.hero.body : baseIndustry.dek,
          imageUrl: published?.image,
        })
      : {
          title: pov ? `${pov.descriptor} | Cognirise` : `${baseIndustry.name} | Cognirise`,
          description: pov ? pov.hero.body : baseIndustry.dek,
          imageUrl: published?.image,
        }
  );

  if (cms.isAuthoritative && cms.delivery === "loading") {
    return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]" aria-busy="true"><NavigationBackControl embedded className="mb-7" /><p>Loading industry perspective…</p></main>;
  }
  if (cms.isAuthoritative && !published) {
    return (
      <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]">
        <div className="mx-auto max-w-3xl">
          <NavigationBackControl embedded className="mb-7" />
          <h1 className="font-display text-5xl font-semibold">This industry perspective is under review.</h1>
          <p className="mt-6 max-w-xl text-lg text-[#506583]">It will return when an approved edition is published for this market.</p>
          <a className="mt-8 inline-flex font-bold text-[#db509e]" href="/industries">Explore all industries &rarr;</a>
        </div>
      </main>
    );
  }

  if (pov) {
    return <BankingEditorial view={view} />;
  }

  return <IndustryEditorial industry={view} />;
}