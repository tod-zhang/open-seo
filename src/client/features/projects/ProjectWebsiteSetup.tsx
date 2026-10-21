import { useState } from "react";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/client/components/ui/card";
import { WebsiteResearchProgress } from "./WebsiteResearchProgress";
import { Button } from "@/client/components/ui/button";
import { Input } from "@/client/components/ui/input";
import { Field, FieldLabel } from "@/client/components/ui/field";
import { Alert, AlertDescription } from "@/client/components/ui/alert";
import { InsufficientCreditsError } from "@/client/features/billing/InsufficientCreditsError";
import { getErrorCode } from "@/client/lib/error-messages";
import { projectsQueryOptions } from "@/client/features/projects/projectQueries";
import { projectContextQueryKey } from "@/client/features/projects/project-context/shared";
import { getProjectContext } from "@/serverFunctions/projectContext";
import { WebsiteSetupReview } from "@/client/features/projects/WebsiteSetupReview";
import {
  researchProjectWebsite,
  saveProjectWebsiteSetup,
} from "@/serverFunctions/projectWebsite";
import {
  websiteResearchSchema,
  type SaveProjectWebsiteSetup,
} from "@/types/schemas/projectWebsite";

export function ProjectWebsiteSetup({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  // Research keeps running on the server when the user leaves the page, so
  // its latest run is read from the mutation cache, not component state:
  // coming back shows its progress, result or error again.
  const researchKey = ["projectWebsiteResearch", projectId];
  const latestResearch = useMutationState({
    filters: { mutationKey: researchKey },
    select: (mutation) => mutation,
  }).at(-1);
  const researchState = latestResearch?.state;
  const research =
    researchState?.status === "success"
      ? websiteResearchSchema.parse(researchState.data)
      : undefined;
  const [website, setWebsite] = useState(
    typeof researchState?.variables === "string" ? researchState.variables : "",
  );
  // Saved context decides which research steps run.
  const context = useQuery({
    queryKey: projectContextQueryKey(projectId),
    queryFn: () => getProjectContext({ data: { projectId } }),
  });
  const researchMutation = useMutation({
    mutationKey: researchKey,
    mutationFn: (site: string) =>
      researchProjectWebsite({ data: { projectId, website: site } }),
  });
  const saveMutation = useMutation({
    mutationFn: (accepted: Omit<SaveProjectWebsiteSetup, "projectId">) =>
      saveProjectWebsiteSetup({ data: { ...accepted, projectId } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: projectsQueryOptions().queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: ["projectAccess", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["projectContext", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["aiVisibility", projectId],
        }),
      ]);
      toast.success("Project context saved");
    },
  });
  if (research)
    return (
      <WebsiteSetupReview
        projectId={projectId}
        research={research}
        saving={saveMutation.isPending}
        error={saveMutation.isError}
        onSave={(accepted) => saveMutation.mutate(accepted)}
        onBack={() => {
          if (latestResearch)
            queryClient.getMutationCache().remove(latestResearch);
          saveMutation.reset();
        }}
      />
    );
  if (researchState?.status === "pending")
    return (
      <WebsiteResearchProgress
        missingOverview={
          !context.data?.sections.some(
            (section) => section.key === "business_overview",
          )
        }
        missingCompetitors={!context.data?.competitors.length}
      />
    );
  return (
    <Card className="w-full max-w-2xl py-6 md:py-8">
      <CardContent className="px-6 md:px-8">
        <form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            researchMutation.mutate(website);
          }}
        >
          <div>
            <div className="mb-4 flex size-10 items-center justify-center rounded-lg border border-border bg-muted">
              <Sparkles className="size-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Set up AI visibility
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              We’ll research your brand and find the most relevant topics to
              monitor.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="project-website">Website URL</FieldLabel>
            <Input
              id="project-website"
              inputMode="url"
              autoComplete="url"
              placeholder="Enter your website URL"
              value={website}
              onChange={(event) => setWebsite(event.target.value)}
              required
            />
          </Field>
          {getErrorCode(researchState?.error) === "INSUFFICIENT_CREDITS" ? (
            <InsufficientCreditsError title="We couldn’t research this website" />
          ) : (
            researchState?.status === "error" && (
              <Alert variant="destructive">
                <AlertDescription>
                  We couldn’t research this website. Check the URL and provider
                  settings, then try again.
                </AlertDescription>
              </Alert>
            )
          )}
          <div className="space-y-3">
            <Button
              type="submit"
              size="lg"
              disabled={!website.trim()}
              className="w-full"
            >
              Start research
            </Button>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Research and a first run of your prompts use a small amount of
              usage credits.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
