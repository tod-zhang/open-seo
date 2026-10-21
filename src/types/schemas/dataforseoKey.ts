import { z } from "zod";

// DataForSEO authenticates with HTTP Basic auth, so the key is the base64 of
// "login:password" (the "Base64" credentials on the API Access page). A pasted
// "login:password" pair is encoded here, so either form works.
export const saveDataforseoKeySchema = z.object({
  apiKey: z
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
    }),
});
