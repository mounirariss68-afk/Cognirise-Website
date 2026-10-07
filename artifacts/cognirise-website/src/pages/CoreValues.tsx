import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { assetUrl } from "@/lib/assets";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingText } from "@/lib/cms";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import "./CoreValues.css";

const valueOneLayers = [
  { id: "cv-v1-teamwork", k: "01 / 05", title: "Teamwork", body: "Work is shared, credit is shared, and problems are shared early. The question is never whose job it is. It is whether it gets done well." },
  { id: "cv-v1-understanding", k: "02 / 05", title: "Understanding", body: "Before we judge a colleague's decision or a client's constraint, we ask why it was made. Most friction disappears at that point, and what remains is worth the argument." },
  { id: "cv-v1-support", k: "03 / 05", title: "Support", body: "When someone is stretched, the people around them step in without being asked and without keeping score. That includes the founders." },
  { id: "cv-v1-politics", k: "04 / 05", title: "Zero tolerance for politics", body: "No side channels, no managing upward at a colleague's expense, no taking credit for someone else's work. We hire for this, and we part ways over it." },
  { id: "cv-v1-stewardship", k: "05 / 05", title: "Stewardship of client success", body: "The value does not stop at our own walls. We care whether a client's programme works after we have left, not only whether our engagement closed well. It is why the client owns everything we build, why we say so when we think a piece of work will not land, and why we would rather show a working prototype in 48 hours than ask anyone to decide on a slide." },
];

const valueTwoLayers = [
  { id: "cv-v2-fairness", k: "01 / 04", title: "Fairness", body: "One standard for everyone: colleagues, clients, partners, suppliers and candidates. Decisions about people are made on the work, not on who they know or where they come from." },
  { id: "cv-v2-honesty", k: "02 / 04", title: "Honesty", body: "We say what we believe the answer is, including when it is not the answer the client hoped for, and including when the honest answer is that they do not need us." },
  { id: "cv-v2-transparency", k: "03 / 04", title: "Transparency", body: "Clients see how we work, what things cost and why, what we found and what we did not. When something cannot be shared, we say that it cannot, and where we can, we say why." },
  { id: "cv-v2-produces", k: "04 / 04", title: "What it produces", body: "Partnerships, friendships and trusted-advisor relationships that have lasted more than twenty-five years. Relationships of that length are not built on contracts. They are built on people knowing where they stand." },
];

const expectations = [
  { id: "cv-test-1", k: "01 / 04", text: "You hear the bad news from us first, and early." },
  { id: "cv-test-2", k: "02 / 04", text: "The people who sell the work are the people who do it. Leadership, engineering and accountability stay in the same room." },
  { id: "cv-test-3", k: "03 / 04", text: "You own what we build. Nothing is withheld to keep you dependent on us." },
  { id: "cv-test-4", k: "04 / 04", text: "If we think you are about to spend money on the wrong thing, we say so, even when the right thing is smaller, or is not us." },
];

type Layer = { id: string; k: string; title: string; body: string };

function LayerLedger({ layers, testPrefix }: { layers: Layer[]; testPrefix: string }) {
  return (
    <ol className="cv-ledger">
      {layers.map((layer, index) => (
        <li key={layer.id} className={`cv-layer${index === layers.length - 1 ? " cv-layer--keystone" : ""}`} data-testid={`${testPrefix}-${index + 1}`}>
          <span className="cv-layer-k">{layer.k}</span>
          <h4>{layer.title}</h4>
          <p>{layer.body}</p>
        </li>
      ))}
    </ol>
  );
}

export default function CoreValues() {
  const g = useGovernedLanding();

  const heroEyebrow = landingText(g, "core-values-hero-eyebrow", "About · Core Values");
  const heroHeading = landingText(g, "core-values-hero-heading", "Two values. Held for decades.");
  const heroBody = landingText(g, "core-values-hero-body", "Neither of them was chosen in a workshop. The founders of Cognirise lived by the first long before this firm existed, and each of them made the second a personal promise long ago. This page says what they mean in practice, so that you can hold us to them.");
  const heroPanelLead = landingText(g, "core-values-hero-panel-lead", "We succeed because we");
  const heroPanelAccent = landingText(g, "core-values-hero-panel-accent", "help each other succeed.");

  const founderEyebrow = landingText(g, "core-values-founder-eyebrow", "01 / A message from our founders");
  const founderTitle = landingText(g, "core-values-founder-title", "Why only two.");
  const founderIntro = landingText(g, "core-values-founder-intro", "Most firms publish a list of values. We publish the two we have actually lived by, because those are the ones you can hold us to.");
  const mounirPortrait = landingMedia(g, "core-values-portrait-mounir", { src: assetUrl("/images/cognirise/people/mounir-ariss.jpg"), alt: "Mounir Ariss, CEO and Co-founder of Cognirise" });
  const bulentPortrait = landingMedia(g, "core-values-portrait-bulent", { src: assetUrl("/images/cognirise/people/bulent-egrilmez-20261007.jpg"), alt: "Bülent Eğrilmez, CTO and Co-founder of Cognirise" });
  const mounirName = landingText(g, "core-values-founder-mounir-name", "Mounir Ariss");
  const mounirRole = landingText(g, "core-values-founder-mounir-role", "CEO & Co-founder");
  const bulentName = landingText(g, "core-values-founder-bulent-name", "Bülent Eğrilmez");
  const bulentRole = landingText(g, "core-values-founder-bulent-role", "CTO & Co-founder");
  const founderAside = landingText(g, "core-values-founder-aside", "The founders of Cognirise worked together at Peppers & Rogers Group before founding this firm. The values on this page are the ones they brought with them.");

  const opening = landingText(g, "core-values-letter-opening", "People stay when they know where they stand.");
  const p1a = landingText(g, "core-values-letter-p1-lead", "The first of our values comes from the Peppers & Rogers Group, where all of us worked earlier in our careers. The phrase we used there was simple:");
  const p1b = landingText(g, "core-values-letter-p1-emphasis", "we succeed because we help each other succeed.");
  const p1c = landingText(g, "core-values-letter-p1-rest", "It was not a slogan on a wall. It was how the firm ran. Nobody got ahead by making a colleague look bad. When someone was struggling on an engagement, the people around them stepped in without being asked and without keeping score. Politics had no oxygen.");
  const p2 = landingText(g, "core-values-letter-p2", "The same instinct carried through to our clients. We cared whether they succeeded, not only whether the engagement closed, and that gave us a sense of stewardship over their work that none of us has lost. We still think of client work as something we are entrusted with rather than something we are paid for.");
  const p3a = landingText(g, "core-values-letter-p3-lead", "The second value is personal to each of us. We have all seen a great deal of unfair and biased treatment over the years, of people and of organisations, and we each made ourselves the same promise long ago: to do everything in our power to be");
  const p3b = landingText(g, "core-values-letter-p3-emphasis", "fair in how we treat others, honest in our dealings, and transparent to the extent possible.");
  const p3c = landingText(g, "core-values-letter-p3-rest", "That promise has driven most of what we have done since. It is also the reason some of our partnerships, friendships and client relationships have now lasted more than twenty-five years.");
  const p4 = landingText(g, "core-values-letter-p4", "We built Cognirise on these two values because they are the ones we know how to keep. Everything else on this site, from how we price work to what we build and who owns it afterwards, follows from them.");
  const signName = landingText(g, "core-values-letter-sign-name", "The founders of Cognirise");
  const signRoles = landingText(g, "core-values-letter-sign-roles", "Mounir Ariss, CEO & Co-founder · Bülent Eğrilmez, CTO & Co-founder");

  const valuesEyebrow = landingText(g, "core-values-values-eyebrow", "02 / The values");
  const valuesTitle = landingText(g, "core-values-values-title", "What we mean, in practice.");
  const valuesIntro = landingText(g, "core-values-values-intro", "Each value has several layers. The layers are the point: a value that cannot be tested against behaviour is a slogan.");
  const v1Title = landingText(g, "core-values-value-1-title", "We succeed because we help each other succeed.");
  const v1Stand = landingText(g, "core-values-value-1-stand", "Nobody at Cognirise wins alone, and no client is left to carry an outcome alone. This is the value the founders have held longest, and it has five layers.");
  const v2Title = landingText(g, "core-values-value-2-title", "Fair, honest and transparent.");
  const v2Stand = landingText(g, "core-values-value-2-stand", "Fair in how we treat people. Honest in our dealings. Transparent to the extent possible. The last three words are deliberate: where we cannot be open, we say so, rather than pretending there is nothing to say.");

  const v1 = valueOneLayers.map((layer) => ({
    id: layer.id, k: layer.k,
    title: landingText(g, `${layer.id}-title`, layer.title),
    body: landingText(g, `${layer.id}-body`, layer.body),
  }));
  const v2 = valueTwoLayers.map((layer) => ({
    id: layer.id, k: layer.k,
    title: landingText(g, `${layer.id}-title`, layer.title),
    body: landingText(g, `${layer.id}-body`, layer.body),
  }));
  const tests = expectations.map((test) => ({ id: test.id, k: test.k, text: landingText(g, test.id, test.text) }));

  const testsEyebrow = landingText(g, "core-values-tests-eyebrow", "03 / Hold us to them");
  const testsTitle = landingText(g, "core-values-tests-title", "What you can expect from us.");
  const testsIntro = landingText(g, "core-values-tests-intro", "Values that cannot be tested against behaviour are decoration. These are the tests.");
  const testsClose = landingText(g, "core-values-tests-close", "If we fall short of any of these, tell a founder directly. Our names are on the");
  const teamPageLink = landingCta(g, "core-values-tests-team-link", { label: "team page", href: "/about" });

  const ctaHeadingA = landingText(g, "core-values-cta-heading-line-1", "Meet the people");
  const ctaHeadingB = landingText(g, "core-values-cta-heading-line-2", "behind these values.");
  const teamCta = landingCta(g, "core-values-cta-team", { label: "Meet the team", href: "/about" });
  const contactCta = landingCta(g, "core-values-cta-contact", { label: "Contact us", href: "/contact" });

  const founders = [
    { key: "mounir", initials: "MA", name: mounirName, role: mounirRole, portrait: mounirPortrait, pos: "50% 25%" },
    { key: "bulent", initials: "BE", name: bulentName, role: bulentRole, portrait: bulentPortrait, pos: "50% 50%" },
  ];

  return (
    <main className="cv overflow-hidden bg-background">
      {/* HERO */}
      <section className="cv-hero" aria-labelledby="cv-title">
        <div className="cv-hero-glow" aria-hidden="true" />
        <div className="public-hero-shell cv-hero-grid">
          <div className="cv-hero-copy">
            <div>
              <NavigationBackControl embedded className="mb-5 [&_button]:text-white/70 [&_button:hover]:text-white" />
              <p data-hero-content-edge className="cv-eyebrow cv-eyebrow--dark cv-rule">{heroEyebrow}</p>
            </div>
            <div>
              <h1 id="cv-title" data-governed-landing={g?.pagePath} data-cms-slot="core-values-hero-heading" data-testid="text-core-values-heading">{heroHeading}</h1>
              <p className="cv-lede" data-cms-slot="core-values-hero-body">{heroBody}</p>
            </div>
          </div>
          <figure className="cv-panel" aria-label={`${heroPanelLead} ${heroPanelAccent}`}>
            <span className="cv-panel-corner" aria-hidden="true" />
            <span className="cv-panel-mark" aria-hidden="true">01</span>
            <blockquote><p>{heroPanelLead} <em>{heroPanelAccent}</em></p></blockquote>
          </figure>
        </div>
      </section>

      {/* FOUNDERS LETTER */}
      <section className="cv-section" aria-labelledby="cv-founder-title">
        <div className="cv-wrap">
          <header className="cv-head">
            <div>
              <p className="cv-eyebrow">{founderEyebrow}</p>
              <h2 id="cv-founder-title">{founderTitle}</h2>
            </div>
            <p className="cv-intro">{founderIntro}</p>
          </header>

          <div className="cv-founder">
            <aside className="cv-founder-rail" aria-label="Authors">
              <ul className="cv-founders">
                {founders.map((f, i) => (
                  <li key={f.key} className={`cv-founder-card cv-founder-card--${i}`} data-testid={`card-founder-${f.key}`}>
                    <div className="cv-portrait">
                      <span className="cv-initials" aria-hidden="true">{f.initials}</span>
                      <img data-pulse-image-resilient="true" src={f.portrait.src} alt={f.portrait.alt} style={{ objectPosition: f.pos }} loading="lazy" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                    </div>
                    <p className="cv-role">{f.role}</p>
                    <p className="cv-name">{f.name}</p>
                  </li>
                ))}
              </ul>
              <p className="cv-aside">{founderAside}</p>
            </aside>

            <article className="cv-letter" aria-labelledby="cv-letter-opening">
              <p id="cv-letter-opening" className="cv-opening">{opening}</p>
              <p className="cv-dropcap">{p1a} <strong>{p1b}</strong> {p1c}</p>
              <p>{p2}</p>
              <p>{p3a} <strong>{p3b}</strong> {p3c}</p>
              <p>{p4}</p>
              <footer className="cv-sign">
                <p className="cv-sign-name">{signName}</p>
                <p className="cv-sign-roles">{signRoles}</p>
              </footer>
            </article>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="cv-section cv-section--alt" aria-labelledby="cv-values-title">
        <div className="cv-wrap">
          <header className="cv-head">
            <div>
              <p className="cv-eyebrow">{valuesEyebrow}</p>
              <h2 id="cv-values-title">{valuesTitle}</h2>
            </div>
            <p className="cv-intro">{valuesIntro}</p>
          </header>

          <article className="cv-value" aria-labelledby="cv-value-1">
            <div className="cv-value-top">
              <p className="cv-num" aria-hidden="true">01</p>
              <h3 id="cv-value-1">{v1Title}</h3>
              <p className="cv-stand">{v1Stand}</p>
            </div>
            <LayerLedger layers={v1} testPrefix="layer-value-1" />
          </article>

          <article className="cv-value" aria-labelledby="cv-value-2">
            <div className="cv-value-top">
              <p className="cv-num" aria-hidden="true">02</p>
              <h3 id="cv-value-2">{v2Title}</h3>
              <p className="cv-stand">{v2Stand}</p>
            </div>
            <LayerLedger layers={v2} testPrefix="layer-value-2" />
          </article>
        </div>
      </section>

      {/* HOLD US TO THEM */}
      <section className="cv-section" aria-labelledby="cv-tests-title">
        <div className="cv-wrap">
          <header className="cv-head">
            <div>
              <p className="cv-eyebrow">{testsEyebrow}</p>
              <h2 id="cv-tests-title">{testsTitle}</h2>
            </div>
            <p className="cv-intro">{testsIntro}</p>
          </header>
          <ol className="cv-tests">
            {tests.map((t, i) => (
              <li key={t.id} className="cv-test" data-testid={`text-expectation-${i + 1}`}>
                <span className="cv-count">{t.k}</span>
                <p>{t.text}</p>
              </li>
            ))}
          </ol>
          <p className="cv-tests-close">
            {testsClose} <Link href={teamPageLink.href} className="cv-inline-link" data-testid="link-core-values-team-page">{teamPageLink.label}</Link>.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="cv-cta" aria-labelledby="cv-cta-title">
        <div className="cv-wrap cv-cta-grid">
          <h2 id="cv-cta-title">{ctaHeadingA}<br />{ctaHeadingB}</h2>
          <div className="cv-actions">
            <Link href={teamCta.href} className="cv-btn" data-testid="link-core-values-meet-team">{teamCta.label} <ArrowRight size={18} aria-hidden="true" /></Link>
            <Link href={contactCta.href} className="cv-link-plain" data-testid="link-core-values-contact">{contactCta.label}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
