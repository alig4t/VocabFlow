import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'ir.vocabflow.app',
  appName: 'VocabFlow',
  webDir: 'dist',
  // Fully offline: bundle the built web app, no remote server.
  android: {
    // Debug builds allow http/mixed content; not needed offline but harmless.
    allowMixedContent: true,
  },
}

export default config
