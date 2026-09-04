import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useSubmitEnquiry } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useMarketStore } from "@/store/market";

export default function ValueScan() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    role: "",
    processArea: "",
    processContext: "",
    consent: false,
    website: "",
  });
  
  const submitEnquiry = useSubmitEnquiry();
  const { toast } = useToast();
  const { market } = useMarketStore();
  
  const marketLocation = 
    market === "uae" ? "Dubai · United Arab Emirates" :
    market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
    market === "turkiye" ? "Istanbul · Türkiye" :
    "London · Europe";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check required fields
    if (
      !formData.firstName ||
      !formData.lastName ||
      !formData.email ||
      !formData.company ||
      !formData.processArea ||
      formData.processContext.trim().length < 20 ||
      !formData.consent
    ) {
      toast({
        title: "Required fields missing",
        description: "Complete the required fields, add at least 20 characters of context, and confirm consent.",
        variant: "destructive"
      });
      return;
    }

    submitEnquiry.mutate({
      data: {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        organization: formData.company,
        role: formData.role || undefined,
        market,
        processArea: formData.processArea,
        challenge: formData.processContext,
        consent: true,
        sourcePage: window.location.pathname,
        website: formData.website,
      }
    }, {
      onSuccess: () => {
        setIsSubmitted(true);
      },
      onError: () => {
        toast({
          title: "Submission failed",
          description: "There was an error booking your scan. Please try again or contact us directly.",
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 flex-1">
        
        {/* Form Side */}
        <section className="px-6 md:px-12 py-12 md:py-24 order-2 lg:order-1 bg-background flex flex-col justify-center max-w-[800px] lg:ml-auto w-full">
          <div className="lg:pr-[8%]">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-8">
              <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
              Book a Value Scan / {marketLocation}
            </div>
            
            {!isSubmitted ? (
              <>
                <h1 className="text-4xl md:text-5xl lg:text-[62px] leading-[0.98] font-semibold mb-6">
                  Bring one process.
                </h1>
                <p className="text-base text-muted-foreground mb-12 max-w-[450px]">
                  Start where urgency, complexity and value have converged. Provide your details and some context on the process under pressure, and our team will arrange a working session.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3">
                      <label htmlFor="firstName" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                        First Name <span className="text-[hsl(var(--brand-pink))]">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                        className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                        placeholder="Given name"
                      />
                    </div>
                    <div className="space-y-3">
                      <label htmlFor="lastName" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                        Last Name <span className="text-[hsl(var(--brand-pink))]">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                        className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                        placeholder="Family name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3">
                      <label htmlFor="email" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                        Work Email <span className="text-[hsl(var(--brand-pink))]">*</span>
                      </label>
                      <input 
                        type="email" 
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                        placeholder="name@company.com"
                      />
                    </div>
                    <div className="space-y-3">
                      <label htmlFor="company" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                        Company / Organisation <span className="text-[hsl(var(--brand-pink))]">*</span>
                      </label>
                      <input 
                        type="text" 
                        id="company"
                        name="company"
                        value={formData.company}
                        onChange={handleChange}
                        required
                        className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                        placeholder="Your organisation name"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="role" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                      Role / Title
                    </label>
                    <input 
                      type="text" 
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                      placeholder="e.g. Head of Operations"
                    />
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="processArea" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block">
                      Process area <span className="text-[hsl(var(--brand-pink))]">*</span>
                    </label>
                    <select
                      id="processArea"
                      name="processArea"
                      value={formData.processArea}
                      onChange={handleChange}
                      required
                      className="w-full bg-transparent border-b border-border pb-3 outline-none focus:border-foreground transition-colors text-sm"
                    >
                      <option value="">Select the closest fit</option>
                      <option value="Agentic enterprise transformation">Agentic enterprise transformation</option>
                      <option value="Data and AI foundations">Data and AI foundations</option>
                      <option value="Engineering with AI">Engineering with AI</option>
                      <option value="Sovereign and regulated AI">Sovereign and regulated AI</option>
                      <option value="Digital AI workforce">Digital AI workforce</option>
                      <option value="Not sure yet">Not sure yet</option>
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label htmlFor="processContext" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground block flex justify-between">
                      <span>The process under pressure <span className="text-[hsl(var(--brand-pink))]">*</span></span>
                      <span className="font-normal opacity-50 lowercase tracking-normal">20–2,000 characters</span>
                    </label>
                    <textarea 
                      id="processContext"
                      name="processContext"
                      value={formData.processContext}
                      onChange={handleChange}
                      rows={4}
                      minLength={20}
                      maxLength={2000}
                      required
                      className="w-full bg-[hsl(var(--secondary))] border border-border p-4 outline-none focus:border-foreground transition-colors text-sm resize-none"
                      placeholder="Where does the work get stuck? What decisions, data or hand-offs are constraining the outcome?"
                    />
                  </div>

                  <div className="pt-6">
                    <label className="mb-6 flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={formData.consent}
                        onChange={(event) =>
                          setFormData((previous) => ({
                            ...previous,
                            consent: event.target.checked,
                          }))
                        }
                        required
                        className="mt-0.5 h-4 w-4 accent-[hsl(var(--brand-pink))]"
                      />
                      <span>I agree that Cognirise may contact me about this request.</span>
                    </label>
                    <input
                      type="text"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                      className="absolute left-[-9999px]"
                    />
                    <button 
                      type="submit"
                      disabled={submitEnquiry.isPending}
                      className="group relative inline-flex min-h-[50px] w-full md:w-auto items-center justify-between md:justify-start gap-8 overflow-hidden bg-[linear-gradient(105deg,hsl(var(--brand-violet)),hsl(var(--brand-pink)),hsl(var(--brand-coral)))] pl-6 pr-2 text-sm font-bold text-white transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[6px_6px_0px_hsl(var(--brand-deep))]"
                    >
                      <span className="relative z-10">
                        {submitEnquiry.isPending ? "Submitting..." : "Submit request"}
                      </span>
                      <div className="relative z-10 flex h-9 w-9 items-center justify-center bg-white/20 transition-transform duration-300 group-hover:bg-white group-hover:text-foreground">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="py-12 border-t border-b border-border">
                <CheckCircle2 className="w-12 h-12 text-[hsl(var(--brand-pink))] mb-6" />
                <h2 className="text-3xl md:text-4xl font-semibold mb-4 tracking-tight">Request received.</h2>
                <p className="text-muted-foreground mb-8 max-w-[400px]">
                  Thank you. Our team will review the details and contact you shortly to arrange the working session.
                </p>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                >
                  Submit another request
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Image Side */}
        <section className="order-1 lg:order-2 h-[35vh] lg:h-auto min-h-[300px] relative bg-[hsl(var(--brand-deep))] clip-diagonal-left lg:clip-diagonal-none lg:clip-path-none">
          <img 
            src="/images/cognirise/cognirise-pulse-people.jpg" 
            alt="Colleagues standing together under flowing architectural light." 
            className="absolute inset-0 h-full w-full object-cover object-[center_60%] lg:object-center opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-l from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-80 lg:opacity-60" />
          
          <div className="absolute inset-0 hidden lg:flex flex-col justify-end p-12 text-white">
            <div className="max-w-[450px]">
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-4">
                What to expect
              </span>
              <h3 className="text-3xl lg:text-[40px] leading-tight font-semibold mb-6">
                A route, not a pitch.
              </h3>
              <ul className="space-y-4 text-sm text-white/80">
                <li className="flex gap-4 border-b border-white/20 pb-4">
                  <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest font-semibold mt-1">01</span>
                  We confirm the operational and technical constraints.
                </li>
                <li className="flex gap-4 border-b border-white/20 pb-4">
                  <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest font-semibold mt-1">02</span>
                  We shape the governance boundaries required.
                </li>
                <li className="flex gap-4 pb-2">
                  <span className="text-[hsl(var(--brand-pink))] text-[10px] tracking-widest font-semibold mt-1">03</span>
                  You leave with a clear line of sight to a production build.
                </li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
