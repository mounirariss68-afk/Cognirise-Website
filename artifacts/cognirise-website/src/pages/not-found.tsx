import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <section className="relative isolate min-h-[70vh] overflow-hidden bg-[hsl(var(--brand-deep))] px-6 py-24 text-white md:px-12 md:py-32">
      <div className="absolute inset-y-0 right-[-4vw] -z-10 font-display text-[42vw] font-semibold leading-[0.8] text-white/[0.035]">
        4
      </div>
      <div className="mx-auto flex min-h-[45vh] w-full max-w-[1440px] flex-col justify-between gap-16">
        <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/55">
          404 / Route not found
        </div>
        <div>
          <h1 className="max-w-[850px] text-5xl font-semibold leading-[0.94] md:text-7xl lg:text-[104px]">
            This route has not moved with us.
          </h1>
          <p className="mt-8 max-w-[500px] text-base leading-relaxed text-white/70 md:text-lg">
            The page may have changed location. Return to the Cognirise
            homepage and continue from there.
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-3 border-b border-white/70 pb-2 text-sm font-semibold transition-colors hover:border-[hsl(var(--brand-coral))] hover:text-[hsl(var(--brand-coral))]"
          >
            <ArrowLeft className="h-4 w-4" />
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
