import type {StructureResolver} from 'sanity/structure'

const marketCodes = [
  ['uae', 'UAE · canonical'],
  ['ksa', 'KSA'],
  ['turkiye', 'Türkiye'],
  ['europe', 'Europe'],
] as const
const marketDocumentTypes = [
  ['page', 'Pages'],
  ['publication', 'Publications'],
  ['navigation', 'Navigation'],
  ['person', 'People and advisors'],
  ['organization', 'Organizations and partners'],
] as const

export const deskStructure: StructureResolver = (S) =>
  S.list()
    .title('Cognirise Editorial')
    .items([
      S.listItem()
        .title('Global settings')
        .child(S.document().schemaType('globalSettings').documentId('globalSettings')),
      S.listItem()
        .title('Market desks')
        .child(
          S.list()
            .title('Market desks')
            .items(
              marketCodes.map(([code, title]) =>
                S.listItem()
                  .title(title)
                  .child(
                    S.list()
                      .title(title)
                      .items(
                        marketDocumentTypes.map(([type, label]) =>
                          S.documentTypeListItem(type).title(label).child(
                          S.documentList()
                            .title(`${title} ${label.toLowerCase()}`)
                            .schemaType(type)
                            .filter('_type == $type && $code in marketEditions[].market->code')
                            .params({type, code}),
                          ),
                        ),
                      ),
                  ),
              ),
            ),
        ),
      S.divider(),
      ...['page', 'publication', 'navigation', 'person', 'organization'].map((type) =>
        S.documentTypeListItem(type),
      ),
      S.divider(),
      S.listItem().title('Evidence and governance').child(
        S.list().title('Evidence and governance').items(
          ['claim', 'proof', 'referenceSource', 'revisionRecord', 'auditEvent'].map((type) =>
            S.documentTypeListItem(type),
          ),
        ),
      ),
      S.listItem().title('Operations').child(
        S.list().title('Operations').items(
          ['market', 'mediaAsset', 'redirect'].map((type) => S.documentTypeListItem(type)),
        ),
      ),
    ])