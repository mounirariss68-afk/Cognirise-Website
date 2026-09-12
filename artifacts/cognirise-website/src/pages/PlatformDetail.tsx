import { useRoute } from "wouter";
import NotFound from "@/pages/not-found";
import { contentRecord, resolveCmsMedia, useCmsEntry } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import { PlatformPresentation } from "@/components/cms/PublicCmsPresentations";

export default function PlatformDetail() {
  const [match, params] = useRoute("/platforms/:slug");
  const slug = params?.slug ?? "";
  const query = useCmsEntry("platform", slug);
  const record = query.data ? contentRecord(query.data, "platform") : undefined;
  const hero = record && query.data
    ? resolveCmsMedia(query.data.media, record.heroMedia, record.heroMediaId)
    : undefined;
  useDynamicMetadata(query.data && metadataFromSeo(query.data.seo, {
    title: `${query.data.title} | Cognirise`,
    description: record?.summary ?? query.data.summary ?? "A Cognirise governed enterprise platform.",
    imageUrl: hero?.url,
  }));
  if (!match || !slug || (!query.isPending && (!record || record.template !== "standard"))) return <NotFound />;
  if (!record || !query.data) return null;
  return <PlatformPresentation title={query.data.title} content={record} summary={record.summary} heroMedia={hero} />;
}