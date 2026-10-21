import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import type { z } from "zod";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  deleteWorkspaceApiKey,
  getWorkspaceApiKeys,
  saveWorkspaceApiKey,
} from "@/serverFunctions/workspaceApiKeys";
import {
  workspaceApiKeyFormSchemas,
  type WorkspaceApiKeyProvider,
} from "@/types/schemas/workspaceApiKeys";

const workspaceApiKeysQueryKey = ["workspace-api-keys"];

type KeySummary = { label: string; updatedAt: string };

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="underline underline-offset-4"
    >
      {children}
    </a>
  );
}

const PROVIDERS: Record<
  WorkspaceApiKeyProvider,
  {
    title: string;
    hint: string;
    missing: string;
    connected: (label: string) => string;
    description: ReactNode;
    removeWarning: string;
  }
> = {
  dataforseo: {
    title: "DataForSEO API key",
    hint: "This workspace's SEO data comes from your own DataForSEO account, and DataForSEO bills it there.",
    missing: "No key yet. Research, rank tracking, and audits need one.",
    connected: (label) => `Connected as ${label}`,
    description: (
      <>
        Copy the Base64 credentials from{" "}
        <ExternalLink href="https://app.dataforseo.com/api-access">
          DataForSEO API Access
        </ExternalLink>
        , or enter your login and API password as login:password.
      </>
    ),
    removeWarning:
      "Research, scheduled rank checks, and AI visibility checks stop until a new key is saved.",
  },
  openrouter: {
    title: "OpenRouter API key",
    hint: "SAM and the AI prompt features run on your own OpenRouter account, and OpenRouter bills it there.",
    missing: "No key yet. SAM and AI prompt suggestions need one.",
    connected: (label) => `Key ending ${label.replace("…", "")}`,
    description: (
      <>
        Create a key on{" "}
        <ExternalLink href="https://openrouter.ai/settings/keys">
          OpenRouter
        </ExternalLink>{" "}
        and paste it here.
      </>
    ),
    removeWarning:
      "SAM and AI prompt suggestions stop until a new key is saved.",
  },
};

/**
 * BYOK mode: the workspace's own provider keys, which every call the workspace
 * makes runs on (web app, MCP, scheduled checks).
 */
export function WorkspaceApiKeySettings() {
  const keysQuery = useQuery({
    queryKey: workspaceApiKeysQueryKey,
    queryFn: () => getWorkspaceApiKeys(),
  });

  return (
    <QueryState
      query={keysQuery}
      errorFallback="We couldn't load your API keys."
    >
      {(keys) => (
        <>
          <ProviderKeySection provider="dataforseo" current={keys.dataforseo} />
          <ProviderKeySection provider="openrouter" current={keys.openrouter} />
        </>
      )}
    </QueryState>
  );
}

function ProviderKeySection({
  provider,
  current,
}: {
  provider: WorkspaceApiKeyProvider;
  current: KeySummary | null;
}) {
  const copy = PROVIDERS[provider];
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (apiKey: string) =>
      saveWorkspaceApiKey({ data: { provider, apiKey } }),
    onSuccess: async (result) => {
      if ("problem" in result) return;
      await queryClient.invalidateQueries({
        queryKey: workspaceApiKeysQueryKey,
      });
      toast.success(`${copy.title} saved`);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteWorkspaceApiKey({ data: { provider } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceApiKeysQueryKey,
      });
      setIsRemoving(false);
      toast.success(`${copy.title} removed`);
    },
  });

  // Typed by its shape: the two providers' schemas differ only in refinements.
  const formSchema: z.ZodType<{ apiKey: string }, { apiKey: string }> =
    workspaceApiKeyFormSchemas[provider];
  const form = useAppForm({
    defaultValues: { apiKey: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: formSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await saveMutation.mutateAsync(value.apiKey);
      if ("problem" in result) {
        formApi.setErrorMap({
          onSubmit: { fields: { apiKey: result.problem } },
        });
        return;
      }
      formApi.reset();
    },
  });

  return (
    <section className="space-y-3">
      <SectionHeader
        title={copy.title}
        hint={`${copy.hint} The key is stored encrypted on this server and never shown again. You can revoke it at the provider at any time.`}
      />
      <div className="space-y-4">
        {current ? (
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm">{copy.connected(current.label)}</p>
              <p className="text-xs text-muted-foreground">
                Saved {new Date(current.updatedAt).toLocaleDateString()}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsRemoving(true)}
            >
              Remove
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{copy.missing}</p>
        )}
        <form.AppForm>
          <form.Form className="space-y-3">
            <form.AppField name="apiKey">
              {(field) => (
                <field.TextField
                  label={current ? "Replace key" : "API key"}
                  description={copy.description}
                  type="password"
                  autoComplete="off"
                  data-ph-mask
                  className="font-mono"
                  required
                />
              )}
            </form.AppField>
            <form.SubmitButton>Save key</form.SubmitButton>
          </form.Form>
        </form.AppForm>
      </div>

      {isRemoving ? (
        <ConfirmDialog
          title={`Remove the ${copy.title}?`}
          confirmLabel="Remove key"
          destructive
          pending={removeMutation.isPending}
          onClose={() => setIsRemoving(false)}
          onConfirm={() => removeMutation.mutate()}
        >
          {copy.removeWarning}
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
