// Locks saved sign-in tokens (Ravelry) with AES-256-GCM before they reach the database. Server only.
// Stored as base64 "iv.tag.ciphertext"; the key is a SHA-256 of TOKEN_ENCRYPTION_KEY.
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'

function key() {
  const secret = process.env.TOKEN_ENCRYPTION_KEY
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is not set')
  return createHash('sha256').update(secret, 'utf8').digest()
}

export function encryptionConfigured() {
  return Boolean(process.env.TOKEN_ENCRYPTION_KEY)
}

export function encrypt(text) {
  if (text === null || text === undefined || text === '') return null
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const body = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${body.toString('base64')}`
}

export function decrypt(payload) {
  if (!payload) return null
  const parts = String(payload).split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) throw new Error('That saved token is not in the expected form.')
  const [iv, tag, body] = parts.map((p) => Buffer.from(p, 'base64'))
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8')
}

// A random value for OAuth state checks
export function randomToken(bytes = 24) {
  return randomBytes(bytes).toString('base64url')
}

// Compares two strings without leaking how much of them matched
export function safeEqual(a, b) {
  const x = Buffer.from(String(a ?? ''))
  const y = Buffer.from(String(b ?? ''))
  return x.length > 0 && x.length === y.length && timingSafeEqual(x, y)
}
