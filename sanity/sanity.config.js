import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes/schema'
import {colorInput} from '@sanity/color-input'

export default defineConfig({
  name: 'default',
  title: 'NeverLost',

  projectId: '492nxyas',
  dataset: 'production',

  plugins: [structureTool(), visionTool(), colorInput()],

  schema: {
    types: schemaTypes,
  },
})
