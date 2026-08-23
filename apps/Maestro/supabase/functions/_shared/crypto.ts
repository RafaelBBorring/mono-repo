function bytesToBase64(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string) {
  const binary = atob(value)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function encryptionKey() {
  const secret = Deno.env.get('INTEGRATION_ENCRYPTION_KEY')
  if (!secret || secret.length < 24) throw new Error('Chave de criptografia do servidor não configurada.')
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await encryptionKey()
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value))
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(encrypted))}`
}

export async function decryptSecret(value: string) {
  const [version, encodedIv, encodedPayload] = value.split('.')
  if (version !== 'v1' || !encodedIv || !encodedPayload) throw new Error('Segredo armazenado em formato inválido.')
  const key = await encryptionKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(encodedIv) },
    key,
    base64ToBytes(encodedPayload),
  )
  return new TextDecoder().decode(decrypted)
}

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
