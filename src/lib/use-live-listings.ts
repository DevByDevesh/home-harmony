import { useQuery } from "@tanstack/react-query";
import { listPropertiesFn } from "./properties.functions";
import { toListing } from "./property-mapper";

/**
 * Live ACTIVE listings from the database, mapped to the shared Listing shape.
 * One cached request shared by every consumer (saved-search matching, dashboard grids).
 */
export function useLiveListings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["properties", "live"],
    enabled: options?.enabled ?? true,
    queryFn: async () => (await listPropertiesFn({ data: { take: 100 } })).map(toListing),
  });
}
