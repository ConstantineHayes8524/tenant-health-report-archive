import { z } from "zod";

export const reportRequestSchema = z.object({
  tenant: z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    onboarding: z.enum(["invited", "verified", "completed"]),
    account: z.enum(["trial", "active", "suspended", "closed"])
  }),
  period: z.object({
    start: z.string().date(),
    end: z.string().date()
  }),
  adminOperations: z.array(z.object({
    occurredAt: z.string().datetime(),
    actorRole: z.enum(["support", "security", "billing"]),
    action: z.string().min(1)
  })).max(100)
}).strict();

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export type ReportDecision =
  | { render: true; markdown: string }
  | { render: false; reason: "onboarding_incomplete" | "account_inactive" };

function escapeCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function decideTenantReport(input: ReportRequest): ReportDecision {
  if (input.tenant.onboarding !== "completed") {
    return { render: false, reason: "onboarding_incomplete" };
  }
  if (input.tenant.account !== "trial" && input.tenant.account !== "active") {
    return { render: false, reason: "account_inactive" };
  }

  const rows = input.adminOperations.length === 0
    ? "| None recorded | - | - |"
    : input.adminOperations.map((operation) =>
      `| ${escapeCell(operation.occurredAt)} | ${escapeCell(operation.actorRole)} | ${escapeCell(operation.action)} |`
    ).join("\n");

  const markdown = [
    `# ${input.tenant.name} account report`,
    "",
    `Period: ${input.period.start} to ${input.period.end}`,
    `Account state: ${input.tenant.account}`,
    `Onboarding state: ${input.tenant.onboarding}`,
    "",
    "## Admin operations",
    "",
    "| Time | Role | Action |",
    "| --- | --- | --- |",
    rows,
    "",
    `Tenant reference: ${input.tenant.id}`
  ].join("\n");

  return { render: true, markdown };
}
