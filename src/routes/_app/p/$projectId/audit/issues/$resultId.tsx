import { createFileRoute, redirect } from "@tanstack/react-router";
import { isSiteAuditEnabled } from "@/lib/byok";
import { LighthouseIssuesScreen } from "@/client/features/lighthouse/issues/LighthouseIssuesScreen";
import { lighthouseIssuesSearchSchema } from "@/types/schemas/lighthouse";

export const Route = createFileRoute(
  "/_app/p/$projectId/audit/issues/$resultId",
)({
  beforeLoad: ({ params }) => {
    if (!isSiteAuditEnabled()) {
      throw redirect({ to: "/p/$projectId", params, replace: true });
    }
  },
  validateSearch: lighthouseIssuesSearchSchema,
  component: AuditIssuesPage,
});

function AuditIssuesPage() {
  const { projectId, resultId } = Route.useParams();
  const { auditId, category } = Route.useSearch();

  return (
    <LighthouseIssuesScreen
      projectId={projectId}
      resultId={resultId}
      category={category}
      auditId={auditId}
    />
  );
}
