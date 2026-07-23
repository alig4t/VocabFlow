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
  plugins: {
    // Security layer 1b: encrypt the runtime SQLite DB with SQLCipher. Enabling
    // this makes the plugin store the DB passphrase in Keystore-backed
    // EncryptedSharedPreferences (AES256_GCM MasterKey). The passphrase itself
    // is a random per-device value generated in db.ts — never in the bundle.
    // See SECURITY-REVIEW.md.
    CapacitorSQLite: {
      androidIsEncryption: true,
    },
    LocalNotifications: {
      // Status-bar icon: a white open-book silhouette (res/drawable-*/ic_stat_notify.png),
      // matching the book element in the وکب فلو logo. Replaces the default "!" icon.
      // PNGs (not a vector) because minSdk=22 and vector notification icons are
      // buggy before API 24.
      smallIcon: 'ic_stat_notify',
      // Accent color of the notification (brand gold).
      iconColor: '#ECAD26',
    },
  },
}

export default config
