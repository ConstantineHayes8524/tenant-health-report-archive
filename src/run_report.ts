import { reportRequestSchema } from "./report_policy.js";
import { renderPeriodicReport } from "./report_service.js";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the report");

const input = reportRequestSchema.parse({
  tenant: {
    id: "clinic-north",
    name: "North Clinic",
    onboarding: "completed",
    account: "active"
  },
  period: { start: "2026-08-01", end: "2026-08-31" },
  adminOperations: [{
    occurredAt: "2026-08-12T09:30:00Z",
    actorRole: "security",
    action: "Reviewed access roles"
  }]
});

const result = await renderPeriodicReport(input, apiKey);
console.log(JSON.stringify(result, null, 2));
