import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { INDUSTRIES } from "@/content/industries";
import { assetUrl } from "@/lib/assets";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { PulseImage } from "@/components/ui/pulse-image";
import {
  SpatialDisclosure,
  SpatialDisclosureItem,
  SpatialDisclosurePanel,
  SpatialDisclosureTrigger,
} from "@/components/ui/spatial-disclosure";

type IndustryPickerProps = {
  id?: string;
  kicker?: string;
  heading?: string;
  introduction?: string;
  className?: string;
  compact?: boolean;
};

const pickerStyles = `
  .home-industry-disclosure{--hi-ink:#102957;--hi-paper:#fdfcfb;--hi-line:#cbd3e1;--hi-coral:hsl(var(--brand-coral))}
  .home-industry-grid{display:flex;flex-direction:column;border-top:1px solid var(--hi-ink)}
  .home-industry-row{display:flex;height:420px;border-bottom:1px solid var(--hi-line);overflow:hidden}
  .home-industry-item{--hi-accent:#7659df;position:relative;isolation:isolate;display:grid;grid-template-rows:1fr 0fr;min-width:0;flex:1 1 0;overflow:hidden;background:#eeeaf2;color:var(--hi-ink);transition:flex .75s cubic-bezier(.16,1,.3,1),grid-template-rows .58s cubic-bezier(.16,1,.3,1)}
  .home-industry-item+.home-industry-item{border-left:1px solid rgba(16,41,87,.24)}
  .home-industry-row:has(.home-industry-item.active) .home-industry-item{flex-grow:.7}
  .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{flex-grow:1.6;grid-template-rows:minmax(185px,.57fr) minmax(0,.43fr)}
  .home-industry-item[data-industry="telecoms"]{--hi-accent:#db509e}
  .home-industry-item[data-industry="travel-hospitality"]{--hi-accent:#ff775d}
  .home-industry-item[data-industry="energy-resources"]{--hi-accent:#8d6be4}
  .home-industry-item[data-industry="public-sector"]{--hi-accent:#e35a99}
  .home-industry-item[data-industry="education"]{--hi-accent:#ac86ef}
  .home-industry-visual{position:absolute;z-index:-3;inset:0;margin:0;overflow:hidden;background:#f3eff5}
  .home-industry-visual img{width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(1.02) contrast(.99) brightness(1.04);transform:scale(1.08);transition:transform .9s cubic-bezier(.16,1,.3,1),filter .45s ease}
  .home-industry-item.active .home-industry-visual img{filter:saturate(1.08) contrast(1) brightness(1.02);transform:scale(1)}
  .home-industry-visual:before{content:"";position:absolute;z-index:1;inset:0;background:linear-gradient(120deg,var(--hi-accent),transparent 54%);mix-blend-mode:color;opacity:.1;transition:opacity .45s ease}
  .home-industry-item.active .home-industry-visual:before{opacity:.18}
  .home-industry-visual:after{content:"";position:absolute;z-index:2;inset:0;background:linear-gradient(180deg,rgba(253,252,251,.12),rgba(253,252,251,0) 38%,rgba(253,252,251,.96) 100%),linear-gradient(90deg,rgba(253,252,251,.14),transparent 76%)}
  .home-industry-item.active .home-industry-visual:after{background:linear-gradient(90deg,rgba(253,252,251,.96) 0%,rgba(253,252,251,.9) 23%,rgba(253,252,251,.62) 36%,rgba(253,252,251,.18) 49%,transparent 62%),linear-gradient(180deg,rgba(253,252,251,.04),transparent 50%,rgba(253,252,251,.76) 100%)}
  .home-industry-trigger{appearance:none;border:0;background:transparent;color:inherit;width:100%;min-width:0;padding:25px 27px 22px;display:grid;grid-template-columns:1fr;grid-template-rows:auto 1fr auto auto;gap:10px;text-align:left;cursor:pointer}
  .home-industry-trigger:focus-visible{outline:3px solid var(--hi-coral);outline-offset:-4px}
  .home-industry-number{font:700 10px/1 Inter,sans-serif;letter-spacing:.13em;color:rgba(16,41,87,.68)}
  .home-industry-title{grid-column:1/-1;align-self:end;margin:0;font:600 clamp(21px,2.05vw,31px)/1.02 Comfortaa,sans-serif;letter-spacing:-.065em;text-wrap:balance;text-shadow:0 1px 16px rgba(255,255,255,.92)}
  .home-industry-orientation{grid-column:1/-1;margin:0;max-width:510px;font-size:12px;line-height:1.48;color:rgba(16,41,87,.78)}
  .home-industry-panel{display:grid;grid-template-rows:0fr;min-height:0;transition:grid-template-rows .58s cubic-bezier(.16,1,.3,1)}
  .home-industry-item.active .home-industry-panel{grid-template-rows:1fr}
  .home-industry-panel-inner{min-height:0;overflow:hidden}
  .home-industry-panel-content{padding:0 27px 25px}
  .home-industry-detail{max-width:620px;margin:0 0 13px;font-size:12px;line-height:1.52;color:rgba(16,41,87,.76)}
  .home-industry-item.active .home-industry-title{color:#102957;text-shadow:0 1px 18px rgba(255,255,255,1)}
  .home-industry-item.active .home-industry-orientation,.home-industry-item.active .home-industry-detail{max-width:34ch;color:rgba(16,41,87,.96);font-weight:500;text-shadow:0 1px 12px rgba(255,255,255,.95)}
  .home-industry-link{display:inline-flex;align-items:center;gap:8px;border-bottom:1px solid rgba(16,41,87,.58);padding-bottom:4px;font-size:11px;font-weight:700;color:var(--hi-ink);transition:color .2s,border-color .2s}
  .home-industry-link:hover{color:var(--hi-coral);border-color:var(--hi-coral)}
  .home-industry-status{border-block:1px solid var(--hi-line);margin-top:36px;padding:34px 0;color:#536887;font-size:14px;line-height:1.55}
  .home-industry-disclosure--compact{padding-top:32px;padding-bottom:64px}
  .home-industry-disclosure--compact > .border-t{padding-top:16px;gap:18px}
  .home-industry-disclosure--compact h2{font-size:clamp(34px,3.6vw,52px);margin-top:8px}
  .home-industry-disclosure--compact .home-industry-grid{margin-top:24px}
  .home-industry-disclosure--compact .home-industry-row{height:196px}
  .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active){height:294px}
  .home-industry-disclosure--compact .home-industry-trigger{padding:16px 18px 14px;gap:7px}
  .home-industry-disclosure--compact .home-industry-title{font-size:clamp(18px,1.7vw,24px)}
  .home-industry-disclosure--compact .home-industry-orientation{font-size:12px;line-height:1.48}
  .home-industry-disclosure--compact .home-industry-panel-content{padding:0 18px 16px}
  .home-industry-disclosure--compact .home-industry-detail{font-size:12px;line-height:1.52;margin-bottom:9px}
  .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{grid-template-rows:130px minmax(0,1fr)}
  @media(min-width:768px) and (max-width:1100px){
    .home-industry-disclosure--compact{padding-top:28px;padding-bottom:52px}
    .home-industry-disclosure--compact > .border-t{padding-top:14px;gap:16px}
    .home-industry-disclosure--compact .home-industry-row{height:206px}
    .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active){height:294px}
    .home-industry-disclosure--compact .home-industry-trigger{padding:15px 16px 13px}
    .home-industry-disclosure--compact .home-industry-panel-content{padding:0 16px 14px}
    .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{grid-template-rows:130px minmax(0,1fr)}
  }
  @media(min-width:768px) and (max-width:1100px){
    .home-industry-row{height:390px}
    .home-industry-row:has(.home-industry-item.active) .home-industry-item{flex-grow:.85}
    .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{flex-grow:1.3}
    .home-industry-trigger{padding:22px 20px 20px}
    .home-industry-panel-content{padding:0 20px 22px}
    .home-industry-title{font-size:22px}
    .home-industry-orientation,.home-industry-detail{font-size:11.5px}
  }
  @media(max-width:767px){
    .home-industry-row{display:block;height:auto;border:0;overflow:visible}
    .home-industry-item{min-height:300px;grid-template-rows:minmax(300px,1fr) 0fr;border-bottom:1px solid rgba(16,41,87,.22)}
    .home-industry-item+.home-industry-item{border-left:0}
    .home-industry-row:has(.home-industry-item.active) .home-industry-item,.home-industry-row:has(.home-industry-item.active) .home-industry-item.active{flex-grow:1}
    .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{grid-template-rows:minmax(240px,1fr) auto}
    .home-industry-trigger{padding:22px 21px 20px}
    .home-industry-panel-content{padding:0 21px 24px}
    .home-industry-title{font-size:28px}
    .home-industry-disclosure--compact{padding-top:3rem;padding-bottom:82px}
    .home-industry-disclosure--compact > .border-t{padding-top:1.5rem;gap:2rem}
    .home-industry-disclosure--compact h2{font-size:42px;margin-top:.75rem}
    .home-industry-disclosure--compact .home-industry-grid{margin-top:2.25rem}
    .home-industry-disclosure--compact .home-industry-row,
    .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active){height:auto}
    .home-industry-disclosure--compact .home-industry-trigger{padding:22px 21px 20px;gap:10px}
    .home-industry-disclosure--compact .home-industry-title{font-size:28px}
    .home-industry-disclosure--compact .home-industry-orientation{font-size:12px;line-height:1.48}
    .home-industry-disclosure--compact .home-industry-panel-content{padding:0 21px 24px}
    .home-industry-disclosure--compact .home-industry-detail{font-size:12px;line-height:1.52;margin-bottom:13px}
    .home-industry-disclosure--compact .home-industry-row:has(.home-industry-item.active) .home-industry-item.active{grid-template-rows:minmax(240px,1fr) auto}
  }
  @media(prefers-reduced-motion:reduce){.home-industry-item,.home-industry-panel,.home-industry-visual img,.home-industry-visual:before,.home-industry-link{transition:none!important}}
`;

export function IndustryPicker({
  id = "industries",
  kicker = "Where we operate",
  heading = "Built for complexity.",
  introduction = "We partner with organisations whose scale, regulatory burden and operating environments demand absolute precision.",
  className = "",
  compact = false,
}: IndustryPickerProps) {
  const industryQuery = useCmsCollection("industry", INDUSTRIES, (item) => ({
    ...contentRecord(item, "industry"),
    slug: item.slug,
  }));
  const industries = industryQuery.data.map((industry, index) => ({
    id: String(index + 1).padStart(2, "0"),
    slug: industry.slug,
    name: industry.name,
    href: `/industries/${industry.slug}`,
    orientation: industry.thesis,
    detail: industry.dek,
    image: industry.image,
    imageAlt: industry.imageAlt,
  }));
  const rows = Array.from(
    { length: Math.ceil(industries.length / 3) },
    (_, index) => industries.slice(index * 3, index * 3 + 3),
  );
  const unavailable = industryQuery.isAuthoritative
    && ["api-error", "contract-error"].includes(industryQuery.delivery);
  const loading = industryQuery.isAuthoritative && industryQuery.delivery === "loading";
  const empty = industryQuery.isAuthoritative && industryQuery.delivery === "intentional-empty";

  return (
    <section id={id} className={`home-industry-disclosure ${compact ? "home-industry-disclosure--compact" : ""} px-6 md:px-[4.8vw] pb-[82px] lg:pb-[130px] pt-12 ${className}`}>
      <style>{pickerStyles}</style>
      <div className="border-t border-[#102957] pt-6 flex flex-col lg:flex-row justify-between gap-8 items-start lg:items-end">
        <div>
          <div className="flex items-center gap-3 text-[10px] tracking-[0.12em] uppercase font-semibold text-[#102957]">
            <div className="w-[23px] h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
            {kicker}
          </div>
          <h2 className="font-display font-semibold text-[42px] lg:text-[clamp(40px,4.8vw,70px)] leading-[0.98] tracking-[-0.08em] mt-3">
            {heading}
          </h2>
        </div>
        <p className="text-[14px] leading-[1.5] max-w-[280px] text-[#536887]">{introduction}</p>
      </div>

      {loading && <div className="home-industry-status" role="status" data-testid="status-industry-picker">Loading industry points of view…</div>}
      {empty && <div className="home-industry-status" data-testid="status-industry-picker-empty">No industry points of view are currently published.</div>}
      {unavailable && (
        <div className="home-industry-status" role="alert" data-testid="status-industry-picker-error">
          <span>Industry points of view are temporarily unavailable.</span>{" "}
          <button type="button" className="underline" onClick={() => { void industryQuery.refetch(); }}>
            Try again
          </button>
        </div>
      )}

      {!loading && !empty && !unavailable && (
        <SpatialDisclosure
          mode="editorial"
          orientation="vertical"
          allowCollapse
          preview
          previewOverridesSelection
          previewExpands
          className="home-industry-grid mt-9 lg:mt-[54px]"
        >
          {rows.map((row, rowIndex) => (
            <div className="home-industry-row" key={`industry-row-${rowIndex + 1}`}>
              {row.map((industry) => (
                <SpatialDisclosureItem
                  key={industry.slug}
                  id={industry.id}
                  data-industry={industry.slug}
                  className={({ isActive, isSelected, isPreview }) => `home-industry-item ${isActive ? "active" : ""} ${isSelected ? "selected" : ""} ${isPreview ? "preview" : ""}`}
                >
                  <figure className="home-industry-visual">
                    <PulseImage src={assetUrl(industry.image)} alt={industry.imageAlt} className="w-full h-full object-cover" />
                  </figure>
                  <SpatialDisclosureTrigger id={industry.id} className="home-industry-trigger" data-testid={`home-industry-trigger-${industry.id}`}>
                    <span className="home-industry-number">{industry.id}</span>
                    <h3 className="home-industry-title">{industry.name}</h3>
                    <p className="home-industry-orientation">{industry.orientation}</p>
                  </SpatialDisclosureTrigger>
                  <SpatialDisclosurePanel id={industry.id} className="home-industry-panel" data-testid={`home-industry-panel-${industry.id}`}>
                    <div className="home-industry-panel-inner">
                      <div className="home-industry-panel-content">
                        <p className="home-industry-detail">{industry.detail}</p>
                        <Link href={industry.href} className="home-industry-link" data-testid={`link-industry-picker-${industry.slug}`}>
                          View {industry.name}
                          <ArrowUpRight size={15} />
                        </Link>
                      </div>
                    </div>
                  </SpatialDisclosurePanel>
                </SpatialDisclosureItem>
              ))}
            </div>
          ))}
        </SpatialDisclosure>
      )}
    </section>
  );
}