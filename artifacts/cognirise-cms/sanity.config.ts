import {createElement} from 'react'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {deskStructure} from './src/deskStructure'
import {governedDocumentTypes, immutableDocumentTypes} from './src/governance/policy'
import {guardPublishAction} from './src/governance/publishAction'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET
const basePath = process.env.BASE_PATH || '/'

if (!projectId || !dataset) {
  throw new Error('Set the public SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET variables.')
}

const BrandLogo = () =>
  createElement(
    'div',
    {style: {fontWeight: 800, letterSpacing: '-0.04em', color: '#28174d'}},
    'COGNIRISE',
  )

export default defineConfig({
  name: 'cognirise-editorial',
  title: 'Cognirise Editorial',
  projectId,
  dataset,
  basePath,
  icon: BrandLogo,
  plugins: [
    structureTool({structure: deskStructure}),
    visionTool({defaultApiVersion: '2025-02-19'}),
  ],
  schema: {types: schemaTypes},
  document: {
    newDocumentOptions: (previous) =>
      previous.filter(
        (template) =>
          !immutableDocumentTypes.has(template.templateId) &&
          template.templateId !== 'globalSettings',
      ),
    actions: (previous, context) => {
      if (immutableDocumentTypes.has(context.schemaType)) {
        return context.documentId?.startsWith('drafts.') ? previous : []
      }
      if (!governedDocumentTypes.has(context.schemaType)) return previous
      return previous.map((action) =>
        action.action === 'publish' ? guardPublishAction(action) : action,
      )
    },
  },
})