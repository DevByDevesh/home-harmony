import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { getCurrentUser } from "./auth.functions";
import { authClient } from "./auth-client";

export const currentUserQuery = queryOptions({ queryKey: ["auth", "me"], queryFn: () => getCurrentUser(), staleTime: 60_000 });

/** UI-only view of the session user. Not a security boundary. */
export function useCurrentUser() {
  const q = useQuery(currentUserQuery);
  return { user: q.data ?? null, loading: q.isPending };
}

export function useSignOut() {
  const qc = useQueryClient(); const router = useRouter();
  return async () => {
    await qc.cancelQueries();
    await authClient.signOut();
    qc.setQueryData(currentUserQuery.queryKey, null);
    await router.invalidate();
    await router.navigate({ to: "/login", search: { signedOut: true }, replace: true });
  };
}
