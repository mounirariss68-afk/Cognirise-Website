import {defineArrayMember, defineField, defineType} from 'sanity'

const isString = (value: unknown): value is string => typeof value === 'string'

const baseGovernanceFields = [
  defineField({name: 'ownership', type: 'ownership', group: 'governance', validation: (Rule) => Rule.required()}),
  defineField({name: 'lifecycle', type: 'lifecycle', group: 'governance', validation: (Rule) => Rule.required()}),
]
const assistantContentClassField = defineField({
  name: 'assistantContentClass',
  title: 'AI processing classification',
  type: 'string',
  group: 'governance',
  options: {list: ['public', 'internal', 'restricted', 'personal', 'clientConfidential']},
  initialValue: 'public',
  validation: (Rule) => Rule.required(),
})
const assistantReviewField = defineField({
  name: 'assistantReview',
  type: 'object',
  group: 'governance',
  hidden: true,
  readOnly: true,
  fields: [
    defineField({name: 'requestId', type: 'string'}),
    defineField({name: 'fieldPath', type: 'string'}),
    defineField({name: 'appliedAt', type: 'datetime'}),
  ],
})
const governanceFields = [...baseGovernanceFields, assistantContentClassField, assistantReviewField]
const groups = [{name: 'content', title: 'Content', default: true}, {name: 'markets', title: 'Markets'}, {name: 'governance', title: 'Governance'}]
const marketEditions = defineField({
  name: 'marketEditions',
  title: 'Market editions',
  type: 'array',
  group: 'markets',
  description: 'Add UAE as canonical and every served market explicitly. Each edition publishes independently; silent fallback is prohibited.',
  of: [{type: 'marketEdition'}],
  validation: (Rule) => Rule.unique(),
})
const navigationEditions = defineField({
  name: 'marketEditions',
  title: 'Localized navigation editions',
  type: 'array',
  group: 'markets',
  description: 'Each served market must explicitly use canonical, fallback, override, or unavailable.',
  of: [{type: 'navigationEdition'}],
  validation: (Rule) => Rule.unique(),
})
const personEditions = defineField({
  name: 'marketEditions',
  title: 'Localized profile editions',
  type: 'array',
  group: 'markets',
  description: 'Local profile names, roles, and biographies only; page layout fields do not belong here.',
  of: [{type: 'personEdition'}],
  validation: (Rule) => Rule.unique(),
})
const organizationEditions = defineField({
  name: 'marketEditions',
  title: 'Localized organization editions',
  type: 'array',
  group: 'markets',
  description: 'Local organization names, descriptions, websites, and capabilities.',
  of: [{type: 'organizationEdition'}],
  validation: (Rule) => Rule.unique(),
})
const publicationEditions = defineField({
  name: 'marketEditions',
  title: 'Localized publication editions',
  type: 'array',
  group: 'markets',
  description: 'Local publication copy, route, and SEO with an independent market lifecycle.',
  of: [{type: 'publicationEdition'}],
  validation: (Rule) => Rule.unique(),
})

export const market = defineType({
  name: 'market',
  title: 'Market',
  type: 'document',
  fields: [
    defineField({name: 'name', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'code', type: 'string', description: 'Stable API code: uae, ksa, turkiye, europe.', validation: (Rule) => Rule.required().regex(/^(uae|ksa|turkiye|europe)$/)}),
    defineField({name: 'isCanonical', type: 'boolean', description: 'Only UAE may be canonical.', initialValue: false}),
    defineField({name: 'languages', type: 'array', of: [{type: 'string'}], validation: (Rule) => Rule.min(1)}),
    defineField({name: 'legalNotice', type: 'portableText'}),
  ],
  validation: (Rule) => Rule.custom((value) => value?.isCanonical && value.code !== 'uae' ? 'Only UAE can be canonical.' : true),
  preview: {select: {title: 'name', code: 'code', canonical: 'isCanonical'}, prepare: ({title, code, canonical}) => ({title, subtitle: `${code?.toUpperCase()}${canonical ? ' · canonical' : ''}`})},
})

const routeKinds = ['home', 'service', 'platform', 'industry', 'caseStudy', 'about', 'contact', 'landing', 'legal']
export const page = defineType({
  name: 'page',
  title: 'Route-aware page',
  type: 'document',
  groups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', description: 'Canonical UAE editorial title.', validation: (Rule) => Rule.required()}),
    defineField({name: 'routeKind', type: 'string', group: 'content', options: {list: routeKinds}, validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', type: 'slug', group: 'content', options: {source: 'title'}, description: 'Stable route segment; routeKind determines its route family.', validation: (Rule) => Rule.required()}),
    defineField({name: 'summary', type: 'text', rows: 3, group: 'content'}),
    defineField({name: 'topics', type: 'array', of: [{type: 'string'}], group: 'content'}),
    defineField({name: 'internalLinkSuggestions', title: 'Internal link suggestions', type: 'text', rows: 4, group: 'content', readOnly: true}),
    defineField({name: 'sections', type: 'array', group: 'content', description: 'Use only these design-system-approved modules.', of: ['heroSection', 'richTextSection', 'claimSection', 'metricSection', 'quoteSection', 'referenceGridSection', 'mediaSection', 'timelineSection', 'comparisonSection', 'ctaSection', 'faqSection', 'downloadGateSection', 'formSlotSection'].map((type) => defineArrayMember({type}))}),
    defineField({name: 'seo', type: 'seo', group: 'content'}),
    marketEditions,
    ...governanceFields,
  ],
  preview: {select: {title: 'title', slug: 'slug.current', state: 'lifecycle.state'}, prepare: ({title, slug, state}) => ({title, subtitle: `/${slug || ''} · ${state || 'draft'}`})},
})

export const navigation = defineType({
  name: 'navigation', title: 'Navigation', type: 'document', groups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'placement', type: 'string', group: 'content', options: {list: ['primary', 'utility', 'footer']}, validation: (Rule) => Rule.required()}),
    defineField({name: 'items', type: 'array', group: 'content', of: [{type: 'link'}], validation: (Rule) => Rule.min(1)}),
    navigationEditions, ...governanceFields,
  ],
  preview: {select: {title: 'title', placement: 'placement', state: 'lifecycle.state'}, prepare: ({title, placement, state}) => ({title, subtitle: `${placement || 'navigation'} · ${state || 'draft'}`})},
})

export const redirect = defineType({
  name: 'redirect', title: 'Redirect', type: 'document', groups,
  fields: [
    defineField({name: 'sourcePath', type: 'string', group: 'content', description: 'Path only, beginning with /. No query string.', validation: (Rule) => Rule.required().regex(/^\/(?!\/)/)}),
    defineField({name: 'destinationPath', type: 'string', group: 'content', validation: (Rule) => Rule.required().regex(/^\/(?!\/)/)}),
    defineField({name: 'statusCode', type: 'number', group: 'content', options: {list: [301, 302, 307, 308]}, initialValue: 308, validation: (Rule) => Rule.required()}),
    defineField({name: 'market', type: 'reference', group: 'markets', to: [{type: 'market'}], description: 'Leave empty for all markets.'}),
    defineField({name: 'active', type: 'boolean', group: 'content', initialValue: false, readOnly: ({document}) => (document?.lifecycle as {state?: string} | undefined)?.state !== 'published', description: 'The trusted release workflow activates published redirects; direct toggles cannot activate drafts.'}),
    ...governanceFields,
  ],
  validation: (Rule) => Rule.custom((value) => value?.sourcePath === value?.destinationPath ? 'Source and destination must differ.' : true),
  preview: {select: {title: 'sourcePath', destination: 'destinationPath', status: 'statusCode'}, prepare: ({title, destination, status}) => ({title, subtitle: `${status} → ${destination}`})},
})

export const mediaAsset = defineType({
  name: 'mediaAsset', title: 'Governed media', type: 'document', groups,
  fields: [
    defineField({name: 'title', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'kind', type: 'string', options: {list: ['image', 'video', 'audio', 'document', 'diagram']}, validation: (Rule) => Rule.required()}),
    defineField({name: 'image', type: 'image', options: {hotspot: true}}),
    defineField({name: 'file', type: 'file'}),
    defineField({name: 'externalUrl', type: 'url'}),
    defineField({name: 'altText', type: 'string', description: 'Describe purpose, not appearance. Required unless decorative.'}),
    defineField({name: 'decorative', type: 'boolean', initialValue: false}),
    defineField({name: 'caption', type: 'text'}),
    defineField({name: 'transcript', type: 'portableText', description: 'Required for substantive audio/video.'}),
    defineField({name: 'chapterNotes', type: 'text', rows: 8, description: 'Reviewer-approved timestamped chapter suggestions.'}),
    defineField({name: 'rightsOwner', type: 'string'}),
    defineField({name: 'rightsExpiresAt', type: 'date'}),
    defineField({name: 'marketsApproved', type: 'array', of: [{type: 'reference', to: [{type: 'market'}]}]}),
    ...governanceFields,
  ],
  validation: (Rule) => Rule.custom((value) => {
    if (!value?.decorative && !value?.altText && value?.kind === 'image') return 'Non-decorative images require alt text.'
    if (!value?.image && !value?.file && !value?.externalUrl) return 'Provide an image, file, or external URL.'
    return true
  }),
  preview: {select: {title: 'title', subtitle: 'kind', media: 'image'}},
})

export const person = defineType({
  name: 'person', title: 'Person or advisor', type: 'document', groups,
  fields: [
    defineField({name: 'name', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'role', type: 'string', group: 'content'}),
    defineField({name: 'profileType', type: 'string', group: 'content', options: {list: ['leader', 'team', 'advisor', 'author']}, validation: (Rule) => Rule.required()}),
    defineField({name: 'bio', type: 'portableText', group: 'content'}),
    defineField({name: 'portrait', type: 'reference', to: [{type: 'mediaAsset'}], group: 'content'}),
    defineField({name: 'expertise', type: 'array', of: [{type: 'string'}], group: 'content'}),
    personEditions, ...governanceFields,
  ],
  preview: {select: {title: 'name', subtitle: 'role', media: 'portrait.image'}},
})

export const organization = defineType({
  name: 'organization', title: 'Organization or partner', type: 'document', groups,
  fields: [
    defineField({name: 'name', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'organizationType', type: 'string', group: 'content', options: {list: ['partner', 'client', 'vendor', 'publisher', 'institution']}}),
    defineField({name: 'description', type: 'portableText', group: 'content'}),
    defineField({name: 'logo', type: 'reference', to: [{type: 'mediaAsset'}], group: 'content'}),
    defineField({name: 'website', type: 'url', group: 'content'}),
    defineField({name: 'capabilities', type: 'array', of: [{type: 'string'}], group: 'content'}),
    organizationEditions, ...governanceFields,
  ],
  preview: {select: {title: 'name', type: 'organizationType', state: 'lifecycle.state', media: 'logo.image'}, prepare: ({title, type, state, media}) => ({title, subtitle: `${type || 'organization'} · ${state || 'draft'}`, media})},
})

const publicationFormats = ['article', 'report', 'video', 'webinar', 'news', 'newsletter', 'podcast', 'download']
export const publication = defineType({
  name: 'publication', title: 'Publication', type: 'document', groups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'format', type: 'string', group: 'content', options: {list: publicationFormats}, validation: (Rule) => Rule.required()}),
    defineField({name: 'slug', type: 'slug', options: {source: 'title'}, group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'dek', type: 'text', rows: 3, group: 'content'}),
    defineField({name: 'body', type: 'portableText', group: 'content'}),
    defineField({name: 'authors', type: 'array', of: [{type: 'reference', to: [{type: 'person'}]}], group: 'content', validation: (Rule) => Rule.min(1)}),
    defineField({name: 'publishedAt', type: 'datetime', group: 'content'}),
    defineField({name: 'updatedAt', type: 'datetime', group: 'content'}),
    defineField({name: 'readingMinutes', type: 'number', group: 'content', validation: (Rule) => Rule.integer().positive()}),
    defineField({name: 'topics', type: 'array', of: [{type: 'string'}], group: 'content'}),
    defineField({name: 'newsletterVariants', title: 'Newsletter subject and preheader variants', type: 'text', rows: 6, group: 'content', readOnly: true}),
    defineField({name: 'internalLinkSuggestions', title: 'Internal link suggestions', type: 'text', rows: 4, group: 'content', readOnly: true}),
    defineField({name: 'media', type: 'reference', to: [{type: 'mediaAsset'}], group: 'content'}),
    defineField({name: 'eventStartsAt', type: 'datetime', group: 'content', description: 'Use for webinars or live recordings.'}),
    defineField({name: 'download', type: 'reference', to: [{type: 'mediaAsset'}], group: 'content'}),
    defineField({name: 'gated', type: 'boolean', group: 'content', initialValue: false}),
    defineField({name: 'seo', type: 'seo', group: 'content'}),
    publicationEditions, ...governanceFields,
  ],
  validation: (Rule) => Rule.custom((value) => {
    if (isString(value?.format) && ['video', 'podcast'].includes(value.format) && !value?.media) return 'Video and podcast publications require media.'
    if (isString(value?.format) && ['report', 'download'].includes(value.format) && !value?.download) return 'Report and download publications require a downloadable asset.'
    if (value?.format === 'webinar' && !value?.eventStartsAt) return 'Webinars require a start time.'
    return true
  }),
  preview: {select: {title: 'title', format: 'format', state: 'lifecycle.state'}, prepare: ({title, format, state}) => ({title, subtitle: `${format} · ${state || 'draft'}`})},
})

export const referenceSource = defineType({
  name: 'referenceSource', title: 'Reference source', type: 'document',
  fields: [
    defineField({name: 'title', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'publisher', type: 'reference', to: [{type: 'organization'}]}),
    defineField({name: 'url', type: 'url'}),
    defineField({name: 'file', type: 'reference', to: [{type: 'mediaAsset'}]}),
    defineField({name: 'publishedAt', type: 'date'}),
    defineField({name: 'accessedAt', type: 'date', validation: (Rule) => Rule.required()}),
    defineField({name: 'notes', type: 'text'}),
  ],
})

export const approvedSource = defineType({
  name: 'approvedSource',
  title: 'AI-approved editorial source',
  type: 'document',
  groups,
  description: 'The editorial assistant can ground suggestions only in published documents whose status is approved and whose expiry is still current.',
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'content', type: 'text', rows: 12, group: 'content', description: 'Plain-text, citation-ready source excerpt. Do not include personal data, credentials, or restricted material.', validation: (Rule) => Rule.required().max(30000)}),
    defineField({name: 'approvalStatus', type: 'string', group: 'governance', options: {list: ['draft', 'approved', 'withdrawn']}, initialValue: 'draft', validation: (Rule) => Rule.required()}),
    defineField({name: 'contentClass', type: 'string', group: 'governance', options: {list: ['public', 'internal', 'restricted', 'personal', 'clientConfidential']}, initialValue: 'public', validation: (Rule) => Rule.required()}),
    defineField({name: 'approvedAt', type: 'datetime', group: 'governance'}),
    defineField({name: 'verifiedAt', type: 'date', group: 'governance'}),
    defineField({name: 'expiresAt', type: 'datetime', group: 'governance'}),
    defineField({name: 'marketsApproved', type: 'array', of: [{type: 'reference', to: [{type: 'market'}]}], group: 'markets'}),
    defineField({name: 'source', type: 'reference', group: 'content', to: [{type: 'referenceSource'}]}),
    ...baseGovernanceFields,
  ],
  validation: (Rule) => Rule.custom((value) => {
    if (value?.approvalStatus === 'approved' && !value?.approvedAt) return 'Approved sources require an approval timestamp.'
    if (value?.approvalStatus === 'approved' && !value?.verifiedAt) return 'Approved sources require a verification date.'
    const ownership = typeof value?.ownership === 'object' && value.ownership !== null
      ? value.ownership as Record<string, unknown>
      : undefined
    if (value?.approvalStatus === 'approved' && typeof ownership?.reviewDueAt !== 'string') return 'Approved sources require a future review date.'
    if (value?.approvalStatus === 'approved' && (!Array.isArray(value?.marketsApproved) || value.marketsApproved.length === 0)) return 'Approved sources require at least one approved market.'
    if (value?.approvalStatus === 'approved' && (typeof value?.contentClass !== 'string' || !['public', 'internal'].includes(value.contentClass))) return 'Restricted, personal, and client-confidential sources cannot be approved for the editorial assistant.'
    if (value?.expiresAt && value?.approvedAt && value.expiresAt <= value.approvedAt) return 'Expiry must be later than approval.'
    return true
  }),
  preview: {select: {title: 'title', status: 'approvalStatus', expires: 'expiresAt'}, prepare: ({title, status, expires}) => ({title, subtitle: `${status || 'draft'} · expires ${expires || 'never'}`})},
})

export const proof = defineType({
  name: 'proof', title: 'Proof or metric', type: 'document', groups,
  fields: [
    defineField({name: 'title', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'value', type: 'string', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'context', type: 'text', group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'references', type: 'array', of: [{type: 'reference', to: [{type: 'referenceSource'}]}], group: 'content', validation: (Rule) => Rule.min(1)}),
    defineField({name: 'verifiedAt', type: 'date', group: 'governance', validation: (Rule) => Rule.required()}),
    defineField({name: 'marketsApproved', type: 'array', of: [{type: 'reference', to: [{type: 'market'}]}], group: 'markets', validation: (Rule) => Rule.min(1)}),
    ...governanceFields,
  ],
  preview: {select: {title: 'title', value: 'value', due: 'ownership.reviewDueAt'}, prepare: ({title, value, due}) => ({title: `${value} — ${title}`, subtitle: `Review due ${due || 'not set'}`})},
})

export const claim = defineType({
  name: 'claim', title: 'Governed claim', type: 'document', groups,
  fields: [
    defineField({name: 'statement', type: 'text', rows: 3, group: 'content', validation: (Rule) => Rule.required()}),
    defineField({name: 'claimType', type: 'string', group: 'content', options: {list: ['factual', 'performance', 'comparative', 'positioning']}}),
    defineField({name: 'proof', type: 'array', of: [{type: 'reference', to: [{type: 'proof'}, {type: 'referenceSource'}]}], group: 'content', validation: (Rule) => Rule.min(1)}),
    defineField({name: 'marketsApproved', type: 'array', of: [{type: 'reference', to: [{type: 'market'}]}], group: 'markets', validation: (Rule) => Rule.min(1)}),
    ...governanceFields,
  ],
  preview: {select: {title: 'statement', state: 'lifecycle.state', due: 'ownership.reviewDueAt'}, prepare: ({title, state, due}) => ({title, subtitle: `${state || 'draft'} · review ${due || 'unset'}`})},
})

export const revisionRecord = defineType({
  name: 'revisionRecord', title: 'Immutable revision record', type: 'document',
  fields: [
    defineField({name: 'subjectId', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'revisionId', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'snapshot', type: 'text', readOnly: true, description: 'Canonical JSON generated by a trusted server integration.'}),
    defineField({name: 'createdAt', type: 'datetime', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'createdBy', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'reason', type: 'string', readOnly: true}),
  ],
  preview: {select: {title: 'subjectId', subtitle: 'revisionId'}},
})

export const auditEvent = defineType({
  name: 'auditEvent', title: 'Append-only audit event', type: 'document',
  fields: [
    defineField({name: 'eventId', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'occurredAt', type: 'datetime', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'actorId', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'action', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'subjectId', type: 'string', readOnly: true, validation: (Rule) => Rule.required()}),
    defineField({name: 'marketCode', type: 'string', readOnly: true}),
    defineField({name: 'fromState', type: 'string', readOnly: true}),
    defineField({name: 'toState', type: 'string', readOnly: true}),
    defineField({name: 'metadata', type: 'text', readOnly: true, description: 'Canonical JSON. Never include secrets or personal form data.'}),
  ],
  preview: {select: {title: 'action', subject: 'subjectId', at: 'occurredAt'}, prepare: ({title, subject, at}) => ({title, subtitle: `${subject} · ${at}`})},
})

export const globalSettings = defineType({
  name: 'globalSettings',
  title: 'Global settings',
  type: 'document',
  groups,
  fields: [
    defineField({
      name: 'organization',
      title: 'Organization defaults',
      type: 'object',
      group: 'content',
      fields: [
        defineField({name: 'name', type: 'string', validation: (Rule) => Rule.required()}),
        defineField({name: 'legalName', type: 'string'}),
        defineField({name: 'description', type: 'text', rows: 3}),
        defineField({name: 'website', type: 'url'}),
        defineField({name: 'logo', type: 'reference', to: [{type: 'mediaAsset'}]}),
      ],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'defaultSeo',
      title: 'Default SEO',
      type: 'seo',
      group: 'content',
      description: 'Fallback only. Page and publication SEO should be explicit where search intent differs.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'socialLinks',
      type: 'array',
      group: 'content',
      of: [{
        type: 'object',
        fields: [
          defineField({name: 'platform', type: 'string', options: {list: ['linkedin', 'youtube', 'x', 'instagram', 'other']}, validation: (Rule) => Rule.required()}),
          defineField({name: 'label', type: 'string'}),
          defineField({name: 'url', type: 'url', validation: (Rule) => Rule.required()}),
        ],
      }],
    }),
    defineField({
      name: 'contact',
      type: 'object',
      group: 'content',
      description: 'Public contact destinations only. Enquiries and subscriber records must never be stored here.',
      fields: [
        defineField({name: 'email', type: 'string', validation: (Rule) => Rule.email()}),
        defineField({name: 'phone', type: 'string'}),
        defineField({name: 'bookingUrl', type: 'url'}),
        defineField({name: 'address', type: 'text', rows: 3}),
      ],
    }),
    defineField({
      name: 'legalLinks',
      type: 'array',
      group: 'content',
      description: 'Links to approved privacy, terms, cookies, and regulatory pages.',
      of: [{type: 'link'}],
    }),
    defineField({
      name: 'accessibility',
      type: 'object',
      group: 'content',
      fields: [
        defineField({name: 'statementPage', type: 'reference', to: [{type: 'page'}]}),
        defineField({name: 'contactEmail', type: 'string', validation: (Rule) => Rule.email()}),
        defineField({name: 'conformanceTarget', type: 'string', initialValue: 'WCAG 2.2 AA', readOnly: true}),
        defineField({name: 'lastReviewedAt', type: 'date'}),
      ],
    }),
    defineField({
      name: 'markets',
      type: 'array',
      group: 'markets',
      description: 'Ordered market switcher options. UAE should be first and canonical.',
      of: [{type: 'reference', to: [{type: 'market'}]}],
      validation: (Rule) => Rule.required().min(1).unique(),
    }),
    defineField({
      name: 'defaultMarket',
      type: 'reference',
      group: 'markets',
      to: [{type: 'market'}],
      description: 'Must reference the UAE canonical market; the trusted API verifies this.',
      validation: (Rule) => Rule.required(),
    }),
    ...governanceFields,
  ],
  preview: {
    select: {title: 'organization.name', state: 'lifecycle.state'},
    prepare: ({title, state}) => ({
      title: title || 'Cognirise global settings',
      subtitle: `Singleton · ${state || 'draft'}`,
    }),
  },
})

export const documentTypes = [market, page, navigation, redirect, mediaAsset, person, organization, publication, referenceSource, approvedSource, proof, claim, revisionRecord, auditEvent, globalSettings]
