import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { isSiteAuditEnabled } from "@/lib/byok";
import { useCallback } from "react";
import { auditSearchSchema } from "@/types/schemas/audit";
import { LaunchView } from "@/client/features/audit/launch/LaunchView";
import { AuditDetail } from "@/client/features/audit/AuditDetail";

export const Route = createFileRoute("/_app/p/$projectId/audit/")({
  beforeLoad: ({ params }) => {
    if (!isSiteAuditEnabled()) {
      throw redirect({ to: "/p/$projectId", params, replace: true });
    }
  },
  validateSearch: auditSearchSchema,
  component: SiteAuditPage,
});

function SiteAuditPage() {
  const { projectId } = Route.useParams();
  const { auditId, tab, url } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const setSearchParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      void navigate({
        search: (prev) => ({ ...prev, ...updates }),
        replace: true,
      });
    },
    [navigate],
  );

  if (!auditId) {
    return (
      <LaunchView
        projectId={projectId}
        initialUrl={url ?? ""}
        onAuditStarted={(id) =>
          setSearchParams({ auditId: id, url: undefined })
        }
      />
    );
  }

  return (
    <AuditDetail
      projectId={projectId}
      auditId={auditId}
      tab={tab}
      onBack={() => setSearchParams({ auditId: undefined })}
      onTabChange={(nextTab) => setSearchParams({ tab: nextTab })}
    />
  );
}
