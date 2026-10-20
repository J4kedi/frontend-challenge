/**
 * Password storage of the mock backend: PBKDF2-SHA256 (WebCrypto), 100k
 * iterations, per-user salt. Plain passwords are never persisted.
 */
const encoder = new TextEncoder()
const ITERATIONS = 100_000

const toHex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export async function hashPassword(password: string, salt: string = crypto.randomUUID()) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(salt), iterations: ITERATIONS },
    key,
    256,
  )
  return { salt, hash: toHex(bits) }
}

export async function verifyPassword(password: string, salt: string, hash: string) {
  const candidate = await hashPassword(password, salt)
  return candidate.hash === hash
}
