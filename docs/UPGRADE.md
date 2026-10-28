# Workspace and session upgrade

The shared AppShell gives all application list, form and detail pages a modern header, breadcrumb, content layout and design tokens. DataCardTable provides current-page sorting, density, column visibility, row selection and CSV export. Bulk actions appear when the signed-in user has the relevant permission, and are confirmed before running. Failures are shown per record; bulk operations are intentionally not one database transaction.

Supported bulk mutations: inventory delete; customer/supplier/location activation; user activation (self-deactivation excluded from bulk); sale/purchase void; transfer ship/receive/cancel; production release/cancel; inquiry claim; notification read/delete; expense delete. Other tables still support selected-row export.

Tables scroll horizontally on small screens to preserve all fields and actions. Select-all and exports apply to the loaded page. Sorting does not reorder records across server pages.

Sessions now use the Next.js /api/backend proxy and HttpOnly cookies. API_URL is the server API base; NEXT_PUBLIC_API_URL is used for public media URLs. The API must be migrated and deployed first. Existing users sign in again. Cross-origin write requests are rejected.

Run npm run typecheck, npm run lint, npm run build, and npm run test:e2e. Browser tests use a deterministic local upstream, not live business data. An installed Chrome can be selected with PLAYWRIGHT_CHANNEL=chrome. Build assets include local fonts and licenses so the build no longer fetches fonts from Google.

Plain FTP deployment is retired. See the API repository docs/PRODUCTION_READINESS.md for SSH production-environment configuration, backup/restore, alerting, migration rollout and staging acceptance requirements. No hosting configuration or production deployment is performed by these source changes.

## API contract generation

The backend Nest Swagger compiler plugin emits DTO metadata. After building the API, run npm run openapi:export against an isolated migrated database (seeding disabled). Copy docs/openapi.json to the frontend docs/openapi.json, then run npm run api:generate there. Commit both snapshots and lib/generated/api-schema.d.ts together. The return form uses the generated request type. Other legacy client types can be migrated incrementally; generated metadata does not prove every response shape at runtime.
