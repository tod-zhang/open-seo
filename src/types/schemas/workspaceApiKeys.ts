import { z } from "zod";

export const workspaceApiKeyProviderSchema = z.enum([
  "dataforseo",
  "openrouter",
]);

export type WorkspaceApiKeyProvider = z.infer<
  typeof workspaceApiKeyProviderSchema
>;

// DataForSEO authenticates with HTTP Basic auth, so the key is the base64 of
// "login:password" (the "Base64" credentials on the API Access page). A pasted
// "login:password" pair is encoded here, so either form works.
const dataforseoKeySchema = z
  .string()
  .trim()
  .min(1, "Paste your DataForSEO credentials")
  .max(1000)
  .transform((value, ctx) => {
    const encoded = value.includes(":") ? btoa(value) : value;
    let decoded: string;
    try {
      decoded = atob(encoded);
    } catch {
      decoded = "";
    }
    if (!decoded.includes(":")) {
      ctx.addIssue({
        code: "custom",
        message:
          "Paste the Base64 credentials, or your login and API password as login:password",
      });
      return z.NEVER;
    }
    return encoded;
  });

const openrouterKeySchema = z
  .string()
  .trim()
  .min(1, "Paste your OpenRouter API key")
  .max(1000)
  .refine(
    (value) => /^[\x21-\x7e]+$/.test(value),
    "This key contains characters an API key can't have",
  );

/** The settings form's field, per provider. */
export const workspaceApiKeyFormSchemas = {
  dataforseo: z.object({ apiKey: dataforseoKeySchema }),
  openrouter: z.object({ apiKey: openrouterKeySchema }),
} satisfies Record<WorkspaceApiKeyProvider, z.ZodType>;

export const saveWorkspaceApiKeySchema = z.discriminatedUnion("provider", [
  workspaceApiKeyFormSchemas.dataforseo.extend({
    provider: z.literal("dataforseo"),
  }),
  workspaceApiKeyFormSchemas.openrouter.extend({
    provider: z.literal("openrouter"),
  }),
]);

export const deleteWorkspaceApiKeySchema = z.object({
  provider: workspaceApiKeyProviderSchema,
});
