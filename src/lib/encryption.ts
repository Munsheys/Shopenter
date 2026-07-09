import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

/**
 * Encrypt a secret using AES-256-CBC
 * Returns encrypted string in format: iv:encryptedData
 */
export function encryptSecret(plaintext: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a secret encrypted with encryptSecret()
 */
export function decryptSecret(encrypted: string): string {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }

  const [ivHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a new encryption key (for setup/rotation)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function isEncryptionConfigured(): boolean {
  return Boolean(ENCRYPTION_KEY && ENCRYPTION_KEY.length === 64);
}

/** iv:ciphertext, iv is 16 bytes hex (32 chars) */
export function looksEncrypted(value: string): boolean {
  return /^[0-9a-f]{32}:[0-9a-f]+$/i.test(value);
}

/**
 * Encrypts if a key is configured and the value isn't already ciphertext; otherwise
 * returns the value unchanged. Used so a missing ENCRYPTION_KEY degrades to today's
 * plaintext-storage behavior instead of bricking every settings read/write.
 */
export function maybeEncrypt(value: string): string {
  if (!value || !isEncryptionConfigured() || looksEncrypted(value)) return value;
  try {
    return encryptSecret(value);
  } catch (err) {
    console.error('[encryption] Failed to encrypt value, storing as-is:', err);
    return value;
  }
}

/** Decrypts if the value looks like our ciphertext format; otherwise returns it unchanged. */
export function maybeDecrypt(value: string): string {
  if (!value || !looksEncrypted(value) || !isEncryptionConfigured()) return value;
  try {
    return decryptSecret(value);
  } catch (err) {
    console.error('[encryption] Failed to decrypt value:', err);
    return value;
  }
}
