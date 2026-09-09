import { contentRecord, useCmsEntry } from "@/lib/cms";
import { EducationEditorialView } from "@/components/industries/EducationEditorial";
import { INDUSTRIES } from "@/content/industries";

export default function IndustryEducation() {
  const industry = INDUSTRIES[5];
  const cms = useCmsEntry("industry", industry.slug);
  const published = cms.data ? contentRecord(cms.data, "industry") : null;
  if (cms.isAuthoritative && cms.delivery === "loading") return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]" aria-busy="true"><p>Loading higher education perspective…</p></main>;
  if (cms.isAuthoritative && (!published || !published.educationPov)) return <main className="min-h-[70vh] bg-[#fdfbf7] px-6 py-24 text-[#102957]"><h1 className="font-display text-5xl font-semibold">This industry perspective is under review.</h1></main>;
  const view = published ? { ...industry, ...published, slug: industry.slug } : industry;
  return <EducationEditorialView view={view} />;
}