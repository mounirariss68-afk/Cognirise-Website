import assert from 'node:assert/strict'
import test from 'node:test'
import {globalSettings, navigation, organization, person, publication} from '../src/schemaTypes/documents'
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
  ])
  assert.equal(fieldNames.includes('subscribers'), false)
  assert.equal(fieldNames.includes('enquiries'), false)
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