import {
  createFileRoute,
  redirect,
  stripSearchParams,
  useNavigate,
} from "@tanstack/react-router";
import { isGoogleDataEnabled } from "@/lib/byok";
import { SearchPerformancePage } from "@/client/features/search-performance/SearchPerformancePage";
import {
  SEARCH_PERFORMANCE_DEFAULT_PAGE_SIZE,
  searchPerformanceSearchSchema,
} from "@/types/schemas/search-performance";

export const Route = createFileRoute("/_app/p/$projectId/search-performance")({
  beforeLoad: ({ params }) => {
    if (!isGoogleDataEnabled()) {
      throw redirect({ to: "/p/$projectId", params, replace: true });
    }
  },
  validateSearch: searchPerformanceSearchSchema,
  search: {
    middlewares: [
      stripSearchParams({
        tab: "striking",
        range: "last_28_days",
        page: 1,
        size: SEARCH_PERFORMANCE_DEFAULT_PAGE_SIZE,
      }),
    ],
  },
  component: SearchPerformanceRoute,
});

function SearchPerformanceRoute() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  return (
    <SearchPerformancePage
      projectId={projectId}
      search={search}
      onSearchChange={(update) => {
        void navigate({
          search: (prev) => ({ ...prev, ...update }),
          replace: true,
        });
      }}
    />
  );
}
