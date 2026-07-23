// Build-time encryption of the bundled seed data.
//
// Reads plaintext book JSON from ../seed-src (which is OUTSIDE public/, so it is
// never packaged into the APK) and writes AES-256-GCM encrypted blobs to
// ../public/seed-enc/*.enc, which DO get bundled. The runtime decrypts them in
// src/offline/seed-crypto.ts before seeding SQLite.
//
// Threat model: this defeats trivial `unzip app.apk && cat words.json`
// extraction. The key is derived from VITE_SEED_SECRET, which is also embedded
// in the JS bundle, so a determined reverser can still recover it. This is
// obfuscation-grade at-rest protection, meant to raise the cost of casual
// piracy — not to stop a motivated attacker. See SECURITY-REVIEW.md.
//
// Run whenever seed-src changes:  npm run seed:encrypt
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { createHash, createCipheriv, randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadEnv } from 'vite'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Single source of truth for the secret: the same .env Vite reads for the app,
// so the build-time key and the runtime key are guaranteed to match.
const env = loadEnv('production', root, '')
const secret = env.VITE_SEED_SECRET
if (!secret) {
  console.error('✗ VITE_SEED_SECRET is missing. Add it to frontend/.env')
  process.exit(1)
}
const key = createHash('sha256').update(secret, 'utf8').digest() // 32 bytes

const SRC = join(root, 'seed-src')
const OUT = join(root, 'public', 'seed-enc')

const manifest = JSON.parse(readFileSync(join(SRC, 'manifest.json'), 'utf8'))

if (existsSync(OUT)) rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

let total = 0
for (const name of manifest) {
  const plain = readFileSync(join(SRC, name))
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  const tag = cipher.getAuthTag()
  // Layout: [12-byte IV][ciphertext][16-byte GCM tag] — matches seed-crypto.ts.
  const blob = Buffer.concat([iv, ciphertext, tag])
  writeFileSync(join(OUT, `${name}.enc`), blob)
  total += blob.length
}

// The manifest only lists filenames (already visible via book covers/slugs), so
// it stays plaintext — the valuable words/meanings/examples are encrypted.
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest))

console.log(
  `✓ Encrypted ${manifest.length} seed files -> public/seed-enc (${(total / 1e6).toFixed(1)} MB)`,
)
