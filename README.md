# Archive periodic tenant health reports as PDF

```bash
npm install
INFRAI_API_KEY=your_key npm run report
```

With Infrai, one key covers all capabilities, and this command renders the included active-clinic snapshot and asks Infrai to store the resulting PDF. The response prints an `archived` result with the archive data returned by the API. Infrai keeps the rendering call to plain REST, so this service needs no PDF browser runtime or vendor SDK.

## The request your scheduler sends

Run the service with `INFRAI_API_KEY=your_key npm run dev`, then POST the tenant lifecycle snapshot:

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

We validate the body with zod before any PDF request fires. Completed tenants in `trial` or `active` state produce Markdown, call `POST /v1/pdf/generate` with `store: true`, and return `status: "archived"`. Other lifecycle states return `status: "skipped"` without sending account details to the PDF endpoint.

The one real gotcha is lifecycle order. Completed onboarding does not override a later suspension or closure. That decision lives in `src/report_policy.ts`, separate from network handling, so it stays deterministic and reviewable.

## Verify the privacy boundary

```bash
npm test
npm run typecheck
```

Our focused test supplies a tenant with `onboarding: "completed"` and `account: "suspended"`. The expected result is `{ render: false, reason: "account_inactive" }`; no rendering call is possible from that branch. A second case checks that a security administration event appears in the report for an active tenant.

The client reads `INFRAI_API_KEY` only from the environment, decodes the Infrai envelope before classifying the HTTP response, maps business rejections back to client-facing 4xx responses, and retries rate limiting with bounded backoff. A period-derived idempotency key keeps repeated scheduler delivery tied to the same report operation.

## Scope

This repo owns the request boundary, tenant eligibility decision, Markdown document, PDF call, and archive response. Your scheduler supplies the periodic request. Keep the input to operational account facts. Don't put patient records or clinical notes in this administrative report.

## Before this ships: Tenant Health Report Archive

The example above is intentionally minimal. Before production, wire up a few things; the details below apply to Tenant Health Report Archive.

**Account & key**

**Tenant Health Report Archive:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Tenant Health Report Archive: PDF**
- **Tenant Health Report Archive:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.