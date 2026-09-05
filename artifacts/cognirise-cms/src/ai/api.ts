export const aiOperations = [
  'draft-generation', 'summary', 'report-abstract', 'transcript-cleanup', 'chapters',
  'newsletter-variants', 'market-adaptation', 'translation', 'seo-metadata', 'tags',
  'alt-text', 'internal-links', 'quality-review', 'rewrite',
] as const
export type AiOperation = (typeof aiOperations)[number]
export type AiMarket = 'uae' | 'ksa' | 'turkiye' | 'europe'
export type AiDecision = 'accepted' | 'rejected'

export interface AiCitation {
  claim: string
  sourceId: string
  quote: string
}

export interface AiSuggestion {
  requestId: string
  suggestion: string
  citations: AiCitation[]
  uncertainties: string[]
  diff: Array<{op: 'replace'; before: string; after: string}>
  qualityGates: Array<{gate: string; passed: boolean; detail: string}>
  policyVersion: string
}

export interface AiSuggestionRequest {
  requestId: string
  subjectId: string
  market: AiMarket
  operation: AiOperation
  draft: string
  sourceIds: string[]
  contentClass: 'public' | 'internal'
  target: {
    fieldPath: string
    contentType: string
    language: string
    maxLength: number
    revisionId: string
  }
  instructions?: string
}

export interface AiClientOptions {
  baseUrl: string
  credential: string
  runsPath?: string
  fetcher?: typeof fetch
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const string = (value: unknown): value is string => typeof value === 'string'

export function parseSuggestion(value: unknown, requestId: string): AiSuggestion {
  if (
    !record(value) ||
    value.status !== 'completed' ||
    !string(value.suggestion) ||
    !Array.isArray(value.citations) ||
    !Array.isArray(value.uncertainties) ||
    !value.uncertainties.every(string) ||
    !Array.isArray(value.diff) ||
    !Array.isArray(value.qualityGates) ||
    !string(value.policyVersion)
  ) throw new Error('The assistant returned an invalid response.')

  const citations = value.citations.map((item) => {
    if (!record(item) || !string(item.claim) || !string(item.sourceId) || !string(item.quote)) {
      throw new Error('The assistant returned invalid citation data.')
    }
    return {claim: item.claim, sourceId: item.sourceId, quote: item.quote}
  })
  const diff = value.diff.map((item) => {
    if (!record(item) || item.op !== 'replace' || !string(item.before) || !string(item.after)) {
      throw new Error('The assistant returned invalid diff data.')
    }
    return {op: 'replace' as const, before: item.before, after: item.after}
  })
  const qualityGates = value.qualityGates.map((item) => {
    if (!record(item) || !string(item.gate) || typeof item.passed !== 'boolean' || !string(item.detail)) {
      throw new Error('The assistant returned invalid quality-gate data.')
    }
    return {gate: item.gate, passed: item.passed, detail: item.detail}
  })
  return {
    requestId,
    suggestion: value.suggestion,
    citations,
    uncertainties: value.uncertainties,
    diff,
    qualityGates,
    policyVersion: value.policyVersion,
  }
}

function endpoint(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}

function safeHttpError(status: number) {
  if (status === 400) return 'The assistant request is invalid. Check the field, source IDs, and instructions.'
  if (status === 401 || status === 403) return 'The CMS principal credential was not accepted or is not assigned to this market.'
  if (status === 404) return 'Governed AI assistance is not enabled for this environment.'
  if (status === 409) return 'This run was already decided, or separation of duties requires a different reviewer.'
  if (status === 422) return 'The request or its sources did not pass assistant policy checks.'
  if (status === 429) return 'The assistant is temporarily at capacity. Try again later.'
  return 'The governed AI service is unavailable. Your document was not changed.'
}

async function send(options: AiClientOptions, path: string, body: unknown) {
  if (!options.baseUrl.trim()) throw new Error('The governed AI API URL is not configured.')
  if (!options.credential.trim()) throw new Error('Enter the required CMS principal credential.')
  let response: Response
  try {
    response = await (options.fetcher ?? fetch)(endpoint(options.baseUrl, path), {
      method: 'POST',
      headers: {authorization: `Bearer ${options.credential}`, 'content-type': 'application/json'},
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('The governed AI service could not be reached. Your document was not changed.')
  }
  if (!response.ok) throw new Error(safeHttpError(response.status))
  return response
}

export async function requestSuggestion(options: AiClientOptions, request: AiSuggestionRequest) {
  const response = await send(
    options,
    options.runsPath ?? '/api/cms/editorial-assistant/runs',
    request,
  )
  let body: unknown
  try {
    body = await response.json()
  } catch {
    throw new Error('The assistant returned an unreadable response.')
  }
  return parseSuggestion(body, request.requestId)
}

export async function recordDecision(
  options: AiClientOptions,
  request: {
    requestId: string
    decision: AiDecision
    reason: string
    resultingRevisionId?: string
  },
): Promise<void> {
  const runsPath = options.runsPath ?? '/api/cms/editorial-assistant/runs'
  const decisionsPath = runsPath.replace(/\/runs\/?$/, '/decisions')
  await send(options, decisionsPath, request)
}

export function parseSourceIds(input: string): string[] {
  return [...new Set(input.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))]
}