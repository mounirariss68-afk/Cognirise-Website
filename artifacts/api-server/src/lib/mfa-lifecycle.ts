export type TimedSecret = {
  secret: string;
  expiresAt: Date;
};

export type MfaFailureReason =
  | "not_found"
  | "expired"
  | "secret_mismatch"
  | "code_mismatch";

export class EnrollmentStore {
  private readonly entries = new Map<string, TimedSecret>();

  getOrCreate(key: string, create: () => TimedSecret, now = new Date()): TimedSecret {
    const current = this.entries.get(key);
    if (current && current.expiresAt > now) return current;
    const enrollment = create();
    this.entries.set(key, enrollment);
    return enrollment;
  }

  get(key: string): TimedSecret | undefined {
    return this.entries.get(key);
  }

  delete(key: string): void {
    this.entries.delete(key);
  }
}

export class LoginChallengeStore {
  private readonly entries = new Map<string, TimedSecret & { userId: string }>();

  set(key: string, challenge: TimedSecret & { userId: string }): void {
    this.entries.set(key, challenge);
  }

  get(key: string): (TimedSecret & { userId: string }) | undefined {
    return this.entries.get(key);
  }

  consume(key: string): (TimedSecret & { userId: string }) | undefined {
    const challenge = this.entries.get(key);
    if (challenge) this.entries.delete(key);
    return challenge;
  }
}

export function classifyMfaFailure(
  entry: TimedSecret | undefined,
  codeMatches: boolean,
  now = new Date(),
  expectedSecret?: string,
): MfaFailureReason | null {
  if (!entry) return "not_found";
  if (entry.expiresAt <= now) return "expired";
  if (expectedSecret !== undefined && entry.secret !== expectedSecret) return "secret_mismatch";
  if (!codeMatches) return "code_mismatch";
  return null;
}