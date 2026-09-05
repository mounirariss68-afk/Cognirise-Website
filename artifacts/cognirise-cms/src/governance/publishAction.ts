import type {DocumentActionComponent, DocumentActionProps} from 'sanity'
import {publishBlockers, type Publishable} from './policy'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined)

function governanceProjection(value: unknown): Publishable {
  if (!isRecord(value)) return {}

  const ownership = isRecord(value.ownership)
    ? {
        owner: value.ownership.owner,
        reviewDueAt: optionalString(value.ownership.reviewDueAt),
      }
    : undefined
  const lifecycle = isRecord(value.lifecycle)
    ? {
        state: optionalString(value.lifecycle.state),
        approvedBy: value.lifecycle.approvedBy,
        approvedAt: optionalString(value.lifecycle.approvedAt),
        publishAt: optionalString(value.lifecycle.publishAt),
        expiresAt: optionalString(value.lifecycle.expiresAt),
      }
    : undefined

  return {ownership, lifecycle, assistantReview: value.assistantReview}
}

export function guardPublishAction(
  PublishAction: DocumentActionComponent,
): DocumentActionComponent {
  const GuardedPublishAction: DocumentActionComponent = (props: DocumentActionProps) => {
    const original = PublishAction(props)
    const blockers = publishBlockers(governanceProjection(props.draft ?? props.published))
    if (!original || blockers.length === 0) return original
    return {
      ...original,
      disabled: true,
      label: 'Approval required',
      title: blockers.join(' '),
    }
  }
  GuardedPublishAction.action = 'publish'
  GuardedPublishAction.displayName = 'CognirisePublishGuard'
  return GuardedPublishAction
}