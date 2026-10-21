import { createServerFn } from "@tanstack/react-start";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { DataforseoKeyService } from "@/server/features/dataforseo-key/services/DataforseoKeyService";
import { isByokServerMode } from "@/server/lib/byok-mode";
import { AppError } from "@/server/lib/errors";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import { saveDataforseoKeySchema } from "@/types/schemas/dataforseoKey";

// Each workspace's own DataForSEO key, in BYOK mode only. Saving or removing
// it gets the same gate as the other third-party connections (GSC/GA4).
async function requireByokMode() {
  if (!(await isByokServerMode())) throw new AppError("NOT_FOUND");
}

export const getDataforseoKey = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await requireByokMode();
    return DataforseoKeyService.getKeySummary(context.organizationId);
  });

export const saveDataforseoKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(saveDataforseoKeySchema)
  .handler(async ({ data, context }) => {
    await requireByokMode();
    requireOrgPermission(context, { integration: ["manage"] });
    return DataforseoKeyService.saveKey({
      organizationId: context.organizationId,
      userId: context.userId,
      apiKey: data.apiKey,
    });
  });

export const deleteDataforseoKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await requireByokMode();
    requireOrgPermission(context, { integration: ["manage"] });
    await DataforseoKeyService.deleteKey(context.organizationId);
    return { success: true };
  });
