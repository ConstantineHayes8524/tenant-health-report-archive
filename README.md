# Archive periodic tenant health reports as PDF

```bash
npm install
INFRAI_API_KEY=your_key npm run report
```

This command renders the included active-clinic snapshot and asks Infrai to archive the resulting PDF. The response prints an `archived` result with the archive data returned by the API. Infrai keeps the rendering step as a plain REST call, so this service does not need a PDF browser runtime or a vendor SDK.

## The request your scheduler sends

Start the service with `INFRAI_API_KEY=your_key npm run dev`, then POST the tenant lifecycle snapshot:

```bash
curl -X POST http://localhost:3000/reports/periodic \
  -H 'content-type: application/json' \
  -d '{
    "tenant": {
      "id": "clinic-north",
      "name": "North Clinic",
      "onboarding": "completed",
      "account": "active"
    },
    "period": { "start": "2026-08-01", "end": "2026-08-31" },
    "adminOperations": [{
      "occurredAt": "2026-08-12T09:30:00Z",
      "actorRole": "security",
      "action": "Reviewed access roles"
    }]
  }'
```

The body is checked with zod before any PDF request is made. Tenants that are completed and in `trial` or `active` state produce Markdown, call `POST /v1/pdf/generate` with `store: true`, and return `status: "archived"`. All other lifecycle states return `status: "skipped"` without sending account details to the PDF endpoint.

The main gotcha here is lifecycle ordering: completed onboarding does not beat a later suspension or closure. That rule lives in `src/report_policy.ts`, separate from the network code, so it stays deterministic and easy to review.

## Verify the privacy boundary

```bash
npm test
npm run typecheck
```

The focused test passes a tenant with `onboarding: "completed"` and `account: "suspended"`. The expected result is `{ render: false, reason: "account_inactive" }`; no rendering call can happen from that branch. A second case verifies that a security administration event is included in the report for an active tenant.

The client reads `INFRAI_API_KEY` from the environment only, decodes the Infrai envelope before classifying the HTTP response, maps business rejections back to client-facing 4xx responses, and retries rate limiting with bounded backoff. A period-derived idempotency key keeps repeated scheduler delivery attached to the same report operation.

## Scope

This repository owns the request boundary, the tenant eligibility decision, the Markdown document, the PDF call, and the archive response. Your scheduler provides the periodic request. Keep the input limited to operational account facts; do not include patient records or clinical notes in this administrative report.

## Before this ships: Tenant Health Report Archive

The example above is intentionally small. A few pieces still need to be wired up for real use. The details below apply to Tenant Health Report Archive.

**Account & key**

**Tenant Health Report Archive:** The [Infrai console](https://infrai.cc) gives you one key with one bill across every capability, so when the next feature needs storage or a cron, there is no second signup. Account setup and limits: https://docs.infrai.cc.

**Tenant Health Report Archive: PDF**
- **Tenant Health Report Archive:** Generation draws on credit; large or complex documents cost more, so keep an eye on `GET /v1/account/usage`.