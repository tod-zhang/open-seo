import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { revalidateLogic } from "@tanstack/react-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/client/components/ConfirmDialog";
import { SectionHeader } from "@/client/components/PageHeader";
import { QueryState } from "@/client/components/QueryState";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  deleteDataforseoKey,
  getDataforseoKey,
  saveDataforseoKey,
} from "@/serverFunctions/dataforseoKey";
import { saveDataforseoKeySchema } from "@/types/schemas/dataforseoKey";

const dataforseoKeyQueryKey = ["dataforseo-key"];

/**
 * BYOK mode: the workspace's own DataForSEO key, which every DataForSEO call
 * the workspace makes runs on (web app, MCP, scheduled checks).
 */
export function DataforseoKeySettings() {
  const queryClient = useQueryClient();
  const [isRemoving, setIsRemoving] = useState(false);
  const keyQuery = useQuery({
    queryKey: dataforseoKeyQueryKey,
    queryFn: () => getDataforseoKey(),
  });

  const saveMutation = useMutation({
    mutationFn: (apiKey: string) => saveDataforseoKey({ data: { apiKey } }),
    onSuccess: (result) => {
      if ("problem" in result) return;
      queryClient.setQueryData(dataforseoKeyQueryKey, result.key);
      toast.success("DataForSEO key saved");
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => deleteDataforseoKey(),
    onSuccess: () => {
      queryClient.setQueryData(dataforseoKeyQueryKey, null);
      setIsRemoving(false);
      toast.success("DataForSEO key removed");
    },
  });

  const form = useAppForm({
    defaultValues: { apiKey: "" },
    validationLogic: revalidateLogic(),
    validators: { onDynamic: saveDataforseoKeySchema },
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
        title="DataForSEO API key"
        hint="This workspace's SEO data comes from your own DataForSEO account, and DataForSEO bills it there. The key is stored encrypted and never shown again."
      />
      <QueryState
        query={keyQuery}
        errorFallback="We couldn't load your DataForSEO key."
      >
        {(key) => (
          <div className="space-y-4">
            {key ? (
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-sm">Connected as {key.login}</p>
                  <p className="text-xs text-muted-foreground">
                    Saved {new Date(key.updatedAt).toLocaleDateString()}
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
              <p className="text-sm text-muted-foreground">
                No key yet. Research, rank tracking, and audits need one.
              </p>
            )}
            <form.AppForm>
              <form.Form className="space-y-3">
                <form.AppField name="apiKey">
                  {(field) => (
                    <field.TextField
                      label={key ? "Replace key" : "API key"}
                      description={
                        <>
                          Copy the Base64 credentials from{" "}
                          <a
                            href="https://app.dataforseo.com/api-access"
                            target="_blank"
                            rel="noreferrer"
                            className="underline underline-offset-4"
                          >
                            DataForSEO API Access
                          </a>
                          , or enter your login and API password as
                          login:password.
                        </>
                      }
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
        )}
      </QueryState>

      {isRemoving ? (
        <ConfirmDialog
          title="Remove the DataForSEO key?"
          confirmLabel="Remove key"
          destructive
          pending={removeMutation.isPending}
          onClose={() => setIsRemoving(false)}
          onConfirm={() => removeMutation.mutate()}
        >
          Research, scheduled rank checks, and AI visibility checks stop until a
          new key is saved.
        </ConfirmDialog>
      ) : null}
    </section>
  );
}
