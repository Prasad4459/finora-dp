import { queryOptions, useQuery } from "@tanstack/react-query";
import { notificationsRepo } from "@/repositories";
import { CACHE, financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";

export const notificationsQueryOptions = queryOptions({
  queryKey: financeKeys.notifications,
  queryFn: () => notificationsRepo.listRecent(),
  ...CACHE.short,
});

export function useNotifications() {
  const query = useQuery(notificationsQueryOptions);

  const markRead = useEntityMutation({
    mutationFn: (id: string) => notificationsRepo.markRead(id),
    invalidate: [financeKeys.notifications],
    success: "Marked as read",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => notificationsRepo.remove(id),
    invalidate: [financeKeys.notifications],
    success: "Notification removed",
  });

  return {
    rows: query.data ?? [],
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: () => void query.refetch(), markRead, remove };
}