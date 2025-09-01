import { queryClient } from "@/lib/queryClient";

// Force clear all React Query cache
export function clearAllCache() {
  queryClient.clear();
  // Also force browser cache clear by reloading
  window.location.reload();
}

// Clear specific health metrics cache
export function clearHealthMetricsCache() {
  queryClient.removeQueries({ queryKey: ["/api/health-metrics"] });
  queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
}