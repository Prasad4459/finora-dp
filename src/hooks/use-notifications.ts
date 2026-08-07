import { queryOptions, useQuery } from "@tanstack/react-query";
import { notificationsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";

export const notificationsQueryOptions = queryOptions({
  queryKey: financeKeys.notifications,
  queryFn: () => notificationsRepo.listRecent(),
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

  return { rows: query.data ?? [], isLoading: query.isLoading, markRead, remove };
}