import { createFileRoute, Outlet } from "@tanstack/react-router";
import { ProjectPageHeader } from "@/client/features/projects/ProjectPageHeader";
import { SettingsTabs } from "@/client/features/projects/SettingsTabs";
import { isProjectIntegrationsEnabled } from "@/lib/byok";

export const Route = createFileRoute("/_app/p/$projectId/settings")({
  component: ProjectSettingsLayout,
});

function ProjectSettingsLayout() {
  const { projectId } = Route.useParams();

  return (
    <div className="h-full overflow-auto px-4 py-4 pb-24 md:px-6 md:py-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-4">
          <ProjectPageHeader
            projectId={projectId}
            title="Project settings"
            showBackLink
          />
          {/* Integrations is the only other tab, so BYOK shows no tabs. */}
          {isProjectIntegrationsEnabled() ? (
            <SettingsTabs projectId={projectId} />
          ) : null}
        </div>

        <Outlet />
      </div>
    </div>
  );
}
