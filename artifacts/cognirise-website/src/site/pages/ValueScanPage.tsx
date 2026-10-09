import { useEffect, useState } from "react";
import { Link, useSearch } from "wouter";
import { useSubmitEnquiry, type EnquiryInputMarket } from "@workspace/api-client-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";
import { VALUE_SCAN_DAY, VALUE_SCAN_FACTS, VALUE_SCAN_FORM, VALUE_SCAN_HERO, VALUE_SCAN_LEAVE, VALUE_SCAN_WHO } from "@/site/content/value-scan";
import { PageHero } from "@/site/components/PageHero";
import { CardGrid, Section, SectionHeading } from "@/site/components/Primitives";

const AREA_FROM_QUERY: Record<string, string> = { advise: "Advise", build: "Build", run: "Run" };
const MARKETS = new Set(["uae", "ksa", "turkiye", "europe"]);

export default function ValueScanPage() {
  const search = useSearch();
  const { market } = useMarketStore();
  const submit = useSubmitEnquiry();
  const requestedArea = AREA_FROM_QUERY[new URLSearchParams(search).get("area") ?? ""] ?? "";
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", company: "", area: requestedArea, process: "", decides: "", consent: false, website: "" });
  const f = VALUE_SCAN_FORM.fields;

  useEffect(() => {
    if (requestedArea) setForm((prev) => ({ ...prev, area: prev.area || requestedArea }));
  }, [requestedArea]);

  const update = (key: keyof typeof form, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.company || !form.area || !form.process || !form.consent) {
      setError(VALUE_SCAN_FORM.errors.required);
      return;
    }
    if (form.process.trim().length < 20) {
      setError(VALUE_SCAN_FORM.errors.processShort);
      return;
    }
    const challenge = form.decides.trim() ? `${form.process.trim()}\nWho decides: ${form.decides.trim()}` : form.process.trim();
    submit.mutate(
      {
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          organization: form.company.trim(),
          market: (MARKETS.has(market) ? market : "uae") as EnquiryInputMarket,
          processArea: form.area,
          challenge: challenge.slice(0, 2000),
          consent: true,
          sourcePage: window.location.pathname,
          website: form.website,
        },
      },
      { onSuccess: () => setSent(true), onError: () => setError(VALUE_SCAN_FORM.errors.failed) },
    );
  };

  const input = "w-full border-0 border-b border-[#cbd3e1] bg-transparent px-0 pb-2.5 text-[15px] text-[#102957] outline-none transition-colors placeholder:text-[#8b97ab] focus:border-[#102957]";
  const label = "block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f7d94] mb-2";

  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero title={VALUE_SCAN_HERO.title} lead={VALUE_SCAN_HERO.lead} primary={VALUE_SCAN_HERO.primary} image={VALUE_SCAN_HERO.image} />

      <section className="home-layout-frame" aria-label="The session in brief">
        <dl className="grid grid-cols-1 border-y border-[#102957] md:grid-cols-3">
          {VALUE_SCAN_FACTS.map((fact) => (
            <div key={fact.label} className="border-b border-[#cbd3e1] px-5 py-5 md:border-b-0 md:border-r md:last:border-r-0 md:first:pl-0">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6f7d94]">{fact.label}</dt>
              <dd className="mt-2 text-[14px] leading-[1.5] text-[#30486d]">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Section rule={false} labelledBy="day-heading">
        <SectionHeading id="day-heading">{VALUE_SCAN_DAY.heading}</SectionHeading>
        <ol className="mt-10 border-t border-[#102957]">
          {VALUE_SCAN_DAY.steps.map((step, index) => (
            <li key={step.title} className="grid grid-cols-[44px_1fr] gap-4 border-b border-[#cbd3e1] py-6 md:grid-cols-[64px_0.4fr_0.6fr] md:gap-6">
              <span className="pt-[6px] text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
              <h3 className="font-display text-[22px] font-semibold leading-[1.1] tracking-[-0.04em] text-[#102957]">{step.title}</h3>
              <p className="col-start-2 text-[15px] leading-[1.55] text-[#405777] md:col-start-3">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="soft" labelledBy="who-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-[6vw]">
          <div>
            <SectionHeading id="who-heading" size="sm">{VALUE_SCAN_WHO.heading}</SectionHeading>
            <CardGrid items={VALUE_SCAN_WHO.items} columns={2} titleAs="strong" />
          </div>
          <div>
            <SectionHeading id="leave-heading" size="sm">{VALUE_SCAN_LEAVE.heading}</SectionHeading>
            <CardGrid items={VALUE_SCAN_LEAVE.items} columns={2} titleAs="strong" />
          </div>
        </div>
      </Section>

      <Section id="book" labelledBy="book-heading" className="scroll-mt-24">
        <div className="grid gap-10 lg:grid-cols-[0.4fr_0.6fr] lg:gap-[6vw]">
          <div>
            <SectionHeading id="book-heading">{VALUE_SCAN_FORM.heading}</SectionHeading>
            <p className="mt-6 max-w-[460px] text-[16px] leading-[1.6] text-[#405777]">{VALUE_SCAN_FORM.intro}</p>
          </div>

          {sent ? (
            <div className="border border-[#102957] bg-white p-8" role="status">
              <h3 className="font-display text-[26px] font-semibold tracking-[-0.04em] text-[#102957]">{VALUE_SCAN_FORM.success.heading}</h3>
              <p className="mt-4 text-[15px] leading-[1.6] text-[#405777]">{VALUE_SCAN_FORM.success.body}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="border border-[#102957] bg-white p-6 md:p-8" aria-describedby="form-after">
              <div className="grid gap-7 md:grid-cols-2">
                <div>
                  <label htmlFor="vs-name" className={label}>{f.name.label}</label>
                  <input id="vs-name" name="name" autoComplete="name" required className={input} placeholder={f.name.placeholder} value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="vs-email" className={label}>{f.email.label}</label>
                  <input id="vs-email" name="email" type="email" autoComplete="email" required className={input} placeholder={f.email.placeholder} value={form.email} onChange={(e) => update("email", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="vs-company" className={label}>{f.company.label}</label>
                  <input id="vs-company" name="company" autoComplete="organization" required className={input} placeholder={f.company.placeholder} value={form.company} onChange={(e) => update("company", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="vs-area" className={label}>{f.area.label}</label>
                  <select id="vs-area" name="area" required className={`${input} appearance-none`} value={form.area} onChange={(e) => update("area", e.target.value)}>
                    <option value="">Choose one</option>
                    {f.area.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="vs-process" className={label}>{f.process.label}</label>
                  <textarea id="vs-process" name="process" required rows={4} className={`${input} resize-y`} placeholder={f.process.placeholder} value={form.process} onChange={(e) => update("process", e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="vs-decides" className={label}>{f.decides.label} <span className="normal-case tracking-normal text-[#8b97ab]">(optional)</span></label>
                  <input id="vs-decides" name="decides" className={input} placeholder={f.decides.placeholder} value={form.decides} onChange={(e) => update("decides", e.target.value)} />
                </div>
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="vs-website">Website</label>
                  <input id="vs-website" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update("website", e.target.value)} />
                </div>
                <label className="flex items-start gap-3 text-[14px] leading-[1.5] text-[#30486d] md:col-span-2">
                  <input type="checkbox" required className="mt-[3px] h-4 w-4 accent-[#102957]" checked={form.consent} onChange={(e) => update("consent", e.target.checked)} />
                  <span>{f.consent.label} <Link href={f.consent.link.href} className="font-semibold underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))]">{f.consent.link.label}</Link></span>
                </label>
              </div>
              {error && <p role="alert" className="mt-5 text-[14px] font-semibold text-[hsl(var(--brand-coral))]">{error}</p>}
              <div className="mt-7 flex flex-wrap items-center gap-6">
                <BrandButton type="submit" variant="submit" isLoading={submit.isPending}>{VALUE_SCAN_FORM.submit}</BrandButton>
                <p id="form-after" className="text-[13px] text-[#6f7d94]">{VALUE_SCAN_FORM.after}</p>
              </div>
            </form>
          )}
        </div>
      </Section>
    </div>
  );
}
