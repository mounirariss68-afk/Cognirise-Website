import assert from 'node:assert/strict'
import test from 'node:test'
import {
  assistantFieldConfigsByType,
  assistantFieldStorage,
  serializeAssistantPatchValue,
} from '../src/ai/field-values'

test('only fields with explicit storage serializers are selectable', () => {
  assert.equal(assistantFieldStorage('globalSettings', 'organization.description'), undefined)
  assert.equal(assistantFieldStorage('mediaAsset', 'transcript'), 'portableText')
  assert.equal(assistantFieldStorage('page', 'topics'), 'stringArray')
  assert.equal(
    assistantFieldStorage('page', 'marketEditions[_key=="uae"].summary'),
    'plainText',
  )
  for (const [contentType, fields] of Object.entries(assistantFieldConfigsByType)) {
    for (const field of fields) {
      assert.equal(assistantFieldStorage(contentType, field.path), field.storage)
    }
  }
})

test('field serializers preserve each supported Sanity storage shape', () => {
  assert.equal(serializeAssistantPatchValue('plainText', 'Reviewed copy'), 'Reviewed copy')
  assert.deepEqual(
    serializeAssistantPatchValue('stringArray', 'Strategy, Learning, Strategy'),
    ['Strategy', 'Learning', 'Strategy'],
  )
  let key = 0
  assert.deepEqual(
    serializeAssistantPatchValue('portableText', 'First paragraph\nSecond paragraph', () =>
      `key${key++}`),
    [{
      _type: 'block',
      _key: 'key0',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'key1', text: 'First paragraph', marks: []}],
    }, {
      _type: 'block',
      _key: 'key2',
      style: 'normal',
      markDefs: [],
      children: [{_type: 'span', _key: 'key3', text: 'Second paragraph', marks: []}],
    }],
  )
})