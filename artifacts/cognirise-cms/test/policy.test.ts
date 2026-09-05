import assert from 'node:assert/strict'
import test from 'node:test'
import {canTransition, publishBlockers} from '../src/governance/policy'

test('authors cannot approve or publish', () => {
  assert.equal(canTransition('author', 'draft', 'internalReview'), true)
  assert.equal(canTransition('author', 'internalReview', 'approved'), false)
  assert.equal(canTransition('author', 'approved', 'published'), false)
})

test('reviewers approve while publishers publish', () => {
  assert.equal(canTransition('reviewer', 'internalReview', 'approved'), true)
  assert.equal(canTransition('reviewer', 'approved', 'published'), false)
  assert.equal(canTransition('publisher', 'approved', 'published'), true)
})

test('regional editors are limited to regional review and admins may recover any state', () => {
  assert.equal(canTransition('regionalEditor', 'draft', 'regionalReview'), true)
  assert.equal(canTransition('regionalEditor', 'regionalReview', 'internalReview'), true)
  assert.equal(canTransition('regionalEditor', 'approved', 'published'), false)
  assert.equal(canTransition('admin', 'archived', 'draft'), true)
})

test('publish guard reports governance, schedule, and expiry blockers', () => {
  const now = new Date('2026-09-04T12:00:00Z')
  assert.deepEqual(publishBlockers({}, now), [
    'Assign a content owner.',
    'Lifecycle must be approved before publishing.',
    'Record approval and approver.',
  ])
  const blockers = publishBlockers({
    ownership: {owner: {_ref: 'person-1'}},
    lifecycle: {
      state: 'approved',
      approvedBy: {_ref: 'person-2'},
      approvedAt: '2026-09-01T00:00:00Z',
      publishAt: '2026-09-05T00:00:00Z',
      expiresAt: '2026-09-04T00:00:00Z',
    },
  }, now)
  assert.deepEqual(blockers, [
    'Publish time is in the future; use Sanity scheduling.',
    'Content is expired.',
  ])
  assert.deepEqual(publishBlockers({
    assistantReview: {requestId: 'assistant-request'},
    ownership: {owner: {_ref: 'person-1'}},
    lifecycle: {
      state: 'approved',
      approvedBy: {_ref: 'person-2'},
      approvedAt: '2026-09-01T00:00:00Z',
    },
  }, now), ['Complete the independent AI decision audit before publishing.'])
})