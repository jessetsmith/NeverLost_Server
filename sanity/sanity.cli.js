import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '492nxyas',
    dataset: 'production',
  },
  studioHost: 'neverlost.sanity.studio',
  /**
   * Enable auto-updates for studios.
   * Learn more at https://www.sanity.io/docs/cli#auto-updates
   */
  autoUpdates: true,
})
