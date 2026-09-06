# CMS security controls

Administrative access is deny-by-default. Use server-managed, revocable, secure HTTP-only sessions; CSRF tokens; exact allowed origins; HTTPS; secure headers; generic authentication errors; request limits; and login throttling. Passwords, TOTP seeds, recovery codes, session material, and secrets must not be logged or exported.

## Security checklist

- [ ] Administrator and Editor permissions are server-enforced on every route/mutation; UI hiding is not authorization.
- [ ] MFA enrollment, recovery-code use, reset, disable, invite, session rotation/revocation, publish, rollback, upload, and export create redacted audit events.
- [ ] Session cookie has Secure, HttpOnly, appropriate SameSite, expiry, rotation, and server-side revocation controls.
- [ ] CORS uses exact origins and credentials only where needed; CSRF/origin checks cover state change.
- [ ] Uploads verify actual allowlisted image/PDF signatures and limits, record checksum/rights, generate safe renditions, and reject executables/active content.
- [ ] Preview URLs are authenticated or short-lived, scoped, no-store/no-index, and excluded from analytics/sitemap/cache.
- [ ] Dependencies, CSP/security headers, secret rotation, audit access, and privileged membership are reviewed on schedule.

## Export and media controls

Exports of submissions are role-gated, purpose-limited, audited, minimized, encrypted in transit, and stored only in approved locations. Form contents must not be copied into CMS or analytics. Prevent deletion of referenced media; archive or replace it through a reviewed change. Do not put personal data, credentials, source files with secrets, or protected client material in migration payloads.