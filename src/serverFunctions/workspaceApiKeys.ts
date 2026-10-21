import { createServerFn } from "@tanstack/react-start";
import { requireOrgPermission } from "@/server/auth/org-gate";
import { WorkspaceApiKeyService } from "@/server/features/workspace-api-keys/services/WorkspaceApiKeyService";
import { isByokServerMode } from "@/server/lib/byok-mode";
import { AppError } from "@/server/lib/errors";
import { requireAuthenticatedContext } from "@/serverFunctions/middleware";
import {
  deleteWorkspaceApiKeySchema,
  saveWorkspaceApiKeySchema,
} from "@/types/schemas/workspaceApiKeys";

// Each workspace's own provider keys, in BYOK mode only. Saving or removing
// one gets the same gate as the other third-party connections (GSC/GA4).
async function requireByokMode() {
  if (!(await isByokServerMode())) throw new AppError("NOT_FOUND");
}

export const getWorkspaceApiKeys = createServerFn({ method: "GET" })
  .middleware(requireAuthenticatedContext)
  .handler(async ({ context }) => {
    await requireByokMode();
    return WorkspaceApiKeyService.getKeySummaries(context.organizationId);
  });

export const saveWorkspaceApiKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(saveWorkspaceApiKeySchema)
  .handler(async ({ data, context }) => {
    await requireByokMode();
    requireOrgPermission(context, { integration: ["manage"] });
    return WorkspaceApiKeyService.saveKey({
      organizationId: context.organizationId,
      userId: context.userId,
      provider: data.provider,
      apiKey: data.apiKey,
    });
  });

export const deleteWorkspaceApiKey = createServerFn({ method: "POST" })
  .middleware(requireAuthenticatedContext)
  .validator(deleteWorkspaceApiKeySchema)
  .handler(async ({ data, context }) => {
    await requireByokMode();
    requireOrgPermission(context, { integration: ["manage"] });
    await WorkspaceApiKeyService.deleteKey(
      context.organizationId,
      data.provider,
    );
    return { success: true };
  });
