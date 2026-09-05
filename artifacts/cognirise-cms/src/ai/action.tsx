import {useMemo, useState, type CSSProperties} from 'react'
import {useClient, type DocumentActionComponent, type DocumentActionProps} from 'sanity'
import {
  parseSourceIds,
  recordDecision,
  requestSuggestion,
  type AiDecision,
  type AiMarket,
  type AiOperation,
  type AiSuggestion,
} from './api'
import {
  assistantFieldConfigsByType,
  assistantFieldStorage,
  serializeAssistantPatchValue,
  type AssistantFieldStorage,
} from './field-values'

const features = [
  ['draft', 'Draft improvement', 'draft-generation'],
  ['summary', 'Summary', 'summary'],
  ['reportAbstract', 'Report abstract', 'report-abstract'],
  ['transcriptCleanup', 'Transcript cleanup', 'transcript-cleanup'],
  ['chapters', 'Chapters', 'chapters'],
  ['newsletter', 'Newsletter subject / preheader variants', 'newsletter-variants'],
  ['marketAdaptation', 'Market adaptation', 'market-adaptation'],
  ['translation', 'Translation', 'translation'],
  ['seoMetadata', 'SEO metadata', 'seo-metadata'],
  ['tags', 'Tags', 'tags'],
  ['altText', 'Alt text', 'alt-text'],
  ['internalLinks', 'Internal-link suggestions', 'internal-links'],
  ['qualityReview', 'Quality review', 'quality-review'],
] as const
type Feature = (typeof features)[number][0]
interface SuggestionContext {
  field: string
  before: string
  maxLength: number
  revisionId: string
  storage: AssistantFieldStorage
  decisionReason?: string
  appliedRevisionId?: string
}
const featureLabel = Object.fromEntries(features.map(([id, label]) => [id, label])) as Record<Feature, string>
const featureOperation = Object.fromEntries(features.map(([id, , operation]) => [id, operation])) as Record<Feature, AiOperation>
const box: CSSProperties = {border: '1px solid #d7d1df', borderRadius: 6, padding: 12, background: '#fff'}
const input: CSSProperties = {boxSizing: 'border-box', width: '100%', border: '1px solid #aaa0b8', borderRadius: 4, padding: '8px 10px', font: 'inherit'}
const button: CSSProperties = {border: 0, borderRadius: 4, padding: '9px 14px', fontWeight: 700, cursor: 'pointer'}

function valueAt(document: Record<string, unknown> | undefined, path: string): string {
  const editionMatch = /^marketEditions\[_key=="([^"]+)"\]\.([a-zA-Z]+)$/.exec(path)
  if (editionMatch && Array.isArray(document?.marketEditions)) {
    const edition = document.marketEditions.find((item) =>
      typeof item === 'object' && item !== null && item._key === editionMatch[1])
    return typeof edition === 'object' && edition !== null && typeof edition[editionMatch[2]!] === 'string'
      ? edition[editionMatch[2]!] as string
      : ''
  }
  let value: unknown = document
  for (const part of path.split('.')) {
    if (typeof value !== 'object' || value === null) return ''
    value = (value as Record<string, unknown>)[part]
  }
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.every((item) => typeof item === 'object' && item !== null)) {
    return value.flatMap((block) => {
      const children = (block as Record<string, unknown>).children
      return Array.isArray(children)
        ? children.map((child) => typeof child === 'object' && child !== null &&
          typeof (child as Record<string, unknown>).text === 'string'
          ? (child as Record<string, unknown>).text as string : '').join('')
        : []
    }).join('\n')
  }
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value.join(', ')
    : ''
}

function fieldsForFeature(feature: Feature, fields: string[]): string[] {
  if (feature === 'summary') return fields.filter((field) => field === 'summary' || field.endsWith('.summary') || field === 'dek' || field.endsWith('.dek'))
  if (feature === 'reportAbstract') return fields.filter((field) => field === 'dek' || field.endsWith('.dek'))
  if (feature === 'altText') return fields.filter((field) => field === 'altText')
  if (feature === 'seoMetadata') return fields.filter((field) => field.includes('meta'))
  if (feature === 'tags') return fields.filter((field) => field === 'topics')
  if (feature === 'transcriptCleanup') return fields.filter((field) => field === 'transcript')
  if (feature === 'chapters') return fields.filter((field) => field === 'chapterNotes')
  if (feature === 'newsletter') return fields.filter((field) => field === 'newsletterVariants')
  if (feature === 'internalLinks') return fields.filter((field) => field === 'internalLinkSuggestions')
  if (feature === 'marketAdaptation' || feature === 'translation') {
    return fields.filter((field) => field.startsWith('marketEditions['))
  }
  return fields
}

function defaultLength(feature: Feature, field: string): number {
  if (field.endsWith('metaTitle')) return 60
  if (field.endsWith('metaDescription')) return 160
  if (feature === 'transcriptCleanup') return 12000
  if (feature === 'chapters') return 4000
  if (feature === 'reportAbstract') return 900
  if (feature === 'summary') return 320
  if (feature === 'newsletter' || feature === 'tags' || feature === 'altText') return 300
  if (field.endsWith('title') || field === 'name' || field === 'role') return 120
  return 2000
}

function editableFields(document: Record<string, unknown> | undefined, type: string): string[] {
  const fields = (assistantFieldConfigsByType[type] ?? []).map(({path}) => path)
  const editionFields: Record<string, readonly string[]> = {
    page: ['title', 'summary'],
    publication: ['title', 'dek'],
    person: ['name', 'role'],
    organization: ['name', 'website'],
  }
  const editions = document?.marketEditions
  if (!Array.isArray(editions) || !editionFields[type]) return fields
  for (const edition of editions) {
    if (typeof edition !== 'object' || edition === null || typeof edition._key !== 'string') continue
    for (const name of editionFields[type]) {
      // _key selectors preserve the intended edition if editors reorder the array.
      fields.push(`marketEditions[_key=="${edition._key}"].${name}`)
    }
  }
  return fields
}

function AssistantPanel({props, onClose}: {props: DocumentActionProps; onClose: () => void}) {
  const client = useClient({apiVersion: '2025-02-19'})
  const document = (props.draft ?? props.published) as Record<string, unknown> | undefined
  const fields = editableFields(document, props.type)
  const [market, setMarket] = useState<AiMarket>('uae')
  const [feature, setFeature] = useState<Feature>('summary')
  const [field, setField] = useState(fields[0] ?? '')
  const currentValue = useMemo(() => valueAt(document, field), [document, field])
  const [instructions, setInstructions] = useState('')
  const [sourceIds, setSourceIds] = useState('')
  const contentClass = document?.assistantContentClass === 'public' ||
    document?.assistantContentClass === 'internal'
    ? document.assistantContentClass
    : undefined
  const [language, setLanguage] = useState('en')
  const [maxLength, setMaxLength] = useState(320)
  const [credential, setCredential] = useState('')
  const [reviewerCredential, setReviewerCredential] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [suggestion, setSuggestion] = useState<AiSuggestion>()
  const [suggestionContext, setSuggestionContext] = useState<SuggestionContext>()
  const [editedValue, setEditedValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const apiOptions = {
    baseUrl: process.env.SANITY_STUDIO_API_BASE_URL ?? '',
    runsPath: process.env.SANITY_STUDIO_GOVERNED_AI_RUNS_PATH,
    credential,
  }
  const rollout = (process.env.SANITY_STUDIO_GOVERNED_AI_FEATURES ??
    'summary,reportAbstract,transcriptCleanup,newsletter,seoMetadata,tags,altText,qualityReview')
    .split(',').map((item) => item.trim()).filter(Boolean)
  const featureEnabled = (item: Feature) => rollout.includes('all') || rollout.includes(item)
  const compatibleFields = fieldsForFeature(feature, fields)
  const selectableFeature = (item: Feature) =>
    featureEnabled(item) && fieldsForFeature(item, fields).length > 0

  async function generate() {
    setBusy(true)
    setError('')
    setNotice('')
    setSuggestion(undefined)
    try {
      if (!featureEnabled(feature)) throw new Error(`${featureLabel[feature]} is not enabled in this rollout.`)
      if (!compatibleFields.includes(field)) throw new Error(`${featureLabel[feature]} is not available for this field.`)
      const mayStartEmpty = [
        'draft', 'summary', 'reportAbstract', 'chapters', 'newsletter',
        'marketAdaptation', 'translation', 'altText', 'seoMetadata', 'tags',
        'internalLinks',
      ].includes(feature)
      if (!currentValue.trim() && !mayStartEmpty) throw new Error('Choose a non-empty field for this action.')
      if (!/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(language)) throw new Error('Use a valid language code, for example en, ar, or tr.')
      if (!Number.isInteger(maxLength) || maxLength < 1 || maxLength > 12000) throw new Error('Maximum length must be an integer from 1 to 12,000.')
      const revisionId = typeof document?._rev === 'string' ? document._rev : undefined
      if (!revisionId) throw new Error('Save or reopen this document before requesting assistance.')
      if (!props.draft) throw new Error('Create and save an editable draft before requesting assistance. AI suggestions never patch the published document.')
      if (!contentClass) throw new Error('Classify this document as public or internal before requesting assistance.')
      const storage = assistantFieldStorage(props.type, field)
      if (!storage) throw new Error('This field does not have an approved AI patch serializer.')
      const requestId = crypto.randomUUID().replaceAll('-', '')
      const result = await requestSuggestion(apiOptions, {
        requestId,
        subjectId: props.id.replace(/^drafts\./, ''),
        market,
        operation: featureOperation[feature],
        draft: currentValue,
        sourceIds: parseSourceIds(sourceIds),
        contentClass,
        target: {fieldPath: field, contentType: props.type, language, maxLength, revisionId},
        instructions: instructions.trim(),
      })
      setSuggestion(result)
      setSuggestionContext({field, before: currentValue, maxLength, revisionId, storage})
      setEditedValue(result.suggestion)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The assistant request failed safely.')
    } finally {
      setBusy(false)
    }
  }

  async function decide(decision: AiDecision) {
    if (!suggestion || !suggestionContext) return
    setBusy(true)
    setError('')
    try {
      const reason = suggestionContext.decisionReason ?? decisionReason.trim()
      if (reason.length < 3) throw new Error('Give a decision reason of at least 3 characters.')
      const decisionOptions = {...apiOptions, credential: reviewerCredential}
      if (decision === 'rejected') {
        setSuggestionContext({...suggestionContext, decisionReason: reason})
        await recordDecision(decisionOptions, {requestId: suggestion.requestId, decision, reason})
        setSuggestion(undefined)
        setSuggestionContext(undefined)
        setNotice('Suggestion rejected. The document was not changed.')
        return
      }
      if (!editedValue.trim()) throw new Error('The accepted field value cannot be empty.')
      if (editedValue.length > suggestionContext.maxLength) {
        throw new Error(`The edited value exceeds the selected ${suggestionContext.maxLength}-character maximum.`)
      }
      let resultingRevisionId = suggestionContext.appliedRevisionId
      if (!resultingRevisionId) {
        const publishedId = props.id.replace(/^drafts\./, '')
        const draftId = `drafts.${publishedId}`
        const patchValue = serializeAssistantPatchValue(suggestionContext.storage, editedValue)
        const currentDraft = await client.fetch<Record<string, unknown> | null>(
          '*[_id == $id][0]', {id: draftId},
        )
        if (!currentDraft || typeof currentDraft._rev !== 'string') {
          throw new Error('A current draft revision could not be opened safely.')
        }
        if (valueAt(currentDraft, suggestionContext.field) !== suggestionContext.before) {
          throw new Error('This field changed after the suggestion was generated. Discard it and request a new suggestion.')
        }
        if (currentDraft._rev !== suggestionContext.revisionId) {
          throw new Error('This document changed after the suggestion was generated. Discard it and request a new suggestion.')
        }
        const patched = await client.patch(draftId)
          .ifRevisionId(currentDraft._rev)
          .set({
            [suggestionContext.field]: patchValue,
            assistantReview: {
              _type: 'assistantReview',
              requestId: suggestion.requestId,
              fieldPath: suggestionContext.field,
              appliedAt: new Date().toISOString(),
            },
          })
          .commit()
        resultingRevisionId = patched._rev
        setSuggestionContext({
          ...suggestionContext,
          decisionReason: reason,
          appliedRevisionId: resultingRevisionId,
        })
      }
      try {
        await recordDecision(decisionOptions, {
          requestId: suggestion.requestId,
          decision: 'accepted',
          reason,
          resultingRevisionId,
        })
      } catch {
        setError('The draft is saved and quarantined, but its decision audit is incomplete. Retry this same decision and reason; if it still fails, contact an administrator.')
        return
      }
      setNotice('Suggestion applied to the draft. It is not approved or published.')
      setSuggestion(undefined)
      setSuggestionContext(undefined)
      props.onComplete()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The decision could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return <div style={{padding: 18, display: 'grid', gap: 14, maxWidth: 900}}>
    <div style={{...box, background: '#f5f0fb'}}>
      <strong>Limited rollout · governed assistance pilot</strong>
      <div style={{marginTop: 5}}>AI only proposes draft field text. It cannot approve, change lifecycle state, schedule, or publish. Check every claim, citation, market nuance, and rights obligation yourself.</div>
    </div>
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10}}>
      <label>Market<select style={input} value={market} onChange={(event) => setMarket(event.target.value as AiMarket)}>
        <option value="uae">UAE (canonical)</option><option value="ksa">KSA</option>
        <option value="turkiye">Türkiye</option><option value="europe">Europe</option>
      </select></label>
       <label>Assistant action<select style={input} value={feature} onChange={(event) => {
         const next = event.target.value as Feature
         setFeature(next)
         const nextField = fieldsForFeature(next, fields)[0] ?? fields[0] ?? ''
         setField(nextField)
         setMaxLength(defaultLength(next, nextField))
       }}>
         {features.map(([id]) => <option key={id} value={id} disabled={!selectableFeature(id)}>
           {featureLabel[id]}{featureEnabled(id) ? (fieldsForFeature(id, fields).length ? '' : ' (not for this document)') : ' (not in rollout)'}</option>)}
      </select></label>
       <label>Field<select style={input} value={field} onChange={(event) => {
         setField(event.target.value)
         setMaxLength(defaultLength(feature, event.target.value))
       }}>
         {compatibleFields.map((item) => <option key={item} value={item}>{item}</option>)}
      </select></label>
    </div>
    {!featureEnabled(feature) && <div role="alert" style={{...box, borderColor: '#8a4b00'}}>
      {featureLabel[feature]} is disabled for this rollout. Select an enabled action or contact the rollout owner.
    </div>}
    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10}}>
      <label>Language (BCP 47)<input style={input} value={language} maxLength={5}
        onChange={(event) => setLanguage(event.target.value)} placeholder="en, ar, tr, en-GB" /></label>
      <label>Maximum suggested length<input style={input} type="number" min={1} max={12000} value={maxLength}
        onChange={(event) => setMaxLength(Number(event.target.value))} /></label>
    </div>
    <div style={box}><strong>Server-verified content classification</strong>
      <div>{contentClass ?? 'Not classified — assistance is blocked'}</div>
    </div>
    <div style={{fontSize: 13, color: '#665e70'}}>
      Restricted, personal, enquiry, subscriber, secret, and client-confidential content is prohibited and must not be submitted.
    </div>
    <label>Purpose and constraints<textarea style={input} rows={3} value={instructions}
      onChange={(event) => setInstructions(event.target.value)}
      placeholder="Audience, tone, required facts, exclusions, length, and desired outcome" /></label>
    <label>Approved source document IDs (one per line)<textarea style={input} rows={3} value={sourceIds}
      onChange={(event) => setSourceIds(event.target.value)}
      placeholder="approved-source.product-brief&#10;approved-source.market-evidence" /></label>
    <label>Requesting CMS principal credential<input style={input} type="password" autoComplete="off"
      value={credential} onChange={(event) => setCredential(event.target.value)}
      placeholder="Bearer credential, held in this dialog only" /></label>
    {!suggestion && <button style={{...button, background: '#563477', color: '#fff'}} disabled={busy || !field}
      onClick={generate}>{busy ? 'Requesting…' : 'Request reviewable suggestion'}</button>}
    {error && <div role="alert" style={{...box, borderColor: '#b42318', color: '#8a1c13'}}>{error}</div>}
    {notice && <div role="status" style={{...box, borderColor: '#36845b'}}>{notice}</div>}
    {suggestion && <>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12}}>
         <section style={{...box, background: '#f7f7f7'}}><strong>Current · {suggestionContext?.field}</strong>
           <div style={{whiteSpace: 'pre-wrap', marginTop: 8}}>{suggestionContext?.before}</div></section>
        <section style={box}><strong>Suggested · editable before acceptance</strong>
          <textarea aria-label="Editable suggested value" style={{...input, marginTop: 8}} rows={8}
            value={editedValue} onChange={(event) => setEditedValue(event.target.value)} /></section>
      </div>
      <section style={box}><strong>Service diff</strong>
        {suggestion.diff.length === 0 ? <div>No text change reported.</div> :
          suggestion.diff.map((change, index) => <div key={index}>
            <div style={{color: '#8a1c13', whiteSpace: 'pre-wrap'}}>− {change.before}</div>
            <div style={{color: '#28704d', whiteSpace: 'pre-wrap'}}>+ {change.after}</div>
          </div>)}</section>
      <section style={box}><strong>Uncertainties</strong>
        {suggestion.uncertainties.length === 0 ? <div>None reported. Human verification is still required.</div> :
          <ul>{suggestion.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul>}
        <strong>Quality gates · {suggestion.policyVersion}</strong>
        <ul>{suggestion.qualityGates.map((gate) =>
          <li key={gate.gate}>{gate.passed ? 'Passed' : 'Failed'} — {gate.gate}: {gate.detail}</li>)}</ul>
      </section>
      <section style={box}><strong>Verified citations</strong>
        <ol>{suggestion.citations.map((citation, index) => <li key={`${citation.sourceId}-${index}`}>
           <strong>{citation.sourceId}</strong><div>Claim: “{citation.claim}”</div>
           <div>Source: “{citation.quote}”</div></li>)}</ol></section>
      <label>Independent reviewer decision reason<textarea style={input} rows={2} value={decisionReason}
        onChange={(event) => setDecisionReason(event.target.value)}
        placeholder="Why this suggestion is accepted, edited, or rejected" /></label>
      <label>Reviewer CMS principal credential<input style={input} type="password" autoComplete="off"
        value={reviewerCredential} onChange={(event) => setReviewerCredential(event.target.value)}
        placeholder="Different reviewer/publisher/admin principal required" /></label>
      <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
        <button style={{...button, background: '#28704d', color: '#fff'}} disabled={busy}
          onClick={() => decide('accepted')}>
          {editedValue === suggestion.suggestion ? 'Accept into draft' : 'Accept edited version'}</button>
        <button style={{...button, background: '#f0eaf5', color: '#3b2452'}} disabled={busy}
          onClick={() => decide('rejected')}>Reject suggestion</button>
        <button style={{...button, background: '#eee'}} disabled={busy}
           onClick={() => {
             setSuggestion(undefined)
             setSuggestionContext(undefined)
           }}>Discard and request another</button>
      </div>
    </>}
    <button style={{...button, background: 'transparent', justifySelf: 'start'}} disabled={busy} onClick={onClose}>Close</button>
  </div>
}

export const governedAiAction: DocumentActionComponent = (props: DocumentActionProps) => {
  const [open, setOpen] = useState(false)
  const rollout = process.env.SANITY_STUDIO_GOVERNED_AI_ROLLOUT ?? 'pilot'
  const fields = assistantFieldConfigsByType[props.type] ?? []
  const disabled = rollout === 'off' || fields.length === 0
  return {
    label: 'Governed AI assistant',
    disabled,
    title: rollout === 'off' ? 'Governed AI assistance is not enabled in this rollout.'
      : fields.length === 0 ? 'This document has no supported plain-text fields.' : undefined,
    onHandle: () => setOpen(true),
    dialog: open ? {
      type: 'dialog', id: 'governed-ai-assistant', header: 'Governed AI assistant',
      onClose: () => setOpen(false),
      content: <AssistantPanel props={props} onClose={() => setOpen(false)} />,
    } : undefined,
  }
}
governedAiAction.displayName = 'CogniriseGovernedAiAction'