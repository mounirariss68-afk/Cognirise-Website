import assert from 'node:assert/strict'
import test from 'node:test'
import {parseSourceIds, parseSuggestion, recordDecision, requestSuggestion} from '../src/ai/api'

const completed = {
  status: 'completed',
  suggestion: 'Reviewed copy',
  citations: [{claim: 'Reviewed copy', sourceId: 'source.one', quote: 'Approved evidence'}],
  uncertainties: ['Confirm the date.'],
  diff: [{op: 'replace', before: 'Old', after: 'Reviewed copy'}],
  qualityGates: [{gate: 'citations', passed: true, detail: 'verified'}],
  policyVersion: 'cms-editorial-assistant/2',
}

test('validates assistant evidence, uncertainty, diff, and quality gates', () => {
  const result = parseSuggestion(completed, 'request123')
  assert.equal(result.requestId, 'request123')
  assert.equal(result.citations[0]?.sourceId, 'source.one')
  assert.throws(() => parseSuggestion({...completed, citations: [{sourceId: 1}]}, 'request123'), /citation/)
})

test('parses and de-duplicates approved source document IDs', () => {
  assert.deepEqual(parseSourceIds('source.one\nsource.two,source.one'), ['source.one', 'source.two'])
})

test('matches run and decision API contracts and keeps bearer credentials out of bodies', async () => {
  const requests: Array<{url: string; init?: RequestInit}> = []
  const fetcher: typeof fetch = async (url, init) => {
    requests.push({url: String(url), init})
    return new Response(JSON.stringify(completed), {status: 201})
  }
  const options = {baseUrl: 'https://api.example/', credential: 'not-a-real-secret', fetcher}
  await requestSuggestion(options, {
    requestId: 'request123', subjectId: 'page.one', market: 'uae',
    operation: 'rewrite', draft: 'Old', sourceIds: ['source.one'], contentClass: 'public',
    target: {fieldPath: 'summary', contentType: 'page', language: 'en', maxLength: 120, revisionId: 'revision-1'},
    instructions: 'Shorter',
  })
  await recordDecision(options, {
    requestId: 'request123', decision: 'rejected', reason: 'Not on brand',
  })
  assert.equal((requests[0]?.init?.headers as Record<string, string>).authorization, 'Bearer not-a-real-secret')
  assert.doesNotMatch(String(requests[0]?.init?.body), /not-a-real-secret/)
  assert.equal(requests[1]?.url, 'https://api.example/api/cms/editorial-assistant/decisions')
})

test('does not reflect unsafe server error bodies', async () => {
  const fetcher: typeof fetch = async () => new Response('internal token', {status: 403})
  await assert.rejects(requestSuggestion(
    {baseUrl: 'https://api.example', credential: 'credential', fetcher},
    {requestId: 'request123', subjectId: 'page.one', market: 'uae', operation: 'rewrite',
      draft: 'Old', sourceIds: ['source.one'], contentClass: 'public',
      target: {fieldPath: 'summary', contentType: 'page', language: 'en', maxLength: 120, revisionId: 'revision-1'}},
  ), /principal credential/)
})