// AES-256-GCM encryption using Web Crypto API (Edge runtime compatible)

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2 + i), 16)
  }
  return bytes.buffer
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

async function getKey(): Promise<CryptoKey> {
  const keyHex = process.env.ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  const keyBuffer = hexToBuffer(keyHex)
  return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encrypt(data: string): Promise<string> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encodedData = new TextEncoder().encode(data)

  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedData)

  const ivHex = bufferToHex(iv.buffer)
  const encryptedBase64 = bufferToBase64(encryptedBuffer)

  // Format: iv_hex:encrypted_base64
  return `${ivHex}:${encryptedBase64}`
}

export async function decrypt(encryptedData: string): Promise<string> {
  const key = await getKey()
  const [ivHex, encryptedBase64] = encryptedData.split(':')

  if (!ivHex || !encryptedBase64) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = new Uint8Array(hexToBuffer(ivHex))
  const encryptedBuffer = base64ToBuffer(encryptedBase64)

  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBuffer)

  return new TextDecoder().decode(decryptedBuffer)
}
