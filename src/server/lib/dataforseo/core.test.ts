import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/lib/runtime-env", () => ({
  getRequiredEnvValue: vi.fn(async () => "encoded-credentials"),
  getOptionalEnvValue: vi.fn(async (name: string) => process.env[name]),
}));
vi.mock(
  "@/server/features/workspace-api-keys/services/WorkspaceApiKeyService",
  () => ({
    WorkspaceApiKeyService: {
      openKey: vi.fn(async () => "workspace-credentials"),
    },
  }),
);

import { withOrganizationDataforseoKey } from "@/server/lib/dataforseo/api-key-scope";
import { dataforseoPost } from "@/server/lib/dataforseo/core";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("DataForSEO transport", () => {
  it("retries a transient 5xx on idempotent reads and returns the parsed envelope", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("upstream failure", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ status_code: 20000, tasks: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      dataforseoPost("/v3/backlinks/summary/live", []),
    ).resolves.toEqual({ status_code: 20000, tasks: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.dataforseo.com/v3/backlinks/summary/live");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Basic encoded-credentials",
    );
  });

  // The request-deadline abort arrives as a bare DOMException. Left unclassified
  // it escapes as an anonymous INTERNAL_ERROR; retrying it would replay a call
  // DataForSEO may already have billed. Both names are reachable: the shared
  // budget aborts with TimeoutError, Lighthouse's own controller with AbortError.
  it.each(["TimeoutError", "AbortError"])(
    "maps a %s abort to UPSTREAM_UNAVAILABLE without retrying",
    async (name) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValue(new DOMException("aborted", name));
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        dataforseoPost("/v3/serp/google/organic/live/advanced", []),
      ).rejects.toMatchObject({
        code: "UPSTREAM_UNAVAILABLE",
        name: "DataForSEOTimeoutError",
      });
      expect(fetchMock).toHaveBeenCalledOnce();
    },
  );

  // A workspace's unverified or empty DataForSEO account must tell the user
  // what to fix instead of showing an anonymous internal error.
  it.each([
    [402, "DATAFORSEO_BALANCE_LOW"],
    [403, "DATAFORSEO_ACCOUNT_UNVERIFIED"],
  ])("maps HTTP %i to %s", async (status, code) => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status })),
    );

    await expect(
      dataforseoPost("/v3/dataforseo_labs/google/keyword_ideas/live", []),
    ).rejects.toMatchObject({ code });
  });

  describe("in BYOK mode", () => {
    function stubByok() {
      vi.stubEnv("AUTH_MODE", "hosted");
      vi.stubEnv("DATAFORSEO_BYOK", "true");
    }

    it("authenticates with the workspace's own key", async () => {
      stubByok();
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(Response.json({ status_code: 20000, tasks: [] }));
      vi.stubGlobal("fetch", fetchMock);

      await withOrganizationDataforseoKey("org_1", () =>
        dataforseoPost("/v3/backlinks/summary/live", []),
      );

      const [, init] = fetchMock.mock.calls[0];
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        "Basic workspace-credentials",
      );
    });

    // Falling back would bill the operator's DataForSEO account.
    it("never falls back to the operator's key", async () => {
      stubByok();
      const fetchMock = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        dataforseoPost("/v3/backlinks/summary/live", []),
      ).rejects.toMatchObject({ code: "DATAFORSEO_KEY_REQUIRED" });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
