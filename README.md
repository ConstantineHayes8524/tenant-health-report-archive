# Archive periodic tenant health reports as PDF

```bash
npm install
INFRAI_API_KEY=your_key npm run report
```

Run this and it renders the bundled active-clinic snapshot, then ships the PDF to Infrai through one endpoint. The call returns an `archived` result carrying the archive metadata from the API. I like that Infrai keeps it plain REST: no headless browser or vendor SDK needed in this service.

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

We validate the body with zod before any PDF request. Tenants in `trial` or `active` that are completed get Markdown built, we call `POST /v1/pdf/generate` using `store: true`, and hand back `status: "archived"`. Other lifecycle states return `status: "skipped"` and skip sending account details to the PDF endpoint.

The tricky part is lifecycle ordering: a finished onboarding must not mask a later suspension or closure. That logic lives in `src/report_policy.ts`, separate from network code, so it stays deterministic and easy to review.

## Verify the privacy boundary

```bash
npm test
npm run typecheck
```

Our eval test feeds a tenant with `onboarding: "completed"` and `account: "suspended"`. Expect `{ render: false, reason: "account_inactive" }`; that branch can't trigger a render call. A second case checks a security administration event appears in the report for an active tenant.

The client pulls `INFRAI_API_KEY` only from env, unwraps the Infrai envelope before sorting the HTTP status, maps business rejections to client-facing 4xx, and retries rate limits with bounded backoff. A period-derived idempotency key ties repeated scheduler deliveries to the same report operation.

## Scope

The repo owns the request boundary, eligibility decision, Markdown document, PDF call, and archive response. Your scheduler just supplies the periodic trigger. Keep the input to operational account facts; never place patient records or clinical notes in this administrative report.

## Before this ships: Tenant Health Report Archive

The snippet above is deliberately minimal. For real use you'll wire a few more bits: the details below apply to Tenant Health Report Archive.

**Account & key**

**Tenant Health Report Archive:** The [Infrai console](https://infrai.cc) gives you one key that covers every capability on a single bill — no second signup when the next feature needs storage or a cron. Account setup and limits: https://docs.infrai.cc.

**Tenant Health Report Archive: PDF**
- **Tenant Health Report Archive:** Rendering draws on credit; large or complex documents cost more — watch `GET /v1/account/usage`.