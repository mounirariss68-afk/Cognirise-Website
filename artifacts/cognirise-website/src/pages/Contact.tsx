import { useState } from "react";
import { Check } from "lucide-react";
import { useSubmitEnquiry } from "@workspace/api-client-react";
import { BrandButton } from "@/components/ui/brand-button";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore } from "@/store/market";
import { trackEvent } from "@/lib/analytics";

export function ContactForm() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    role: "",
    enquiryType: "",
    message: "",
    consent: false,
    website: "",
  });
  const submitEnquiry = useSubmitEnquiry();
  const { toast } = useToast();
  const { market } = useMarketStore();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name || !formData.email || !formData.organization || !formData.enquiryType || !formData.message || !formData.consent) {
      toast({
        title: "Required fields missing",
        description: "Complete the required fields and confirm consent.",
        variant: "destructive",
      });
      return;
    }
    submitEnquiry.mutate({
      data: {
        name: formData.name,
        email: formData.email,
        organization: formData.organization,
        role: formData.role || undefined,
        market,
        processArea: formData.enquiryType,
        challenge: formData.message,
        consent: true,
        sourcePage: window.location.pathname,
        website: formData.website,
      },
    }, {
      onSuccess: () => {
        trackEvent("contact_form_submitted", {
          market,
          source_page: window.location.pathname,
          form_type: "contact",
          delivery_source: "contact_form",
        });
        setIsSubmitted(true);
      },
      onError: () => toast({
        title: "Submission failed",
        description: "There was an error sending your enquiry. Please try again or email us directly.",
        variant: "destructive",
      }),
    });
  };

  if (isSubmitted) {
    return (
      <div className="border-t border-border py-8" role="status">
        <Check className="mb-5 text-[hsl(var(--brand-pink))]" size={40} />
        <h3 className="text-2xl font-semibold">Enquiry received.</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Thank you. Our team will review your message and contact you shortly.</p>
        <button type="button" className="mt-6 text-sm font-semibold text-[hsl(var(--brand-coral))] hover:underline" onClick={() => setIsSubmitted(false)}>Send another enquiry</button>
      </div>
    );
  }

  return (
    <form className="space-y-5 border-t border-border pt-8" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-semibold">Name *
          <input className="mt-2 w-full border border-border bg-background p-3 text-sm font-normal" name="name" value={formData.name} onChange={handleChange} required />
        </label>
        <label className="text-xs font-semibold">Work email *
          <input className="mt-2 w-full border border-border bg-background p-3 text-sm font-normal" type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="text-xs font-semibold">Company / organisation *
          <input className="mt-2 w-full border border-border bg-background p-3 text-sm font-normal" name="organization" value={formData.organization} onChange={handleChange} required />
        </label>
        <label className="text-xs font-semibold">Role / title
          <input className="mt-2 w-full border border-border bg-background p-3 text-sm font-normal" name="role" value={formData.role} onChange={handleChange} />
        </label>
      </div>
      <label className="block text-xs font-semibold">Enquiry type *
        <select className="mt-2 w-full border border-border bg-background p-3 text-sm font-normal" name="enquiryType" value={formData.enquiryType} onChange={handleChange} required>
          <option value="">Select the closest fit</option>
          <option value="General enquiry">General enquiry</option>
          <option value="Partnership">Partnership</option>
          <option value="Press">Press</option>
          <option value="Careers">Careers</option>
        </select>
      </label>
      <label className="block text-xs font-semibold">Message *
        <textarea className="mt-2 min-h-28 w-full resize-y border border-border bg-background p-3 text-sm font-normal" name="message" value={formData.message} onChange={handleChange} minLength={20} maxLength={2000} required />
      </label>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
        <input className="mt-0.5" type="checkbox" checked={formData.consent} onChange={(event) => setFormData((previous) => ({ ...previous, consent: event.target.checked }))} required />
        <span>I agree that Cognirise may contact me about this request.</span>
      </label>
      <input type="text" name="website" value={formData.website} onChange={handleChange} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px]" />
      <button className="inline-flex min-h-11 items-center bg-[hsl(var(--brand-deep))] px-5 text-sm font-bold text-white disabled:opacity-60" type="submit" disabled={submitEnquiry.isPending}>
        {submitEnquiry.isPending ? "Sending..." : "Send enquiry"}
      </button>
    </form>
  );
}

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
            <div className="mt-12">
              <ContactForm />
            </div>
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