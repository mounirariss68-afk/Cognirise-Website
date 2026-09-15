# Review navigation

The version selector is a development/review aid, not public navigation.
Both desktop and mobile controls are gated by Vite's built-in
`import.meta.env.DEV`. Run the normal development workflow to review configured
markets. Standard `pnpm --filter @workspace/cognirise-website build` output
omits the controls and the mobile wrapper/separator. There is no runtime query
parameter or local-storage override that enables the selector in production.

Public market configuration, URL market/locale resolution, stored preferences,
and regional content delivery remain active in production. Hiding the selector
does not disable market-specific URLs or change publishing/approval rules.