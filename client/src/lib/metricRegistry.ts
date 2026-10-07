import { useQuery } from "@tanstack/react-query";
import { seedRegistry, type MetricRegistry } from "@shared/venueMetrics";

// Venue metric definitions as admins set them (Admin → Get template → Settings). Until the API answers,
// the built-in seed list is used, so facts render immediately and simply refine once loaded.
let current: MetricRegistry = seedRegistry();

export function metricRegistry(): MetricRegistry {
  return current;
}

// Call in pages that show or edit venue metrics; returns the registry and re-renders when it loads
export function useMetricRegistry(): MetricRegistry {
  const { data } = useQuery<{ registry: MetricRegistry }>({
    queryKey: ["/api/venue-metrics/definitions"],
    staleTime: 5 * 60_000,
  });
  if (data?.registry && Object.keys(data.registry).length) current = data.registry;
  return current;
}
