import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  BootstrapAuthBody,
  ConfirmMfaBody,
  ChangePasswordBody,
  LoginBody,
  RecoverAuthBody,
  ConsumeAccessTokenBody,
  VerifyMfaBody,
} from "@workspace/api-zod";
import {
  authenticate,
  clearSessionCookies,
  createSession,
  publicSession,
  requireCsrf,
  type AuthContext,
  CSRF_COOKIE,
  csrfForSession,
} from "../lib/auth";
import { asyncRoute, AUTH_ERROR, throttle } from "../lib/http";
import {
  hashPassword,
  hashToken,
  randomToken,
  SlidingWindowThrottle,
  verifyPassword,
  verifyTotp,
  decryptTotpSecret,
  encryptTotpSecret,
  hashRecoveryCode,
  isStrongPassword,
  randomBase32,
} from "../lib/security";
import { isInitialSetupRequired } from "../lib/policy";
import {
  classifyMfaFailure,
  EnrollmentStore,
  LoginChallengeStore,
} from "../lib/mfa-lifecycle";

const router: IRouter = Router();
const loginLimiter = new SlidingWindowThrottle(8, 15 * 60_000);
const mfaLimiter = new SlidingWindowThrottle(8, 10 * 60_000);
const challenges = new LoginChallengeStore();
const enrollments = new EnrollmentStore();
const loginThrottle = throttle(
  loginLimiter,
  (req) => `${req.ip}:${String(req.body?.email ?? "").toLowerCase()}`,
);

router.get(
  "/auth/bootstrap",
  asyncRoute(async (_req, res) => {
    const result = await pool.query(
      `SELECT count(*)::int credentialed_accounts
         FROM cms_users u JOIN cms_password_credentials p ON p.user_id=u.id`,
    );
    res.json({
      setupRequired: isInitialSetupRequired(Number(result.rows[0].credentialed_accounts)),
      session: null,
      csrfToken: null,
    });
  }),
);

router.post(
  "/auth/bootstrap",
  loginThrottle,
  asyncRoute(async (req, res) => {
    const parsed = BootstrapAuthBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid account details." });
      return;
    }
    // Fail before creating the sole administrator if session signing is unsafe.
    csrfForSession("bootstrap-preflight");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(1029384756)");
      const existing = await client.query(
        `SELECT 1 FROM cms_users u
          JOIN cms_password_credentials p ON p.user_id=u.id LIMIT 1`,
      );
      if (existing.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Initial setup has already been completed." });
        return;
      }
      const passwordHash = await hashPassword(parsed.data.password);
      const inserted = await client.query(
        `INSERT INTO cms_users
          (display_name,email,role,status,email_verified_at)
         VALUES ($1,$2,'administrator','active',now()) RETURNING id`,
        [parsed.data.name, parsed.data.email.toLowerCase()],
      );
      await client.query(
        `INSERT INTO cms_password_credentials
         (user_id,password_hash,algorithm) VALUES ($1,$2,'scrypt')`,
        [inserted.rows[0].id, passwordHash],
      );
      await client.query("COMMIT");
      const created = await createSession(String(inserted.rows[0].id), false, req, res);
      res.status(201).json({
        authenticated: true,
        session: publicSession(created.session),
        mfaChallenge: null,
        csrfToken: created.csrfToken,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/auth/login",
  loginThrottle,
  asyncRoute(async (req, res) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      await auditLogin("", null, "failure", "invalid_request");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    const result = await pool.query(
       `SELECT u.id,p.password_hash,p.must_rotate,p.temporary_expires_at,u.status,t.encrypted_secret mfa_secret,
              (t.verified_at IS NOT NULL AND t.disabled_at IS NULL) mfa_enabled
         FROM cms_users u JOIN cms_password_credentials p ON p.user_id=u.id
         LEFT JOIN cms_totp_credentials t ON t.user_id=u.id
        WHERE lower(u.email)=lower($1) LIMIT 1`,
      [parsed.data.email],
    );
    const row = result.rows[0];
    const valid =
      row &&
      ["active","invited"].includes(row.status) &&
      (!row.must_rotate || (row.temporary_expires_at && new Date(row.temporary_expires_at) > new Date())) &&
      (await verifyPassword(parsed.data.password, row.password_hash));
    if (!valid) {
      await auditLogin(parsed.data.email, row?.id ?? null, "failure", "invalid_credentials");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    if (row.mfa_enabled) {
      const challengeToken = randomToken();
      const expiresAt = new Date(Date.now() + 5 * 60_000);
      challenges.set(hashToken(challengeToken), {
        userId: String(row.id),
        secret: decryptTotpSecret(row.mfa_secret),
        expiresAt,
      });
      res.json({
        authenticated: false,
        session: null,
        mfaChallenge: { id: challengeToken, method: "totp", expiresAt },
        csrfToken: null,
      });
      return;
    }
    await auditLogin(parsed.data.email, row.id, "success");
    await pool.query("UPDATE cms_users SET last_login_at=now() WHERE id=$1", [row.id]);
    const created = await createSession(String(row.id), false, req, res);
    res.json({
      authenticated: true,
      session: publicSession(created.session),
      mfaChallenge: null,
      csrfToken: created.csrfToken,
    });
  }),
);

router.post(
  "/auth/mfa/verify",
  throttle(mfaLimiter, (req) => `${req.ip}:${String(req.body?.challengeId ?? "")}`),
  asyncRoute(async (req, res) => {
    const parsed = VerifyMfaBody.safeParse(req.body);
    if (!parsed.success) {
      await auditLogin("", null, "failure", "invalid_mfa_request");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    const challengeKey = hashToken(parsed.data.challengeId);
    const challenge = challenges.get(challengeKey);
    const failureReason = classifyMfaFailure(
      challenge,
      Boolean(challenge && verifyTotp(challenge.secret, parsed.data.code)),
    );
    if (failureReason) {
      req.log.warn({ stage: "login", reason: failureReason }, "MFA verification rejected");
      await auditLogin("", challenge?.userId ?? null, "failure", "invalid_mfa");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    const consumed = challenges.consume(challengeKey);
    if (!consumed) {
      req.log.warn({ stage: "login", reason: "consumed" }, "MFA verification rejected");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    await auditLogin("", consumed.userId, "success", "mfa");
    await pool.query("UPDATE cms_users SET last_login_at=now() WHERE id=$1", [
      consumed.userId,
    ]);
    const created = await createSession(consumed.userId, true, req, res);
    res.json({
      authenticated: true,
      session: publicSession(created.session),
      mfaChallenge: null,
      csrfToken: created.csrfToken,
    });
  }),
);

router.post(
  "/auth/mfa/setup",
  authenticate,
  requireCsrf,
  asyncRoute(async (_req, res) => {
    const auth = res.locals.auth as AuthContext;
    if (auth.user.mustRotate) {
      res.status(403).json({ error: "Password change is required before MFA enrollment." });
      return;
    }
    if (auth.user.mfaEnabled) {
      res.status(409).json({ error: "MFA is already enrolled." });
      return;
    }
    const enrollment = enrollments.getOrCreate(auth.tokenHash, () => ({
      secret: randomBase32(),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    }));
    await auditAuth(auth.user.id, "auth.mfa_enrollment_started");
    const issuer = encodeURIComponent("Cognirise CMS");
    const account = encodeURIComponent(auth.user.email);
    res.json({
      secret: enrollment.secret,
      provisioningUri: `otpauth://totp/${issuer}:${account}?secret=${enrollment.secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`,
      expiresAt: enrollment.expiresAt,
    });
  }),
);

router.post(
  "/auth/mfa/confirm",
  authenticate,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ConfirmMfaBody.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ stage: "enrollment", reason: "invalid_request" }, "MFA verification rejected");
      await auditLogin("", null, "failure", "invalid_mfa_enrollment_request");
      res.status(400).json({ error: "Invalid MFA confirmation." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const enrollment = enrollments.get(auth.tokenHash);
    const failureReason = classifyMfaFailure(
      enrollment,
      Boolean(enrollment && verifyTotp(enrollment.secret, parsed.data.code)),
    );
    if (failureReason) {
      req.log.warn({ stage: "enrollment", reason: failureReason }, "MFA verification rejected");
      res.status(401).json({ error: "The authenticator code is invalid or the setup has expired." });
      return;
    }
    if (!enrollment) throw new Error("MFA enrollment invariant failed");
    const recoveryCodes = Array.from({ length: 10 }, () => {
      const raw = randomBase32(8);
      return `${raw.slice(0, 4)}-${raw.slice(4)}`;
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO cms_totp_credentials
         (user_id,encrypted_secret,encryption_key_version,verified_at,disabled_at)
         VALUES ($1,$2,1,now(),NULL)
         ON CONFLICT (user_id) DO UPDATE SET encrypted_secret=EXCLUDED.encrypted_secret,
           encryption_key_version=EXCLUDED.encryption_key_version,verified_at=now(),disabled_at=NULL`,
        [auth.user.id, encryptTotpSecret(enrollment.secret)],
      );
      await client.query("DELETE FROM cms_recovery_codes WHERE user_id=$1", [auth.user.id]);
      for (const code of recoveryCodes) {
        await client.query(
          "INSERT INTO cms_recovery_codes(user_id,code_digest) VALUES ($1,$2)",
          [auth.user.id, hashRecoveryCode(code)],
        );
      }
      await client.query(
        "UPDATE cms_sessions SET mfa_satisfied_at=now() WHERE id=$1",
        [auth.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    enrollments.delete(auth.tokenHash);
    const session = { ...auth, mfaVerified: true, user: { ...auth.user, mfaEnabled: true } };
    await auditAuth(auth.user.id, "auth.mfa_enrolled");
    res.json({
      authenticated: true,
      session: publicSession(session),
      mfaChallenge: null,
      csrfToken: csrfForSession(auth.tokenHash),
      recoveryCodes,
    });
  }),
);

router.post(
  "/auth/recovery",
  loginThrottle,
  asyncRoute(async (req, res) => {
    const parsed = RecoverAuthBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(401).json(AUTH_ERROR);
      return;
    }
    const user = await pool.query(
      "SELECT id FROM cms_users WHERE lower(email)=lower($1) AND status='active'",
      [parsed.data.email],
    );
    const userId = user.rows[0]?.id;
    if (!userId) {
      await auditLogin(parsed.data.email, null, "failure", "invalid_recovery");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    const client = await pool.connect();
    let recovered = false;
    try {
      await client.query("BEGIN");
      const matched = await client.query(
        `SELECT id FROM cms_recovery_codes
          WHERE user_id=$1 AND code_digest=$2 AND consumed_at IS NULL
          FOR UPDATE`,
        [userId, hashRecoveryCode(parsed.data.recoveryCode)],
      );
      if (matched.rowCount) {
        await client.query(
          "UPDATE cms_totp_credentials SET disabled_at=now() WHERE user_id=$1 AND disabled_at IS NULL",
          [userId],
        );
        await client.query(
          "UPDATE cms_recovery_codes SET consumed_at=COALESCE(consumed_at,now()) WHERE user_id=$1",
          [userId],
        );
        await client.query(
          "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [userId],
        );
        await client.query("UPDATE cms_users SET last_login_at=now() WHERE id=$1", [userId]);
        recovered = true;
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!recovered) {
      await auditLogin(parsed.data.email, userId, "failure", "invalid_recovery");
      res.status(401).json(AUTH_ERROR);
      return;
    }
    await auditLogin(parsed.data.email, userId, "success", "recovery");
    // Recovery deliberately creates an unenrolled session. Privileged routes
    // remain blocked until /auth/mfa/setup and /auth/mfa/confirm complete.
    const created = await createSession(String(userId), false, req, res);
    await auditAuth(String(userId), "auth.recovery_used");
    res.json({ authenticated: true, session: publicSession(created.session), mfaChallenge: null, csrfToken: created.csrfToken });
  }),
);

router.post(
  "/auth/password-change",
  authenticate,
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ChangePasswordBody.safeParse(req.body);
    if (!parsed.success || parsed.data.currentPassword === parsed.data.newPassword || !isStrongPassword(parsed.data.newPassword)) {
      res.status(400).json({ error: "Invalid password change." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const credential = await pool.query(
      "SELECT password_hash FROM cms_password_credentials WHERE user_id=$1",
      [auth.user.id],
    );
    if (!credential.rowCount || !(await verifyPassword(parsed.data.currentPassword, credential.rows[0].password_hash))) {
      res.status(401).json(AUTH_ERROR);
      return;
    }
    await pool.query(
      `UPDATE cms_password_credentials SET password_hash=$2,algorithm='scrypt',
       password_version=password_version+1,must_rotate=false,temporary_expires_at=NULL,changed_at=now()
       WHERE user_id=$1`,
      [auth.user.id, await hashPassword(parsed.data.newPassword)],
    );
    await pool.query("UPDATE cms_users SET status='active',updated_at=now() WHERE id=$1", [auth.user.id]);
    await pool.query("UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL", [auth.user.id,auth.id]);
    await auditAuth(auth.user.id, "auth.password_changed");
    res.status(204).end();
  }),
);

router.post(
  "/auth/password-reset",
  asyncRoute(async (req, res) => {
    const parsed = ConsumeAccessTokenBody.safeParse(req.body);
    if (!parsed.success || !isStrongPassword(parsed.data.newPassword)) {
      res.status(400).json({ error: "Choose a password of at least 12 characters with upper and lower case, a number, and a symbol." });
      return;
    }
    const client = await pool.connect();
    let consumed: { userId: string; purpose: string } | null = null;
    try {
      await client.query("BEGIN");
      const token = await client.query(
        `SELECT id,user_id,purpose FROM cms_user_access_tokens
         WHERE token_digest=$1 AND consumed_at IS NULL AND expires_at>now()
         FOR UPDATE`,
        [hashToken(parsed.data.token)],
      );
      if (token.rowCount) {
        const row = token.rows[0];
        await client.query(
          `INSERT INTO cms_password_credentials
            (user_id,password_hash,algorithm,password_version,must_rotate,temporary_expires_at,changed_at)
           VALUES ($1,$2,'scrypt',1,false,NULL,now())
           ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,
             algorithm='scrypt',password_version=cms_password_credentials.password_version+1,
             must_rotate=false,temporary_expires_at=NULL,changed_at=now()`,
          [row.user_id, await hashPassword(parsed.data.newPassword)],
        );
        await client.query(
          "UPDATE cms_user_access_tokens SET consumed_at=now() WHERE id=$1",
          [row.id],
        );
        await client.query(
          "UPDATE cms_user_access_tokens SET consumed_at=COALESCE(consumed_at,now()) WHERE user_id=$1 AND id<>$2",
          [row.user_id, row.id],
        );
        await client.query(
          `UPDATE cms_users
             SET status=CASE WHEN status='invited' THEN 'active' ELSE status END,
                 email_verified_at=COALESCE(email_verified_at,now()),updated_at=now()
           WHERE id=$1`,
          [row.user_id],
        );
        await client.query(
          "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [row.user_id],
        );
        consumed = { userId: String(row.user_id), purpose: row.purpose };
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!consumed) {
      res.status(410).json({ error: "This access link is invalid, expired, or has already been used." });
      return;
    }
    await auditAuth(consumed.userId, `auth.${consumed.purpose}_consumed`);
    res.status(204).end();
  }),
);

async function auditAuth(actorId: string, action: string, targetId = actorId): Promise<void> {
  await pool.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id)
     SELECT id,email,$2,'user',$3 FROM cms_users WHERE id=$1`,
    [actorId, action, targetId],
  );
}

async function auditLogin(email: string, userId: string | null, outcome: string, failureCode?: string) {
  await pool.query(
    `INSERT INTO cms_login_attempts(user_id,email_digest,ip_digest,outcome,failure_code,metadata)
     VALUES ($1,$2,NULL,$3,$4,'{}'::jsonb)`,
    [userId, hashToken(email.toLowerCase() || "unknown"), outcome, failureCode ?? null],
  );
}

router.get("/auth/session", authenticate, (req, res) => {
  res.json(publicSession(res.locals.auth as AuthContext));
});

router.get(
  "/auth/csrf",
  authenticate,
  asyncRoute(async (_req, res) => {
    const auth = res.locals.auth as AuthContext;
    const expiresAt = new Date(
      Math.min(auth.expiresAt.getTime(), Date.now() + 2 * 60 * 60_000),
    );
    const token = csrfForSession(auth.tokenHash);
    res.cookie(CSRF_COOKIE, token, {
      secure: true,
      httpOnly: false,
      sameSite: "strict",
      path: "/",
      expires: expiresAt,
    });
    res.json({ token, expiresAt });
  }),
);

router.post(
  "/auth/logout",
  authenticate,
  requireCsrf,
  asyncRoute(async (_req, res) => {
    const auth = res.locals.auth as AuthContext;
    await pool.query("UPDATE cms_sessions SET revoked_at=now() WHERE id=$1", [auth.id]);
    clearSessionCookies(res);
    res.status(204).end();
  }),
);

export default router;