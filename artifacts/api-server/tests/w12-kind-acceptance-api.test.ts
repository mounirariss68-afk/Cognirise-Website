import assert from "node:assert/strict";
import test from "node:test";
import {
  CreateDocumentBody,
  UpdateDocumentBody,
  cmsDocumentKinds,
  collectCmsMediaReferences,
  validateCmsSnapshot,
  type CmsDocumentKind,
} from "@workspace/api-zod";
import { previewMediaIds } from "../src/routes/documents.ts";

const ids = {
  person: {
    asset: "00000000-0000-4000-8000-000000000101",
    version: "00000000-0000-4000-8000-000000000102",
  },
  partner: {
    asset: "00000000-0000-4000-8000-000000000111",
    version: "00000000-0000-4000-8000-000000000112",
  },
  platform: {
    asset: "00000000-0000-4000-8000-000000000121",
    version: "00000000-0000-4000-8000-000000000122",
  },
  publication: {
    hero: "00000000-0000-4000-8000-000000000131",
    heroVersion: "00000000-0000-4000-8000-000000000132",
    pdf: "00000000-0000-4000-8000-000000000133",
    pdfVersion: "00000000-0000-4000-8000-000000000134",
    social: "00000000-0000-4000-8000-000000000135",
    socialVersion: "00000000-0000-4000-8000-000000000136",
  },
  caseStudy: {
    asset: "00000000-0000-4000-8000-000000000141",
    version: "00000000-0000-4000-8000-000000000142",
  },
  industry: {
    hero: "00000000-0000-4000-8000-000000000151",
    heroVersion: "00000000-0000-4000-8000-000000000152",
    supporting: "00000000-0000-4000-8000-000000000153",
    supportingVersion: "00000000-0000-4000-8000-000000000154",
  },
  framework: {
    asset: "00000000-0000-4000-8000-000000000161",
    version: "00000000-0000-4000-8000-000000000162",
  },
  siteConfiguration: {
    poster: "00000000-0000-4000-8000-000000000171",
    posterVersion: "00000000-0000-4000-8000-000000000172",
    mp4: "00000000-0000-4000-8000-000000000173",
    mp4Version: "00000000-0000-4000-8000-000000000174",
    webm: "00000000-0000-4000-8000-000000000175",
    webmVersion: "00000000-0000-4000-8000-000000000176",
  },
  landing: {
    asset: "00000000-0000-4000-8000-000000000181",
    version: "00000000-0000-4000-8000-000000000182",
  },
} as const;

const source = {
  label: "W12 representative source",
  url: "https://example.com/w12-source",
  accessedAt: "2026-10-01",
};

const governance = {
  visibility: "public",
  order: 1,
  sources: [source],
  verificationDate: "2026-10-01",
  reviewDate: "2027-01-01",
  relatedIds: [],
};

const ref = (
  mediaId: string,
  mediaVersionId: string,
  role: "identity" | "logo" | "hero" | "supporting" | "background" | "icon" | "og-image" | "document",
  altText = "Representative W12 media",
) => ({ mediaId, mediaVersionId, role, altText });

const richBlocks = [
  { type: "heading", level: 2, text: "A governed heading" },
  { type: "paragraph", text: "A representative paragraph with exact punctuation." },
  { type: "list", style: "numbered", items: ["First item", "Second item"] },
  { type: "quote", text: "A representative quotation.", attribution: "W12 fixture editor" },
];

const caseEvidence = [{
  statement: "The representative workflow was reviewed against the fixture source.",
  source,
  approved: true,
}];

type Fixture = {
  kind: CmsDocumentKind;
  slug: string;
  title: string;
  summary: string;
  content: Record<string, unknown>;
  markets: string[];
  clearPath?: string;
  publishable: boolean;
};

const fixtures: Record<CmsDocumentKind, Fixture> = {
  person: {
    kind: "person",
    slug: "w12-person",
    title: "W12 Person",
    summary: "A representative person fixture.",
    clearPath: "biography",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      role: "leader",
      title: "Practice Lead",
      biography: "A complete representative biography.",
      contribution: "A representative contribution.",
      focusAreas: [{ title: "Governance", detail: "Build bounded, evidenced capability." }],
      profileLinks: [{ label: "Profile", url: "https://example.com/w12-person" }],
      identityMedia: ref(ids.person.asset, ids.person.version, "identity", "W12 person identity"),
      approvedFallback: "initials",
      ...governance,
    },
  },
  partner: {
    kind: "partner",
    slug: "w12-partner",
    title: "W12 Partner",
    summary: "A representative partner fixture.",
    clearPath: "contribution",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      allianceCategory: "Delivery partner",
      positioning: "A partner that strengthens governed delivery.",
      facts: [{ value: "Regional", label: "Delivery coverage" }],
      evidence: caseEvidence,
      coverage: ["UAE", "KSA"],
      contribution: "A representative partner contribution.",
      website: "https://example.com/w12-partner",
      logoMedia: ref(ids.partner.asset, ids.partner.version, "logo", "W12 partner logo"),
      relationshipStatus: "active",
      ...governance,
    },
  },
  platform: {
    kind: "platform",
    slug: "w12-platform",
    title: "W12 Platform",
    summary: "A representative platform fixture.",
    clearPath: "cta",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      category: "Specialist",
      summary: "A governed platform summary.",
      heroMedia: ref(ids.platform.asset, ids.platform.version, "hero", "W12 platform hero"),
      template: "standard",
      sections: [{ heading: "Platform section", body: richBlocks }],
      capabilities: ["Bounded automation", "Evidence capture"],
      differentiators: ["Human approval", "Versioned delivery"],
      cta: { label: "Explore the platform", href: "/platforms/w12-platform" },
      ...governance,
    },
  },
  publication: {
    kind: "publication",
    slug: "w12-publication",
    title: "W12 Publication",
    summary: "A representative publication fixture.",
    clearPath: "updatedDate",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "A representative publication teaser.",
      body: richBlocks,
      author: "Editorial practice",
      publicationDate: "2026-10-01",
      updatedDate: "2026-10-02",
      readingTimeMinutes: 5,
      topics: ["governance"],
      sectors: ["Public Sector"],
      platformIds: [],
      heroMedia: ref(ids.publication.hero, ids.publication.heroVersion, "hero", "W12 publication hero"),
      pdfMedia: ref(ids.publication.pdf, ids.publication.pdfVersion, "document", "W12 publication PDF"),
      social: {
        title: "W12 social title",
        description: "W12 social description",
        imageMedia: ref(ids.publication.social, ids.publication.socialVersion, "og-image", "W12 social image"),
      },
      ...governance,
    },
  },
  "case-study": {
    kind: "case-study",
    slug: "w12-case-study",
    title: "W12 Case Study",
    summary: "An anonymized representative case-study summary.",
    clearPath: "context",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      variant: "full",
      disclosure: "anonymized",
      sector: "Manufacturing & Industrial",
      organizationDescriptor: "An industrial operator",
      engagementType: "client-delivery",
      deliveryStage: "production",
      impactClassification: "observed",
      impactStatement: "The governed workflow improved the documented operating path.",
      disclosureNote: "Identity and interface values are withheld.",
      publicEvidenceStatus: "approved",
      relatedIndustries: ["energy-resources"],
      visual: {
        kind: "illustrative-interface-reconstruction",
        caption: "Illustrative reconstruction using fixture data.",
        altText: "An anonymized operations console.",
        textEquivalent: "A workflow with a human approval gate.",
        template: "operations-console",
        fixtureLabels: ["Example site", "Sample incident"],
      },
      mandate: "Demonstrate a governed operating workflow.",
      context: "Representative context that may be explicitly cleared.",
      constraints: ["Human approval required"],
      work: richBlocks,
      controls: ["Approval gate"],
      outcomes: ["Documented workflow outcome"],
      evidence: caseEvidence,
      quote: { text: "A representative quote.", attribution: "Operations lead" },
      heroMedia: ref(ids.caseStudy.asset, ids.caseStudy.version, "hero", "W12 case-study hero"),
      cta: { label: "Discuss the workflow", href: "/contact" },
      ...governance,
    },
  },
  industry: {
    kind: "industry",
    slug: "w12-industry",
    title: "W12 Industry",
    summary: "A representative industry fixture.",
    clearPath: "heroMedia",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      legacyPath: "/industries/w12-industry",
      name: "W12 Industry",
      shortName: "W12",
      thesis: "A governed industry thesis.",
      accent: "Governed momentum.",
      dek: "A concise industry summary.",
      opportunity: "Create measurable value from a priority operating constraint.",
      capabilities: [
        { title: "Agentic platform", body: "Build bounded agents connected to production workflows." },
        { title: "Responsible delivery", body: "Embed evidence, oversight and controls in delivery." },
      ],
      selectedWork: { description: "Show the mandate, boundary and evidenced outcome." },
      image: "/images/w12-industry.png",
      imageAlt: "A representative industry scene.",
      variant: "ledger",
      pressures: [
        { title: "One", body: "First operating pressure." },
        { title: "Two", body: "Second operating pressure." },
        { title: "Three", body: "Third operating pressure." },
      ],
      reversal: { title: "A reversal", body: "A documented consequence." },
      myth: { claim: "A claim", verdict: "A governed verdict." },
      gcc: "A specific regional context.",
      service: { label: "AI Platforms", href: "/what-we-do", firstMove: "Map one decision." },
      uses: [{
        use: "Priority workflow",
        description: "A representative use.",
        evidence: "Measured evidence",
        boundary: "Human approval",
        sourceUrls: [source.url],
      }],
      sources: [{
        label: "Official guidance",
        publisher: "Public authority",
        kind: "Official source",
        url: source.url,
        accessedAt: source.accessedAt,
      }],
      heroMedia: ref(ids.industry.hero, ids.industry.heroVersion, "hero", "W12 industry hero"),
      supportingMedia: [ref(ids.industry.supporting, ids.industry.supportingVersion, "supporting", "W12 industry support")],
      verificationDate: "2026-10-01",
      reviewDate: "2027-01-01",
      visibility: "public",
      order: 1,
      relatedIds: [],
    },
  },
  framework: {
    kind: "framework",
    slug: "w12-framework",
    title: "W12 Framework",
    summary: "A representative framework fixture.",
    clearPath: "cta",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      template: "agent-authority",
      teaser: "Govern each handover according to its exposure.",
      handoverExplanation: "Knowledge, Decision and Action describe individual handovers.",
      methodology: richBlocks,
      workedExample: {
        sector: "Travel & hospitality",
        title: "Passenger re-accommodation",
        handover: "action",
        reversibility: "R3",
        reach: "H2",
        exposureBand: "E2",
        oversight: "On the loop, with a stated intervention window",
        detail: "The duty manager owns the handover.",
        requestedAuthority: "on-loop",
        interventionWindow: "Before released-seat inventory expires.",
        accountableRole: "Duty Manager, Operations Control Centre",
        promotionEvidence: "An approved body of clean rebookings.",
        automaticDemotion: "Any involuntary downgrade.",
      },
      sectorExamples: [],
      heroMedia: ref(ids.framework.asset, ids.framework.version, "hero", "W12 framework hero"),
      cta: { label: "Apply the framework", href: "/contact" },
      ...governance,
    },
  },
  office: {
    kind: "office",
    slug: "w12-office",
    title: "W12 Office",
    summary: "A representative office fixture.",
    clearPath: "phone",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      city: "Dubai",
      address: "Office 1914, The Binary, Business Bay, Dubai, UAE",
      phone: "+971 4 123 4567",
      ...governance,
    },
  },
  "site-configuration": {
    kind: "site-configuration",
    slug: "w12-site-hero",
    title: "W12 Site Hero",
    summary: "A representative site configuration fixture.",
    publishable: true,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      page: "homepage",
      hero: {
        posterMediaId: ids.siteConfiguration.poster,
        posterMediaVersionId: ids.siteConfiguration.posterVersion,
        sources: [
          {
            mediaId: ids.siteConfiguration.mp4,
            mediaVersionId: ids.siteConfiguration.mp4Version,
            mimeType: "video/mp4",
          },
          {
            mediaId: ids.siteConfiguration.webm,
            mediaVersionId: ids.siteConfiguration.webmVersion,
            mimeType: "video/webm",
          },
        ],
      },
    },
  },
  "landing-page": {
    kind: "landing-page",
    slug: "w12-about",
    title: "W12 About",
    summary: "A representative governed landing fixture.",
    clearPath: "cta",
    publishable: false,
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      pagePath: "/about",
      template: "landing",
      narrative: "A representative governed landing narrative.",
      sections: [
        { type: "narrative", id: "hero", order: 0, heading: "About", body: [{ type: "paragraph", text: "Hero narrative." }] },
        { type: "narrative", id: "about-advisory-body", order: 1, body: [{ type: "paragraph", text: "Advisory body." }] },
        { type: "narrative", id: "about-advisory-eyebrow", order: 2, body: [{ type: "paragraph", text: "Advisory eyebrow." }] },
        { type: "narrative", id: "about-advisory-title", order: 3, body: [{ type: "paragraph", text: "Advisory title." }] },
        { type: "cta", id: "about-closing-cta", order: 4, label: "Start a conversation", href: "/contact", style: "primary" },
        { type: "narrative", id: "about-closing-heading", order: 5, body: [{ type: "paragraph", text: "Closing heading." }] },
        { type: "narrative", id: "about-hero-body", order: 6, body: [{ type: "paragraph", text: "Hero body." }] },
        { type: "narrative", id: "about-hero-eyebrow", order: 7, body: [{ type: "paragraph", text: "Hero eyebrow." }] },
        { type: "narrative", id: "about-hero-heading", order: 8, body: [{ type: "paragraph", text: "Hero heading." }] },
        {
          type: "migration-media",
          id: "about-hero-visual",
          order: 9,
          sourcePath: "/images/w12-about.jpg",
          altText: "A representative about visual.",
          ownership: "compiled-landing",
          resolution: "unresolved",
        },
        { type: "narrative", id: "about-leadership-eyebrow", order: 10, body: [{ type: "paragraph", text: "Leadership eyebrow." }] },
        { type: "narrative", id: "about-leadership-title", order: 11, body: [{ type: "paragraph", text: "Leadership title." }] },
      ],
      cta: { label: "Contact the practice", href: "/contact", style: "secondary" },
      seo: { title: "W12 About", description: "W12 landing description", noIndex: false },
      legal: { disclaimer: "Representative fixture." },
      visualReferences: [ref(ids.landing.asset, ids.landing.version, "supporting", "W12 landing visual")],
      visibility: "public",
      order: 1,
      sources: [source],
      verificationDate: "2026-10-01",
      reviewDate: "2027-01-01",
      relatedIds: [],
    },
  },
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function clearOptionalFixture(fixture: Fixture): Record<string, unknown> {
  const content = clone(fixture.content);
  if (fixture.clearPath) delete content[fixture.clearPath];
  return content;
}

test("W12 parameterized fixtures round-trip every document kind through the shared runtime contract", () => {
  assert.deepEqual(Object.keys(fixtures).sort(), [...cmsDocumentKinds].sort());

  for (const kind of cmsDocumentKinds) {
    const fixture = fixtures[kind];
    const request = CreateDocumentBody.safeParse({
      kind,
      slug: fixture.slug,
      title: fixture.title,
      summary: fixture.summary,
      content: fixture.content,
      mediaIds: [],
      markets: fixture.markets,
    });
    assert.equal(request.success, true, `${kind} create request should parse`);

    const draft = validateCmsSnapshot(kind, {
      slug: fixture.slug,
      title: fixture.title,
      summary: fixture.summary,
      content: fixture.content,
      mediaIds: [],
      markets: fixture.markets,
    }, "draft");
    assert.equal(
      draft.success,
      true,
      `${kind} representative draft should validate: ${draft.success ? "" : draft.errors.join("; ")}`,
    );
    if (!draft.success) continue;
    assert.deepEqual(draft.data.content, fixture.content, `${kind} supported fields must survive validation`);
    assert.deepEqual(draft.data.markets, fixture.markets);

    const cleared = validateCmsSnapshot(kind, {
      slug: fixture.slug,
      title: fixture.title,
      summary: fixture.summary,
      content: clearOptionalFixture(fixture),
      mediaIds: [],
      markets: fixture.markets,
    }, "draft");
    assert.equal(
      cleared.success,
      true,
      `${kind} optional clear should remain saveable: ${cleared.success ? "" : cleared.errors.join("; ")}`,
    );

    const publication = validateCmsSnapshot(kind, {
      slug: fixture.slug,
      title: fixture.title,
      summary: fixture.summary,
      content: fixture.content,
      mediaIds: [],
      markets: fixture.markets,
    }, "publish");
    assert.equal(
      publication.success,
      fixture.publishable,
      `${kind} publication readiness must match the fixture disposition`,
    );
  }
});

test("W12 media references preserve immutable pins and route preview discovery for every kind", () => {
  for (const kind of cmsDocumentKinds) {
    const fixture = fixtures[kind];
    const references = collectCmsMediaReferences(kind, fixture.content);
    const previewIds = previewMediaIds({
      kind,
      content: fixture.content,
      mediaIds: [],
    }, kind);
    assert.deepEqual(
      new Set(previewIds),
      new Set(references.map((reference) => reference.mediaId)),
      `${kind} preview discovery must use every governed media location`,
    );
    for (const reference of references) {
      if (kind === "office") {
        assert.fail("Office intentionally has no media field; the empty reference set is checked below.");
      }
      assert.match(
        reference.mediaVersionId ?? "",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        `${kind} media reference must carry an exact immutable version`,
      );
    }
    if (kind === "office") assert.deepEqual(references, []);
  }
});

test("W12 explicit clear semantics remain available for all document update routes", () => {
  for (const kind of cmsDocumentKinds) {
    const parsed = UpdateDocumentBody.safeParse({
      market: "uae",
      locale: "en",
      revisionNumber: 1,
      seo: null,
    });
    assert.equal(parsed.success, true, `${kind} should accept explicit SEO clear`);
  }
});

test("W12 editor and publisher cannot mutate an unassigned market for any document kind", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://w12-route-fixture.invalid/cognirise";
  process.env.SESSION_SECRET = "w12-route-fixture-session-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date("2026-10-01T12:00:00Z");
  let role: "editor" | "publisher" = "editor";
  const touchedStatements: string[] = [];

  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "w12-session",
          token_digest: security.hashToken("w12-session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "w12-user",
          name: "W12 market editor",
          email: "w12-market-editor@example.com",
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: ["ksa"],
        }],
      };
    }
    touchedStatements.push(statement);
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => ({
    async query(sql: unknown) {
      const statement = String(sql);
      touchedStatements.push(statement);
      if (statement === "BEGIN" || statement === "ROLLBACK") return { rowCount: 0, rows: [] };
      if (statement.includes("SELECT id FROM cms_market_editions")) {
        return { rowCount: 1, rows: [{ id: "w12-edition" }] };
      }
      if (statement.includes("SELECT e.id,e.published_revision_id,e.content_mode")) {
        return {
          rowCount: 1,
          rows: [{
            id: "w12-edition",
            published_revision_id: null,
            content_mode: "custom",
            kind: "publication",
            revision_id: "w12-revision",
            revision_number: 1,
            workflow_state: "draft",
            payload: {},
          }],
        };
      }
      if (statement.includes("SELECT content_mode FROM cms_market_editions")) {
        return { rowCount: 1, rows: [{ content_mode: "custom" }] };
      }
      throw new Error(`unexpected SQL before market guard: ${statement.slice(0, 120)}`);
    },
    release() {},
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("w12-session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=w12-session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  for (const candidateRole of ["editor", "publisher"] as const) {
    role = candidateRole;
    for (const kind of cmsDocumentKinds) {
      const response = await fetch(`${origin}/api/documents/w12-${kind}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          market: "uae",
          locale: "en",
          revisionNumber: 1,
          content: fixtures[kind].content,
        }),
      });
      assert.equal(response.status, 403, `${candidateRole} must not save ${kind} outside assigned KSA`);
      assert.match((await response.json() as { error: string }).error, /not assigned|destinations/i);
    }
  }
  assert.equal(
    touchedStatements.some((statement) => statement.includes("INSERT INTO cms_revisions")),
    false,
    "the role/market guard must run before a revision mutation",
  );
});

test("W12 prioritized kinds save and reload through the actual document route", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://w12-lifecycle-fixture.invalid/cognirise";
  process.env.SESSION_SECRET = "w12-lifecycle-session-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date("2026-10-01T12:00:00Z");
  let currentKind: CmsDocumentKind = "partner";
  let currentPayload: Record<string, unknown> = {};
  let currentRevisionId = "w12-initial-revision";
  let currentRevisionNumber = 1;
  const mutationStatements: string[] = [];

  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "w12-session",
          token_digest: security.hashToken("w12-session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "w12-user",
          name: "W12 lifecycle editor",
          email: "w12-lifecycle-editor@example.com",
          role: "editor",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: ["uae"],
        }],
      };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) return { rowCount: 1, rows: [] };
    if (statement.includes("FROM cms_documents d") && statement.includes("WHERE d.id=$1")) {
      return {
        rowCount: 1,
        rows: [{
          id: "w12-document",
          kind: currentKind,
          canonical_slug: `w12-${currentKind}`,
          title: `W12 ${currentKind}`,
          owner_id: "w12-user",
          root_status: "active",
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          revision_id: currentRevisionId,
          revision_number: currentRevisionNumber,
          payload: currentPayload,
          workflow_state: "draft",
          publication_state: "draft",
          published_revision_id: null,
          publish_at: null,
          published_at: null,
          can_permanently_delete: true,
        }],
      };
    }
    mutationStatements.push(statement);
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => ({
    async query(sql: unknown, values: unknown[] = []) {
      const statement = String(sql);
      mutationStatements.push(statement);
      if (statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT id FROM cms_market_editions")) {
        return { rowCount: 1, rows: [{ id: "w12-edition" }] };
      }
      if (statement.includes("SELECT e.id,e.published_revision_id,e.content_mode")) {
        return {
          rowCount: 1,
          rows: [{
            id: "w12-edition",
            published_revision_id: null,
            content_mode: "custom",
            kind: currentKind,
            revision_id: currentRevisionId,
            revision_number: currentRevisionNumber,
            workflow_state: "draft",
            payload: currentPayload,
          }],
        };
      }
      if (statement.includes("SELECT content_mode FROM cms_market_editions")) {
        return { rowCount: 1, rows: [{ content_mode: "custom" }] };
      }
      if (statement.includes("INSERT INTO cms_revisions")) {
        currentPayload = values[1] as Record<string, unknown>;
        currentRevisionNumber += 1;
        currentRevisionId = `w12-saved-${currentKind}`;
        return { rowCount: 1, rows: [{ id: currentRevisionId, revision_number: currentRevisionNumber }] };
      }
      if (statement.includes("INSERT INTO cms_media_references")) return { rowCount: 1, rows: [] };
      // Unmanaged W12 fixtures must explicitly bypass the optional managed
      // market lifecycle bridge; do not let its binding lookup consume a
      // legacy fixture response intended for another query.
      if (
        statement.includes("FROM cms_market_edition_bindings binding")
        && statement.includes("JOIN market_editions destination")
        && (
          statement.includes("FOR UPDATE OF binding")
          || statement.includes("FOR KEY SHARE OF binding")
        )
      ) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("UPDATE cms_documents SET canonical_slug")) return { rowCount: 1, rows: [] };
      throw new Error(`unexpected lifecycle SQL: ${statement.slice(0, 140)}`);
    },
    release() {},
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("w12-session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=w12-session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  for (const kind of ["partner", "platform", "case-study", "framework"] as const) {
    currentKind = kind;
    currentPayload = {
      slug: fixtures[kind].slug,
      title: fixtures[kind].title,
      summary: fixtures[kind].summary,
      content: fixtures[kind].content,
      mediaIds: [],
      markets: fixtures[kind].markets,
    };
    currentRevisionId = `w12-initial-${kind}`;
    currentRevisionNumber = 1;
    const response = await fetch(`${origin}/api/documents/w12-document`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        market: "uae",
        locale: "en",
        revisionNumber: 1,
        content: fixtures[kind].content,
      }),
    });
    const body = await response.json() as {
      kind?: string;
      content?: Record<string, unknown>;
      revisionNumber?: number;
      currentRevisionId?: string;
      error?: string;
    };
    assert.equal(response.status, 200, `${kind}: ${JSON.stringify(body)}`);
    assert.equal(body.kind, kind);
    assert.deepEqual(body.content, fixtures[kind].content);
    assert.equal(body.revisionNumber, 2);
    assert.equal(body.currentRevisionId, `w12-saved-${kind}`);
  }
  assert.ok(
    mutationStatements.some((statement) => statement.includes("INSERT INTO cms_revisions")),
    "prioritized route coverage must exercise the shared revision save",
  );
});