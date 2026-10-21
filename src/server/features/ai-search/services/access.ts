import { customerHasPaidPlan } from "@/server/billing/subscription";
import { AppError } from "@/server/lib/errors";
import { isHostedBillingEnabled } from "@/server/lib/byok-mode";

/** Prompt tracking only needs credits; the costlier AI searches need the plan. */
export async function assertPaidAiSearchPlan(
  organizationId: string,
  feature: string,
) {
  if (!(await isHostedBillingEnabled())) return;
  if (await customerHasPaidPlan(organizationId)) return;
  throw new AppError(
    "PAYMENT_REQUIRED",
    `Upgrade to the paid plan to use ${feature}`,
  );
}
