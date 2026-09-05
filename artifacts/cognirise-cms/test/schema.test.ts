import assert from 'node:assert/strict'
import test from 'node:test'
import {approvedSource, globalSettings, mediaAsset, navigation, organization, page, person, publication} from '../src/schemaTypes/documents'
import {objectTypes} from '../src/schemaTypes/objects'

test('global settings singleton schema contains public configuration only', () => {
  const fieldNames = globalSettings.fields.map((field) => field.name)
  assert.deepEqual(fieldNames, [
    'organization',
    'defaultSeo',
    'socialLinks',
    'contact',
    'legalLinks',
    'accessibility',
    'markets',
    'defaultMarket',
    'ownership',
    'lifecycle',
    'assistantContentClass',
    'assistantReview',
  ])
  assert.equal(fieldNames.includes('subscribers'), false)
  assert.equal(fieldNames.includes('enquiries'), false)
})

test('assistant grounding source exposes the server-required governance fields', () => {
  assert.deepEqual(
    approvedSource.fields.map((field) => field.name),
    [
      'title',
      'content',
      'approvalStatus',
      'contentClass',
      'approvedAt',
      'verifiedAt',
      'expiresAt',
      'marketsApproved',
      'source',
      'ownership',
      'lifecycle',
    ],
  )
})

test('assistant target documents expose classification and review quarantine fields', () => {
  for (const schema of [page, mediaAsset, publication, person, organization]) {
    const fields = new Set(schema.fields.map((field) => field.name))
    assert.equal(fields.has('assistantContentClass'), true, schema.name)
    assert.equal(fields.has('assistantReview'), true, schema.name)
    assert.equal(fields.has('ownership'), true, schema.name)
    assert.equal(fields.has('lifecycle'), true, schema.name)
  }
})

test('each non-page document references its purpose-built localized edition', () => {
  function assertEditionType(
    documentType: {fields: readonly {name: string}[]},
    editionType: string,
  ) {
    const field = documentType.fields.find((candidate) => candidate.name === 'marketEditions')
    assert.ok(field && 'of' in field)
    const members: unknown = field.of
    assert.ok(Array.isArray(members))
    const firstMember: unknown = members[0]
    assert.ok(
      typeof firstMember === 'object' &&
        firstMember !== null &&
        'type' in firstMember,
    )
    assert.equal(firstMember.type, editionType)
  }

  assertEditionType(navigation, 'navigationEdition')
  assertEditionType(person, 'personEdition')
  assertEditionType(organization, 'organizationEdition')
  assertEditionType(publication, 'publicationEdition')
})

test('all purpose-built localized edition objects are registered', () => {
  const names = new Set(objectTypes.map((type) => type.name))
  for (const name of [
    'marketEdition',
    'navigationEdition',
    'personEdition',
    'organizationEdition',
    'publicationEdition',
  ]) {
    assert.equal(names.has(name), true)
  }
})