import { createHash } from "node:crypto";
import { decideTenantReport, type ReportRequest } from "./report_policy.js";
import { generateArchivedPdf } from "./infrai_pdf_client.js";

export type ReportResult =
  | { status: "archived"; archive: unknown }
  | { status: "skipped"; reason: "onboarding_incomplete" | "account_inactive" };

export async function renderPeriodicReport(input: ReportRequest, apiKey: string): Promise<ReportResult> {
  const decision = decideTenantReport(input);
  if (!decision.render) return { status: "skipped", reason: decision.reason };

  const keyMaterial = `${input.tenant.id}:${input.period.start}:${input.period.end}`;
  const idempotencyKey = createHash("sha256").update(keyMaterial).digest("hex");
  const archive = await generateArchivedPdf(decision.markdown, idempotencyKey, apiKey);
  return { status: "archived", archive };
}
