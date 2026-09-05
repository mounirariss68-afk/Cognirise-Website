export const roles = ['author', 'regionalEditor', 'reviewer', 'publisher', 'admin'] as const
export type EditorialRole = (typeof roles)[number]

export const lifecycleStates = [
  'draft',
  'regionalReview',
  'internalReview',
  'complianceReview',
  'approved',
  'scheduled',
  'published',
  'expired',
  'archived',
] as const
export type LifecycleState = (typeof lifecycleStates)[number]

const transitions: Record<EditorialRole, ReadonlySet<string>> = {
  author: new Set(['draft:regionalReview', 'draft:internalReview']),
  regionalEditor: new Set(['draft:regionalReview', 'regionalReview:internalReview']),
  reviewer: new Set([
    'regionalReview:internalReview',
    'internalReview:complianceReview',
    'internalReview:approved',
    'complianceReview:approved',
  ]),
  publisher: new Set([
    'approved:scheduled',
    'approved:published',
    'scheduled:published',
    'published:expired',
    'expired:archived',
  ]),
  admin: new Set(['*']),
}

export function canTransition(role: EditorialRole, from: LifecycleState, to: LifecycleState) {
  return transitions[role].has('*') || transitions[role].has(`${from}:${to}`)
}

export interface Publishable {
  ownership?: {owner?: unknown; reviewDueAt?: string}
  lifecycle?: {
    state?: string
    approvedBy?: unknown
    approvedAt?: string
    publishAt?: string
    expiresAt?: string
  }
}

export function publishBlockers(document: Publishable, now = new Date()): string[] {
  const blockers: string[] = []
  const {ownership, lifecycle} = document
  if (!ownership?.owner) blockers.push('Assign a content owner.')
  if (!lifecycle || !['approved', 'scheduled', 'published'].includes(lifecycle.state ?? '')) {
    blockers.push('Lifecycle must be approved before publishing.')
  }
  if (!lifecycle?.approvedBy || !lifecycle.approvedAt) blockers.push('Record approval and approver.')
  if (lifecycle?.publishAt && new Date(lifecycle.publishAt) > now) {
    blockers.push('Publish time is in the future; use Sanity scheduling.')
  }
  if (lifecycle?.expiresAt && new Date(lifecycle.expiresAt) <= now) {
    blockers.push('Content is expired.')
  }
  return blockers
}

export const governedDocumentTypes = new Set([
  'globalSettings',
  'page',
  'navigation',
  'publication',
  'person',
  'organization',
  'proof',
  'claim',
])
export const immutableDocumentTypes = new Set(['revisionRecord', 'auditEvent'])