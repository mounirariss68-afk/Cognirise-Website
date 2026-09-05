export type AssistantFieldStorage = 'plainText' | 'stringArray' | 'portableText'

export interface AssistantFieldConfig {
  path: string
  storage: AssistantFieldStorage
}

const plainText = (path: string): AssistantFieldConfig => ({path, storage: 'plainText'})

export const assistantFieldConfigsByType: Record<string, readonly AssistantFieldConfig[]> = {
  globalSettings: [
    plainText('organization.name'),
    plainText('defaultSeo.metaTitle'),
    plainText('defaultSeo.metaDescription'),
  ],
  page: [
    plainText('title'),
    plainText('summary'),
    {path: 'topics', storage: 'stringArray'},
    plainText('internalLinkSuggestions'),
    plainText('seo.metaTitle'),
    plainText('seo.metaDescription'),
  ],
  navigation: [plainText('title')],
  publication: [
    plainText('title'),
    plainText('dek'),
    {path: 'topics', storage: 'stringArray'},
    plainText('newsletterVariants'),
    plainText('internalLinkSuggestions'),
    plainText('seo.metaTitle'),
    plainText('seo.metaDescription'),
  ],
  person: [plainText('name'), plainText('role')],
  organization: [plainText('name'), plainText('website')],
  proof: [plainText('title'), plainText('value'), plainText('context')],
  claim: [plainText('statement')],
  mediaAsset: [
    plainText('title'),
    plainText('altText'),
    plainText('caption'),
    {path: 'transcript', storage: 'portableText'},
    plainText('chapterNotes'),
  ],
}

export function assistantFieldStorage(
  contentType: string,
  fieldPath: string,
): AssistantFieldStorage | undefined {
  if (/^marketEditions\[_key=="[^"]+"\]\.[a-zA-Z]+$/.test(fieldPath)) {
    return 'plainText'
  }
  return assistantFieldConfigsByType[contentType]?.find(({path}) => path === fieldPath)?.storage
}

export function serializeAssistantPatchValue(
  storage: AssistantFieldStorage,
  editedValue: string,
  createKey: () => string = () => crypto.randomUUID().replaceAll('-', '').slice(0, 12),
): string | string[] | Array<Record<string, unknown>> {
  if (storage === 'stringArray') {
    return editedValue.split(',').map((item) => item.trim()).filter(Boolean)
  }
  if (storage === 'portableText') {
    return editedValue.split(/\n+/).filter(Boolean).map((text) => ({
      _type: 'block',
      _key: createKey(),
      style: 'normal',
      markDefs: [],
      children: [{
        _type: 'span',
        _key: createKey(),
        text,
        marks: [],
      }],
    }))
  }
  return editedValue
}