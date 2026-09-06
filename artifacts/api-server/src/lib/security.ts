import {
  createHash,
  createHmac,
  createDecipheriv,
  createCipheriv,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";
function scrypt(
  password: string,
  salt: Buffer,
  length: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(password, salt, length, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}
const PASSWORD_KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const [algorithm, n, r, p, saltValue, keyValue] = encoded.split("$");
  if (
    algorithm !== "scrypt" ||
    !n ||
    !r ||
    !p ||
    !saltValue ||
    !keyValue
  ) {
    return false;
  }
  const expected = Buffer.from(keyValue, "base64url");
  if (expected.length !== PASSWORD_KEY_LENGTH) return false;
  try {
    const actual = await scrypt(
      password,
      Buffer.from(saltValue, "base64url"),
      expected.length,
      {
        N: Number(n),
        r: Number(r),
        p: Number(p),
        maxmem: 64 * 1024 * 1024,
      },
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function verifyRecoveryCode(code: string, hashes: readonly string[]): number {
  const candidate = Buffer.from(hashToken(normalizeRecoveryCode(code)));
  return hashes.findIndex((hash) => {
    const expected = Buffer.from(hash);
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  });
}

export function hashRecoveryCode(code: string): string {
  return hashToken(normalizeRecoveryCode(code));
}

export function isStrongPassword(password: string): boolean {
  return password.length >= 12 &&
    /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password);
}

function normalizeRecoveryCode(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replace(/=+$/g, "").replace(/\s/g, "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

export function totp(
  secret: string,
  now = Date.now(),
  stepSeconds = 30,
): string {
  const counter = Math.floor(now / 1000 / stepSeconds);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary =
    ((digest[offset]! & 0x7f) << 24) |
    ((digest[offset + 1]! & 0xff) << 16) |
    ((digest[offset + 2]! & 0xff) << 8) |
    (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  for (const drift of [-1, 0, 1]) {
    const candidate = Buffer.from(totp(secret, now + drift * 30_000));
    const supplied = Buffer.from(code);
    if (candidate.length === supplied.length && timingSafeEqual(candidate, supplied)) {
      return true;
    }
  }
  return false;
}

/** Decrypts the versioned AES-GCM envelope used by cms_totp_credentials. */
export function decryptTotpSecret(envelope: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  const [version, ivValue, tagValue, ciphertextValue] = envelope.split(":");
  if (version !== "v1" || !ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid TOTP credential envelope");
  }
  const key = createHash("sha256").update(secret).digest();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function encryptTotpSecret(value: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `v1:${iv.toString("base64url")}:${cipher.getAuthTag().toString("base64url")}:${ciphertext.toString("base64url")}`;
}

export function randomBase32(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return Array.from(randomBytes(length), (byte) => alphabet[byte & 31]).join("");
}

export function requestOrigin(input: {
  protocol: string;
  host?: string;
}): string | null {
  if (!input.host) return null;
  return `${input.protocol}://${input.host}`.toLowerCase();
}

export function isExactSameOrigin(
  origin: string | undefined,
  expected: string | null,
): boolean {
  if (!origin || !expected) return false;
  try {
    return new URL(origin).origin.toLowerCase() === new URL(expected).origin.toLowerCase();
  } catch {
    return false;
  }
}

export class SlidingWindowThrottle {
  private readonly attempts = new Map<string, number[]>();
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly maxKeys: number;

  constructor(
    limit: number,
    windowMs: number,
    maxKeys = 10_000,
  ) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.maxKeys = maxKeys;
  }

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
    if (this.attempts.size > this.maxKeys) this.prune(now);
    const cutoff = now - this.windowMs;
    const recent = (this.attempts.get(key) ?? []).filter((time) => time > cutoff);
    if (recent.length >= this.limit) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Math.ceil((recent[0]! + this.windowMs - now) / 1000)),
      };
    }
    recent.push(now);
    this.attempts.set(key, recent);
    return { allowed: true, retryAfter: 0 };
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }

  private prune(now: number): void {
    const cutoff = now - this.windowMs;
    for (const [key, values] of this.attempts) {
      const recent = values.filter((value) => value > cutoff);
      if (recent.length) this.attempts.set(key, recent);
      else this.attempts.delete(key);
    }
  }
}
