import { SignIn } from "@clerk/react";

export default function AdminSignIn() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <main className="admin-theme relative min-h-[100dvh] overflow-hidden bg-[hsl(var(--brand-deep))] px-5 py-10 text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(circle at 16% 18%, hsl(var(--brand-violet) / 0.34), transparent 30%), radial-gradient(circle at 82% 78%, hsl(var(--brand-coral) / 0.22), transparent 28%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full border border-white/10"
        aria-hidden="true"
      />
      <div className="relative mx-auto grid min-h-[calc(100dvh-5rem)] w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_auto]">
        <section className="max-w-2xl">
          <p className="mb-7 text-sm font-bold uppercase tracking-[0.24em] text-[hsl(var(--brand-coral))]">
            Cognirise Pulse
          </p>
          <h1 className="max-w-xl font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Governed publishing, without the noise.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/65 sm:text-lg">
            Manage market editions, approvals, revisions, media, and editorial
            assistance from one controlled workspace.
          </p>
          <div className="mt-10 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
            <span className="rounded-full border border-white/10 px-4 py-2">UAE canonical</span>
            <span className="rounded-full border border-white/10 px-4 py-2">Immutable history</span>
            <span className="rounded-full border border-white/10 px-4 py-2">Role governed</span>
          </div>
        </section>
        <section className="flex justify-center lg:justify-end" aria-label="Management console sign in">
          <SignIn
            routing="path"
            path={`${basePath}/admin/sign-in`}
            fallbackRedirectUrl={`${basePath}/admin`}
          />
        </section>
      </div>
    </main>
  );
}
