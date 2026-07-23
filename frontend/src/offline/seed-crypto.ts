// Runtime decryption of the bundled seed blobs produced by scripts/encrypt-seed.mjs.
//
// The key is derived from VITE_SEED_SECRET (embedded in the JS bundle at build
// time), so this is obfuscation-grade at-rest protection: it defeats casual
// `unzip app.apk && cat words.json` extraction, not a determined reverser who
// can pull the secret out of the bundle. Pairs with (planned) SQLCipher
// encryption of the runtime DB. See SECURITY-REVIEW.md.

const encoder = new TextEncoder()
let keyPromise: Promise<CryptoKey> | null = null

function getKey(): Promise<CryptoKey> {
  if (keyPromise) return keyPromise
  const secret = import.meta.env.VITE_SEED_SECRET as string | undefined
  if (!secret) throw new Error('VITE_SEED_SECRET is not set at build time')
  // SHA-256(secret) → 32-byte AES-256 key. Must mirror encrypt-seed.mjs exactly.
  keyPromise = crypto.subtle
    .digest('SHA-256', encoder.encode(secret))
    .then((raw) => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']))
  return keyPromise
}

/**
 * Decrypt one seed blob laid out as [12-byte IV][ciphertext][16-byte GCM tag]
 * (see encrypt-seed.mjs) and JSON.parse the plaintext.
 */
export async function decryptSeedJson(buf: ArrayBuffer): Promise<unknown> {
  const raw = new Uint8Array(buf)
  const iv = raw.subarray(0, 12)
  const data = raw.subarray(12) // ciphertext followed by the GCM auth tag
  const key = await getKey()
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
  return JSON.parse(new TextDecoder().decode(plain))
}
