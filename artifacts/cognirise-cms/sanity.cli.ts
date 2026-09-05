import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET

if (!projectId || !dataset) {
  throw new Error('SANITY_STUDIO_PROJECT_ID and SANITY_STUDIO_DATASET are required.')
}

export default defineCliConfig({api: {projectId, dataset}})