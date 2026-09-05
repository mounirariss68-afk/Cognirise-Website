import {defineArrayMember, defineField, defineType} from 'sanity'

const isString = (value: unknown): value is string => typeof value === 'string'

export const marketEdition = defineType({
  name: 'marketEdition',
  title: 'Market edition',
  type: 'object',
  fields: [
    defineField({
      name: 'market',
      type: 'reference',
      to: [{type: 'market'}],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fallbackMode',
      type: 'string',
      description: 'Explicitly state whether this edition uses UAE content or approved local content.',
      options: {
        list: [
          {title: 'UAE canonical content', value: 'canonical'},
          {title: 'Use UAE canonical (visible fallback)', value: 'uaeFallback'},
          {title: 'Approved market override', value: 'override'},
          {title: 'Unavailable in this market', value: 'unavailable'},
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publicationState',
      type: 'string',
      description: 'Independent state for this market; publishing another edition does not publish this one.',
      options: {
        list: ['draft', 'review', 'approved', 'scheduled', 'published', 'expired', 'archived'],
      },
      initialValue: 'draft',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'summary', type: 'text', rows: 3}),
    defineField({
      name: 'localizedSlug',
      type: 'slug',
      description: 'Optional market-specific route. Redirect the old route whenever this changes.',
    }),
    defineField({name: 'body', type: 'portableText', description: 'Localized long-form publication copy.'}),
    defineField({
      name: 'sections',
      type: 'array',
      description: 'Optional approved local page composition. Empty means the explicit fallback policy applies.',
      of: ['heroSection', 'richTextSection', 'claimSection', 'metricSection', 'quoteSection', 'referenceGridSection', 'mediaSection', 'timelineSection', 'comparisonSection', 'ctaSection', 'faqSection', 'downloadGateSection'].map((type) => defineArrayMember({type})),
    }),
    defineField({name: 'seo', type: 'seo'}),
    defineField({name: 'approvedBy', type: 'reference', to: [{type: 'person'}]}),
    defineField({name: 'approvedAt', type: 'datetime'}),
    defineField({name: 'lastEditorActor', type: 'string', readOnly: true, hidden: true}),
    defineField({name: 'lastRequesterActor', type: 'string', readOnly: true, hidden: true}),
    defineField({name: 'lastApprovalActor', type: 'string', readOnly: true, hidden: true}),
    defineField({
      name: 'publishAt',
      type: 'datetime',
      description: 'Requires an approved edition and a configured server-side scheduling integration.',
    }),
    defineField({
      name: 'expiresAt',
      type: 'datetime',
      description: 'At expiry, remove from delivery or show the UAE fallback according to product policy.',
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      if (value?.fallbackMode === 'override' && (!value.title || !value.approvedBy || !value.approvedAt)) {
        return 'A market override requires local content, approver and approval time.'
      }
      if (
        isString(value?.publicationState) &&
        ['approved', 'scheduled', 'published'].includes(value.publicationState) &&
        (!value?.approvedBy || !value?.approvedAt)
      ) {
        return 'Approved, scheduled, and published editions require an approver and approval time.'
      }
      if (
        isString(value?.publishAt) &&
        isString(value?.expiresAt) &&
        new Date(value.expiresAt) <= new Date(value.publishAt)
      ) {
        return 'Expiry must be later than the scheduled publication time.'
      }
      return true
    }),
  preview: {
    select: {title: 'market.name', state: 'publicationState', fallback: 'fallbackMode'},
    prepare: ({title, state, fallback}) => ({title: title || 'Market edition', subtitle: `${state} · ${fallback}`}),
  },
})

const localizedEditionCoreFields = () => [
  defineField({
    name: 'market',
    type: 'reference',
    to: [{type: 'market'}],
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'fallbackMode',
    type: 'string',
    description: 'Canonical UAE, an explicit UAE fallback, an approved local override, or unavailable.',
    options: {
      list: [
        {title: 'UAE canonical content', value: 'canonical'},
        {title: 'Use UAE canonical (visible fallback)', value: 'uaeFallback'},
        {title: 'Approved market override', value: 'override'},
        {title: 'Unavailable in this market', value: 'unavailable'},
      ],
      layout: 'radio',
    },
    validation: (Rule) => Rule.required(),
  }),
  defineField({
    name: 'publicationState',
    type: 'string',
    description: 'Independent state for this market. The trusted release API enforces transitions.',
    options: {list: ['draft', 'review', 'approved', 'scheduled', 'published', 'expired', 'archived']},
    initialValue: 'draft',
    validation: (Rule) => Rule.required(),
  }),
  defineField({name: 'approvedBy', type: 'reference', to: [{type: 'person'}]}),
  defineField({name: 'approvedAt', type: 'datetime'}),
  defineField({name: 'publishAt', type: 'datetime', description: 'Executed only by the trusted scheduler/release API.'}),
  defineField({name: 'expiresAt', type: 'datetime', description: 'Enforced by the trusted delivery API.'}),
]

function localizedEditionValidation(
  value: Record<string, unknown> | undefined,
  requiredOverrideField: string,
) {
  if (
    value?.fallbackMode === 'override' &&
    (!value[requiredOverrideField] || !value.approvedBy || !value.approvedAt)
  ) {
    return `An override requires ${requiredOverrideField}, approvedBy, and approvedAt.`
  }
  if (
    isString(value?.publicationState) &&
    ['approved', 'scheduled', 'published'].includes(value.publicationState) &&
    (!value.approvedBy || !value.approvedAt)
  ) {
    return 'Approved, scheduled, and published editions require an approver and approval time.'
  }
  if (
    isString(value?.publishAt) &&
    isString(value?.expiresAt) &&
    new Date(value.expiresAt) <= new Date(value.publishAt)
  ) {
    return 'Expiry must be later than the scheduled publication time.'
  }
  return true
}

const localizedPreview = {
  select: {title: 'market.name', state: 'publicationState', fallback: 'fallbackMode'},
  prepare: ({title, state, fallback}: {title?: string; state?: string; fallback?: string}) => ({
    title: title || 'Market edition',
    subtitle: `${state || 'draft'} · ${fallback || 'unset'}`,
  }),
}

export const navigationEdition = defineType({
  name: 'navigationEdition',
  title: 'Localized navigation edition',
  type: 'object',
  fields: [
    ...localizedEditionCoreFields(),
    defineField({name: 'title', type: 'string', description: 'Internal localized label.'}),
    defineField({
      name: 'items',
      type: 'array',
      of: [{type: 'link'}],
      description: 'Complete ordered navigation override for this market.',
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => localizedEditionValidation(value, 'items')),
  preview: localizedPreview,
})

export const personEdition = defineType({
  name: 'personEdition',
  title: 'Localized person edition',
  type: 'object',
  fields: [
    ...localizedEditionCoreFields(),
    defineField({name: 'name', type: 'string'}),
    defineField({name: 'role', type: 'string'}),
    defineField({name: 'bio', type: 'portableText'}),
  ],
  validation: (Rule) =>
    Rule.custom((value) => localizedEditionValidation(value, 'name')),
  preview: localizedPreview,
})

export const organizationEdition = defineType({
  name: 'organizationEdition',
  title: 'Localized organization edition',
  type: 'object',
  fields: [
    ...localizedEditionCoreFields(),
    defineField({name: 'name', type: 'string'}),
    defineField({name: 'description', type: 'portableText'}),
    defineField({name: 'website', type: 'url'}),
    defineField({name: 'capabilities', type: 'array', of: [{type: 'string'}]}),
  ],
  validation: (Rule) =>
    Rule.custom((value) => localizedEditionValidation(value, 'name')),
  preview: localizedPreview,
})

export const publicationEdition = defineType({
  name: 'publicationEdition',
  title: 'Localized publication edition',
  type: 'object',
  fields: [
    ...localizedEditionCoreFields(),
    defineField({name: 'title', type: 'string'}),
    defineField({name: 'localizedSlug', type: 'slug'}),
    defineField({name: 'dek', type: 'text', rows: 3}),
    defineField({name: 'body', type: 'portableText'}),
    defineField({name: 'seo', type: 'seo'}),
  ],
  validation: (Rule) =>
    Rule.custom((value) => localizedEditionValidation(value, 'title')),
  preview: localizedPreview,
})

export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({name: 'metaTitle', type: 'string', validation: (Rule) => Rule.max(60).warning()}),
    defineField({name: 'metaDescription', type: 'text', rows: 3, validation: (Rule) => Rule.max(160).warning()}),
    defineField({name: 'canonicalUrl', type: 'url'}),
    defineField({name: 'noIndex', type: 'boolean', initialValue: false}),
    defineField({name: 'openGraphImage', type: 'reference', to: [{type: 'mediaAsset'}]}),
    defineField({name: 'structuredDataType', type: 'string', options: {list: ['WebPage', 'Article', 'Person', 'Organization', 'Service']}}),
  ],
})

export const ownership = defineType({
  name: 'ownership',
  title: 'Ownership',
  type: 'object',
  fields: [
    defineField({name: 'owner', type: 'reference', to: [{type: 'person'}], validation: (Rule) => Rule.required()}),
    defineField({name: 'regionalOwner', type: 'reference', to: [{type: 'person'}]}),
    defineField({name: 'reviewDueAt', type: 'date', description: 'Required for claims, proof and time-sensitive content.'}),
    defineField({name: 'sensitivity', type: 'string', options: {list: ['public', 'anonymized', 'restricted']}, initialValue: 'public'}),
  ],
})

export const lifecycle = defineType({
  name: 'lifecycle',
  title: 'Lifecycle and approval',
  type: 'object',
  description: 'Studio fields and guards guide editors; the trusted release API is the enforcement boundary.',
  fields: [
    defineField({name: 'state', type: 'string', options: {list: ['draft', 'regionalReview', 'internalReview', 'complianceReview', 'approved', 'scheduled', 'published', 'expired', 'archived']}, initialValue: 'draft', validation: (Rule) => Rule.required()}),
    defineField({name: 'requiresCompliance', type: 'boolean', initialValue: false}),
    defineField({name: 'approvedBy', type: 'reference', to: [{type: 'person'}]}),
    defineField({name: 'approvedAt', type: 'datetime'}),
    defineField({name: 'publishAt', type: 'datetime', description: 'Do not manually publish before this time. Use a server-side scheduler.'}),
    defineField({name: 'expiresAt', type: 'datetime', description: 'Set an expiry for campaigns, offers and time-sensitive assertions.'}),
  ],
  validation: (Rule) => Rule.custom((value) =>
    isString(value?.state) &&
    ['approved', 'scheduled', 'published'].includes(value.state) &&
    (!value?.approvedBy || !value?.approvedAt)
      ? 'Approved states require approvedBy and approvedAt.'
      : true,
  ),
})

const link = defineType({
  name: 'link',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({name: 'label', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'internal', type: 'reference', to: [{type: 'page'}, {type: 'publication'}]}),
    defineField({name: 'externalUrl', type: 'url'}),
  ],
  validation: (Rule) => Rule.custom((value) => Boolean(value?.internal) !== Boolean(value?.externalUrl) || 'Choose exactly one destination.'),
})

const portableText = defineType({
  name: 'portableText',
  title: 'Editorial copy',
  type: 'array',
  of: [
    defineArrayMember({type: 'block', styles: [{title: 'Normal', value: 'normal'}, {title: 'Heading 2', value: 'h2'}, {title: 'Heading 3', value: 'h3'}, {title: 'Quote', value: 'blockquote'}]}),
  ],
})

const sectionFields = [
  defineField({name: 'eyebrow', type: 'string'}),
  defineField({name: 'heading', type: 'string', validation: (Rule) => Rule.required()}),
  defineField({name: 'body', type: 'portableText'}),
]

const section = (name: string, title: string, extra: ReturnType<typeof defineField>[] = []) =>
  defineType({name, title, type: 'object', fields: [...sectionFields, ...extra], preview: {select: {title: 'heading'}, prepare: ({title: heading}) => ({title: heading || title, subtitle: title})}})

export const sectionTypes = [
  section('heroSection', 'Hero', [defineField({name: 'primaryAction', type: 'link'}), defineField({name: 'media', type: 'reference', to: [{type: 'mediaAsset'}]})]),
  section('richTextSection', 'Rich text'),
  section('claimSection', 'Claim and evidence', [defineField({name: 'claims', type: 'array', of: [{type: 'reference', to: [{type: 'claim'}]}], validation: (Rule) => Rule.min(1)})]),
  section('metricSection', 'Metric group', [defineField({name: 'proof', type: 'array', of: [{type: 'reference', to: [{type: 'proof'}]}]})]),
  section('quoteSection', 'Quote or testimonial', [defineField({name: 'quote', type: 'text', validation: (Rule) => Rule.required()}), defineField({name: 'person', type: 'reference', to: [{type: 'person'}]})]),
  section('referenceGridSection', 'Curated reference grid', [defineField({name: 'items', type: 'array', of: [{type: 'reference', to: [{type: 'page'}, {type: 'publication'}, {type: 'organization'}, {type: 'person'}]}]})]),
  section('mediaSection', 'Media with caption', [defineField({name: 'media', type: 'reference', to: [{type: 'mediaAsset'}], validation: (Rule) => Rule.required()})]),
  section('timelineSection', 'Timeline or process', [defineField({name: 'steps', type: 'array', of: [{type: 'object', fields: [defineField({name: 'label', type: 'string'}), defineField({name: 'detail', type: 'text'})]}]})]),
  section('comparisonSection', 'Before and after', [defineField({name: 'before', type: 'text'}), defineField({name: 'after', type: 'text'})]),
  section('ctaSection', 'Call to action', [defineField({name: 'action', type: 'link', validation: (Rule) => Rule.required()})]),
  section('faqSection', 'FAQ', [defineField({name: 'items', type: 'array', of: [{type: 'object', fields: [defineField({name: 'question', type: 'string'}), defineField({name: 'answer', type: 'portableText'})]}]})]),
  section('downloadGateSection', 'Download gate', [defineField({name: 'asset', type: 'reference', to: [{type: 'mediaAsset'}]}), defineField({name: 'consentCopy', type: 'text'})]),
]

export const objectTypes = [
  marketEdition,
  navigationEdition,
  personEdition,
  organizationEdition,
  publicationEdition,
  seo,
  ownership,
  lifecycle,
  link,
  portableText,
  ...sectionTypes,
]