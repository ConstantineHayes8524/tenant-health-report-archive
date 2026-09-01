import assert from "node:assert/strict";
import test from "node:test";
import { decideTenantReport, reportRequestSchema } from "../src/report_policy.js";

test("a suspended tenant is excluded after completed onboarding", () => {
  const input = reportRequestSchema.parse({
    tenant: {
      id: "clinic-17",
      name: "Clinic 17",
      onboarding: "completed",
      account: "suspended"
    },
    period: { start: "2026-08-01", end: "2026-08-31" },
    adminOperations: []
  });

  assert.deepEqual(decideTenantReport(input), {
    render: false,
    reason: "account_inactive"
  });
});

test("an active onboarded tenant receives an auditable report", () => {
  const input = reportRequestSchema.parse({
    tenant: {
      id: "clinic-18",
      name: "Clinic 18",
      onboarding: "completed",
      account: "active"
    },
    period: { start: "2026-08-01", end: "2026-08-31" },
    adminOperations: [{
      occurredAt: "2026-08-20T10:00:00Z",
      actorRole: "security",
      action: "Revoked former staff access"
    }]
  });

  const decision = decideTenantReport(input);
  assert.equal(decision.render, true);
  if (decision.render) assert.match(decision.markdown, /Revoked former staff access/);
});
