import { useQuery } from "@tanstack/react-query";
import { billingAccountQueryOptions } from "@/client/features/billing/billingAccountQuery";
import { isHostedBillingClientMode } from "@/lib/byok";
import type { PlanStatus } from "@/shared/billing";

// The single client-side plan gate. It is a UX layer only: the server enforces
// every paid-plan limit before it spends anything.
export function useHostedPlanGate(): "loading" | PlanStatus {
  // Self-hosted has no Autumn customer and resolves to the paid tier on the
  // server, so only hosted mode looks up the plan.
  const isHostedMode = isHostedBillingClientMode();
  const accountQuery = useQuery({
    ...billingAccountQueryOptions(),
    enabled: isHostedMode,
  });

  if (!isHostedMode) return "paid";
  if (accountQuery.isPending) return "loading";
  // Fails closed: an account that failed to load resolves to "free".
  return accountQuery.data?.planStatus ?? "free";
}
