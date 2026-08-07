import { queryOptions, useQuery } from "@tanstack/react-query";
import { billsRepo } from "@/repositories";
import { financeKeys } from "./query-keys";
import { useEntityMutation } from "./use-entity-mutation";
import type { BillInsert, BillUpdate } from "@/types/database";

export const billsQueryOptions = queryOptions({
  queryKey: financeKeys.bills,
  queryFn: () => billsRepo.listUpcoming(),
});

export function useBills() {
  const query = useQuery(billsQueryOptions);

  const create = useEntityMutation({
    mutationFn: (values: Omit<BillInsert, "user_id">) => billsRepo.create(values),
    invalidate: [financeKeys.bills],
    success: "Bill added",
  });
  const update = useEntityMutation({
    mutationFn: ({ id, values }: { id: string; values: BillUpdate }) => billsRepo.update(id, values),
    invalidate: [financeKeys.bills],
    success: "Bill updated",
  });
  const remove = useEntityMutation({
    mutationFn: (id: string) => billsRepo.remove(id),
    invalidate: [financeKeys.bills],
    success: "Bill removed",
  });

  return { rows: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}