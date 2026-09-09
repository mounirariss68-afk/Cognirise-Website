import { useRoute } from "wouter";
import NotFound from "@/pages/not-found";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import { CaseStudyLayout, type PublicCaseStudy } from "@/components/work/case-study-ui";

export default function CaseStudyDetail() {
  const [match, params] = useRoute("/work/:slug");
  const slug = params?.slug ?? "";
  // Resolve from the published collection: summary records intentionally have
  // no public detail endpoint, so a summary route must not make a doomed
  // per-slug request (or log its expected 404).
  const query = useCmsCollection<PublicCaseStudy>("case-study", [], (item) => {
    const record = contentRecord(item, "case-study") as PublicCaseStudy;
    return record.disclosure === "restricted" ? null : record;
  });
  const record = query.data.find((item) => item.slug === slug);
  const canRender = record?.variant === "full" && record.disclosure !== "restricted";
  useDynamicMetadata(record && canRender ? metadataFromSeo(record.seo, {
    title: `${record.title} | Cognirise`,
    description: record.objective || record.mandate || record.summary || "A Cognirise delivery record.",
    imageUrl: record.media?.[0]?.url,
  }) : undefined);
  if (!match || !slug || (!query.isPending && (!record || !canRender))) return <NotFound />;
  if (!record || !canRender) return null;
  return <CaseStudyLayout item={record} />;
}