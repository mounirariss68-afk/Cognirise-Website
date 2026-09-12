/**
 * Provision and remove a disposable, real CMS-authentication fixture.
 *
 * This is deliberately a database fixture, not an authentication shortcut:
 * browser automation must still POST /api/auth/login and
 * /api/auth/mfa/verify.  In particular, this file must never manufacture an
 * authenticated session or write a session row.
 *
 * The state file contains the generated passwords and TOTP seeds.  It is
 * accepted only below /tmp and is always created with mode 0600.  Secret
 * values are never written to stdout/stderr.
 */

import { randomBytes, randomUUID } from "node:crypto";
import { chmod, lstat, open, readFile, unlink, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type Role = "administrator" | "editor";
type FixturePhase = "creating" | "ready";
type SecurityHelpers = typeof import("../artifacts/api-server/src/lib/security.ts");

interface FixtureUser {
  id: string;
  role: Role;
  email: string;
  password: string;
  totpSecret: string;
}

interface FixtureSubmission {
  workflowId: string;
  sourceType: "enquiry" | "newsletter";
  sourceId: string;
  email: string;
}

interface FixtureDocument {
  id: string;
  slug: string;
}

interface FixtureState {
  version: 1;
  phase: FixturePhase;
  prefix: string;
  createdAt: string;
  users: FixtureUser[];
  documents: FixtureDocument[];
  submissions: FixtureSubmission[];
}

interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

interface QueryClient {
  query<Row = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<QueryResult<Row>>;
}

interface PoolLike extends QueryClient {
  connect(): Promise<QueryClient & { release(): void }>;
  end(): Promise<void>;
}

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const args = process.argv.slice(2);
const commands = ["setup", "totp", "cleanup"] as const;
const requestedCommands = args.filter((value): value is (typeof commands)[number] =>
  (commands as readonly string[]).includes(value),
);
const command = requestedCommands[0];
const developmentFlag = args.includes("--development");
const credentialsPath = flagValue("--credentials");
const withSubmission = args.includes("--with-submission");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFIX = /^fixture-cms-owner-[0-9a-f-]+$/;

function flagValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function usage(): void {
  process.stdout.write(
    [
      "CMS owner browser fixture (development database only)",
      "",
      "  NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture --",
      "    --development setup --credentials /tmp/cognirise-owner-fixture.json",
      "    [--with-submission]",
      "  NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture --",
      "    --development totp --credentials /tmp/cognirise-owner-fixture.json",
      "    --role administrator|editor",
      "  NODE_ENV=development pnpm --filter @workspace/scripts cms:owner-browser-fixture --",
      "    --development cleanup --credentials /tmp/cognirise-owner-fixture.json",
      "",
      "The totp command writes only the current six-digit code to stdout.",
      "Do not send that stdout through chat, logs, or a test report.",
    ].join("\n") + "\n",
  );
}

function requireDevelopmentTarget(): void {
  if (!developmentFlag) {
    throw new Error(
      "Refusing CMS browser fixture mutation. Pass --development explicitly.",
    );
  }
  if (process.env.NODE_ENV !== "development") {
    throw new Error(
      "Refusing CMS browser fixture mutation unless NODE_ENV=development.",
    );
  }
  for (const key of ["APP_ENV", "ENVIRONMENT", "DEPLOYMENT_ENV"]) {
    const value = process.env[key]?.toLowerCase();
    if (value === "production" || value === "prod") {
      throw new Error(`Refusing CMS browser fixture mutation because ${key} is production.`);
    }
  }
  if (process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Refusing CMS browser fixture mutation in a deployment.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must point at the isolated development database.");
  }
}

function requireCredentialsPath(): string {
  if (!credentialsPath) {
    throw new Error(
      "--credentials is required and must point to a mode-600 file below /tmp.",
    );
  }
  const resolved = path.resolve(credentialsPath);
  if (resolved !== "/tmp" && !resolved.startsWith("/tmp/")) {
    throw new Error("The credentials file must be below /tmp.");
  }
  if (path.basename(resolved).startsWith(".")) {
    throw new Error("The credentials file must use a non-hidden /tmp filename.");
  }
  return resolved;
}

async function assertPrivateStateFile(filePath: string, mustExist: boolean): Promise<void> {
  try {
    const stats = await lstat(filePath);
    if (!stats.isFile()) {
      throw new Error("The credentials path must be a regular file.");
    }
    if ((stats.mode & 0o777) !== 0o600) {
      throw new Error("The credentials file must have mode 600.");
    }
    if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
      throw new Error("The credentials file must be owned by the current user.");
    }
    if (!mustExist) {
      throw new Error(
        "The credentials file already exists. Run cleanup first or choose a new /tmp path.",
      );
    }
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      if (mustExist) {
        const missing = new Error("The credentials file does not exist.");
        (missing as NodeJS.ErrnoException).code = "ENOENT";
        throw missing;
      }
      return;
    }
    throw error;
  }
}

async function writePrivateState(filePath: string, state: FixtureState): Promise<void> {
  const temporaryPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const contents = JSON.stringify(state) + "\n";
  try {
    const handle = await open(temporaryPath, "wx", 0o600);
    try {
      await handle.writeFile(contents, "utf8");
    } finally {
      await handle.close();
    }
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, filePath);
    await assertPrivateStateFile(filePath, true);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

async function readPrivateState(filePath: string): Promise<FixtureState> {
  await assertPrivateStateFile(filePath, true);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new Error("The credentials file is not valid JSON.");
  }
  return validateState(parsed);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Credentials file has an invalid ${label}.`);
  }
  return value;
}

function validateState(value: unknown): FixtureState {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error("Credentials file has an unsupported fixture version.");
  }
  const phase = value.phase;
  if (phase !== "creating" && phase !== "ready") {
    throw new Error("Credentials file has an invalid fixture phase.");
  }
  const prefix = requireString(value.prefix, "fixture prefix");
  if (!PREFIX.test(prefix)) throw new Error("Credentials file has an invalid fixture prefix.");
  const createdAt = requireString(value.createdAt, "createdAt");
  if (!Array.isArray(value.users) || value.users.length !== 2) {
    throw new Error("Credentials file must contain exactly two fixture users.");
  }
  const users = value.users.map((raw, index): FixtureUser => {
    if (!isRecord(raw)) throw new Error(`Credentials file has an invalid user at index ${index}.`);
    const role = raw.role;
    if (role !== "administrator" && role !== "editor") {
      throw new Error("Credentials file users must be administrator and editor roles.");
    }
    const id = requireString(raw.id, "user id");
    const email = requireString(raw.email, "user email");
    const password = requireString(raw.password, "user password");
    const totpSecret = requireString(raw.totpSecret, "TOTP secret");
    if (!UUID.test(id) || !email.startsWith(`${prefix}.`) || !email.endsWith("@fixture.invalid")) {
      throw new Error("Credentials file contains a user outside this fixture prefix.");
    }
    if (!/^[A-Z2-7]+=*$/.test(totpSecret)) {
      throw new Error("Credentials file contains an invalid TOTP secret.");
    }
    return { id, role, email, password, totpSecret };
  });
  const roles = new Set(users.map((user) => user.role));
  if (roles.size !== 2 || !roles.has("administrator") || !roles.has("editor")) {
    throw new Error("Credentials file must contain one administrator and one editor.");
  }
  const documents: FixtureDocument[] = [];
  if (value.documents !== undefined) {
    if (!Array.isArray(value.documents)) throw new Error("Credentials file has invalid documents.");
    for (const raw of value.documents) {
      if (!isRecord(raw)) throw new Error("Credentials file has an invalid document.");
      const id = requireString(raw.id, "document id");
      const slug = requireString(raw.slug, "document slug");
      if (!UUID.test(id) || !slug.startsWith(prefix)) {
        throw new Error("Credentials file contains a document outside this fixture prefix.");
      }
      documents.push({ id, slug });
    }
  }
  const submissions: FixtureSubmission[] = [];
  if (value.submissions !== undefined) {
    if (!Array.isArray(value.submissions)) throw new Error("Credentials file has invalid submissions.");
    for (const raw of value.submissions) {
      if (!isRecord(raw)) throw new Error("Credentials file has an invalid submission.");
      const workflowId = requireString(raw.workflowId, "submission workflow id");
      const sourceType = raw.sourceType;
      const sourceId = requireString(raw.sourceId, "submission source id");
      const email = requireString(raw.email, "submission email");
      if (
        !UUID.test(workflowId) ||
        !UUID.test(sourceId) ||
        (sourceType !== "enquiry" && sourceType !== "newsletter") ||
        !email.startsWith(`${prefix}.`) ||
        !email.endsWith("@fixture.invalid")
      ) {
        throw new Error("Credentials file contains a submission outside this fixture prefix.");
      }
      submissions.push({ workflowId, sourceType, sourceId, email });
    }
  }
  return { version: 1, phase, prefix, createdAt, users, documents, submissions };
}

function generatedPassword(): string {
  // The fixed suffix guarantees isStrongPassword() requirements without
  // making the random material predictable.
  return `${randomBytes(32).toString("base64url")}Aa1!`;
}

function userForRole(state: FixtureState, role: Role): FixtureUser {
  const user = state.users.find((candidate) => candidate.role === role);
  if (!user) throw new Error(`Credentials file has no ${role} fixture user.`);
  return user;
}

function assertOwnedIds(state: FixtureState): void {
  const ids = new Set<string>();
  for (const user of state.users) {
    if (ids.has(user.id)) throw new Error("Credentials file contains duplicate fixture IDs.");
    ids.add(user.id);
  }
  for (const document of state.documents) {
    if (ids.has(document.id)) throw new Error("Credentials file contains duplicate fixture IDs.");
    ids.add(document.id);
  }
  for (const submission of state.submissions) {
    for (const id of [submission.workflowId, submission.sourceId]) {
      if (ids.has(id)) throw new Error("Credentials file contains duplicate fixture IDs.");
      ids.add(id);
    }
  }
}

async function loadSecurity(): Promise<SecurityHelpers> {
  return await import(
    pathToFileURL(
      path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts"),
    ).href
  ) as SecurityHelpers;
}

async function loadPool(): Promise<PoolLike> {
  const module = await import("@workspace/db") as { pool: PoolLike };
  return module.pool;
}

async function verifyExistingReadyFixture(
  client: QueryClient,
  state: FixtureState,
): Promise<boolean> {
  const result = await client.query<{ id: string; email: string; role: Role }>(
    `SELECT id::text id,email,role
       FROM cms_users
      WHERE id=ANY($1::uuid[])`,
    [state.users.map((user) => user.id)],
  );
  if (result.rowCount !== state.users.length) return false;
  return state.users.every((user) => {
    const row = result.rows.find((candidate) => candidate.id === user.id);
    return row?.email === user.email && row.role === user.role;
  });
}

async function provision(
  pool: PoolLike,
  security: SecurityHelpers,
  filePath: string,
): Promise<void> {
  await assertPrivateStateFile(filePath, false);
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters.");
  }

  const prefix = `fixture-cms-owner-${randomUUID()}`;
  const users: FixtureUser[] = (["administrator", "editor"] as const).map((role) => ({
    id: randomUUID(),
    role,
    email: `${prefix}.${role}@fixture.invalid`,
    password: generatedPassword(),
    totpSecret: security.randomBase32(),
  }));
  for (const user of users) {
    if (!security.isStrongPassword(user.password)) {
      throw new Error("Generated fixture password did not meet the CMS password policy.");
    }
  }
  const state: FixtureState = {
    version: 1,
    phase: "creating",
    prefix,
    createdAt: new Date().toISOString(),
    users,
    documents: [],
    submissions: [],
  };
  if (withSubmission) {
    state.submissions.push({
      workflowId: randomUUID(),
      sourceType: "enquiry",
      sourceId: randomUUID(),
      email: `${prefix}.submission@fixture.invalid`,
    });
  }
  assertOwnedIds(state);
  await writePrivateState(filePath, state);

  let committed = false;
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [prefix]);
      for (const user of users) {
        await client.query(
          `INSERT INTO cms_users(id,email,display_name,role,status,email_verified_at)
           VALUES ($1,$2,$3,$4,'active',now())`,
          [user.id, user.email, `${prefix} ${user.role}`, user.role],
        );
        await client.query(
          `INSERT INTO cms_password_credentials
             (user_id,password_hash,algorithm,password_version,must_rotate,temporary_expires_at)
           VALUES ($1,$2,'scrypt',1,false,NULL)`,
          [user.id, await security.hashPassword(user.password)],
        );
        await client.query(
          `INSERT INTO cms_totp_credentials
             (user_id,encrypted_secret,encryption_key_version,verified_at,disabled_at)
           VALUES ($1,$2,1,now(),NULL)`,
          [user.id, security.encryptTotpSecret(user.totpSecret)],
        );
      }

      const markets = await client.query<{ code: string }>(
        "SELECT code FROM market_editions WHERE enabled=true ORDER BY code",
      );
      for (const market of markets.rows) {
        await client.query(
          `INSERT INTO cms_user_market_assignments(user_id,market_code)
           VALUES ($1,$2)`,
          [userForRole(state, "editor").id, market.code],
        );
      }

      if (state.submissions.length) {
        const submission = state.submissions[0]!;
        const market = markets.rows[0]?.code ?? "uae";
        await client.query(
          `INSERT INTO website_enquiries
             (id,name,email,organization,role,market,process_area,challenge,consent,source_page)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,
          [
            submission.sourceId,
            `${prefix} contact`,
            submission.email,
            `${prefix} organization`,
            "Browser fixture",
            market,
            "governance",
            `${prefix} disposable browser submission`,
            `/${prefix}/fixture`,
          ],
        );
        await client.query(
          `INSERT INTO cms_submission_workflows
             (id,source_type,source_id,status,priority,consent_granted,
              consent_policy_version,consent_captured_at,deletion_due_at)
           VALUES ($1,'enquiry',$2,'new','normal',true,'fixture',now(),now()+interval '1 day')`,
          [submission.workflowId, submission.sourceId],
        );
      }
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }

    state.phase = "ready";
    await writePrivateState(filePath, state);
  } catch (error) {
    if (committed) {
      try {
        await deleteFixtureRows(pool, state);
        await unlink(filePath);
      } catch {
        // Keep the mode-600 state file so a later explicit cleanup can retry.
      }
    }
    throw error;
  }

  // Deliberately omit users, passwords, and TOTP values from this message.
  process.stdout.write(
    `CMS browser fixture ready (${state.prefix}). Credentials are in ${filePath} (mode 600); values were not printed.\n`,
  );
}

async function deleteFixtureRows(pool: PoolLike, state: FixtureState): Promise<void> {
  assertOwnedIds(state);
  const client = await pool.connect();
  const userIds = state.users.map((user) => user.id);
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [state.prefix]);

    const users = await client.query<{ id: string; email: string; role: Role }>(
      `SELECT id::text id,email,role FROM cms_users WHERE id=ANY($1::uuid[])`,
      [userIds],
    );
    for (const row of users.rows) {
      const expected = state.users.find((user) => user.id === row.id);
      if (
        !expected ||
        row.email !== expected.email ||
        row.role !== expected.role ||
        !row.email.startsWith(`${state.prefix}.`)
      ) {
        throw new Error("Refusing cleanup because a recorded user no longer matches its fixture identity.");
      }
    }

    for (const document of state.documents) {
      const result = await client.query<{ id: string; canonical_slug: string | null }>(
        `SELECT id::text id,canonical_slug
           FROM cms_documents
          WHERE id=$1::uuid`,
        [document.id],
      );
      const row = result.rows[0];
      if (
        row &&
        (row.canonical_slug !== document.slug || !String(row.canonical_slug).startsWith(state.prefix))
      ) {
        throw new Error("Refusing cleanup because a recorded document no longer matches its fixture identity.");
      }
    }

    for (const submission of state.submissions) {
      const result = await client.query<{
        id: string;
        source_type: string;
        source_id: string;
      }>(
        `SELECT id::text id,source_type,source_id::text source_id
           FROM cms_submission_workflows
          WHERE id=$1::uuid`,
        [submission.workflowId],
      );
      const row = result.rows[0];
      if (
        row &&
        (row.source_type !== submission.sourceType || row.source_id !== submission.sourceId)
      ) {
        throw new Error("Refusing cleanup because a recorded submission no longer matches its fixture identity.");
      }
      if (row) {
        const sourceTable = submission.sourceType === "enquiry"
          ? "website_enquiries"
          : "newsletter_subscriptions";
        const source = await client.query<{ id: string; email: string }>(
          `SELECT id::text id,email
             FROM ${sourceTable}
            WHERE id=$1::uuid`,
          [submission.sourceId],
        );
        if (source.rows[0] && source.rows[0].email !== submission.email) {
          throw new Error("Refusing cleanup because a recorded submission source no longer matches its fixture identity.");
        }
      }
    }

    const allTargetIds = [
      ...state.documents.map((document) => document.id),
      ...state.submissions.flatMap((submission) => [
        submission.workflowId,
        submission.sourceId,
      ]),
      ...userIds,
    ];
    await client.query(
      `DELETE FROM cms_audit_events
        WHERE actor_user_id=ANY($1::uuid[])
           OR target_id=ANY($2::text[])`,
      [userIds, allTargetIds],
    );
    await client.query(
      "DELETE FROM cms_login_attempts WHERE user_id=ANY($1::uuid[])",
      [userIds],
    );

    for (const document of state.documents) {
      await client.query(
        `DELETE FROM cms_documents
          WHERE id=$1::uuid AND canonical_slug=$2
            AND canonical_slug LIKE $3`,
        [document.id, document.slug, `${state.prefix}%`],
      );
    }

    for (const submission of state.submissions) {
      await client.query(
        `DELETE FROM cms_submission_workflows
          WHERE id=$1::uuid AND source_type=$2 AND source_id=$3::uuid`,
        [submission.workflowId, submission.sourceType, submission.sourceId],
      );
      if (submission.sourceType === "enquiry") {
        await client.query(
          `DELETE FROM website_enquiries
            WHERE id=$1::uuid AND email=$2 AND email LIKE $3`,
          [submission.sourceId, submission.email, `${state.prefix}%`],
        );
      } else {
        await client.query(
          `DELETE FROM newsletter_subscriptions
            WHERE id=$1::uuid AND email=$2 AND email LIKE $3`,
          [submission.sourceId, submission.email, `${state.prefix}%`],
        );
      }
    }

    for (const user of state.users) {
      await client.query(
        `DELETE FROM cms_users
          WHERE id=$1::uuid AND email=$2 AND role=$3
            AND email LIKE $4`,
        [user.id, user.email, user.role, `${state.prefix}%`],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function cleanup(pool: PoolLike, filePath: string): Promise<void> {
  const state = await readPrivateState(filePath);
  await deleteFixtureRows(pool, state);
  await unlink(filePath);
  process.stdout.write(`CMS browser fixture cleaned up (${state.prefix}).\n`);
}

async function printTotp(security: SecurityHelpers, filePath: string): Promise<void> {
  const state = await readPrivateState(filePath);
  if (state.phase !== "ready") {
    throw new Error("The fixture is not ready; do not authenticate against a creating fixture.");
  }
  const role = flagValue("--role");
  if (role !== "administrator" && role !== "editor") {
    throw new Error("totp requires --role administrator or --role editor.");
  }
  const user = userForRole(state, role);
  // This is the only stdout produced by the totp command.  Browser
  // automation should capture it in process memory and never report it.
  process.stdout.write(`${security.totp(user.totpSecret)}\n`);
}

async function main(): Promise<void> {
  if (requestedCommands.length > 1) {
    throw new Error("Pass exactly one of setup, totp, or cleanup.");
  }
  if (command === "--help" || command === "-h" || !command) {
    usage();
    return;
  }
  if (!["setup", "totp", "cleanup"].includes(command)) {
    throw new Error(`Unknown command ${command}. Use --help for usage.`);
  }
  requireDevelopmentTarget();
  const filePath = requireCredentialsPath();

  if (command === "totp") {
    const security = await loadSecurity();
    await printTotp(security, filePath);
    return;
  }

  const pool = await loadPool();
  try {
    if (command === "setup") {
      try {
        const existing = await readPrivateState(filePath);
        if (existing.phase === "ready") {
          const client = await pool.connect();
          try {
            if (await verifyExistingReadyFixture(client, existing)) {
              process.stdout.write(
                `CMS browser fixture already ready (${existing.prefix}); credentials were not printed.\n`,
              );
              return;
            }
          } finally {
            client.release();
          }
          throw new Error(
            "The credentials file is ready but its recorded users are absent or changed; run cleanup explicitly.",
          );
        }
        throw new Error(
          "The credentials file records an incomplete fixture; run cleanup explicitly before setup.",
        );
      } catch (error: unknown) {
        if ((error as NodeJS.ErrnoException)?.code !== "ENOENT") throw error;
      }
      const security = await loadSecurity();
      await provision(pool, security, filePath);
    } else {
      await cleanup(pool, filePath);
    }
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  // Error messages are intentionally kept free of parsed state and secret
  // values.  This output is safe for a local command failure log.
  process.stderr.write(`${error instanceof Error ? error.message : "CMS fixture command failed."}\n`);
  process.exitCode = 1;
});
