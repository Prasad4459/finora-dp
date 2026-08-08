import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

/** Strips the "[table.op]" prefix repositories add to error messages. */
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message.replace(/^\[[^\]]+\]\s*/, "") : "Something went wrong";

/**
 * A real hook (declared at module scope) that wraps `useMutation` with the
 * project's toast + invalidation conventions. Safe to call from any component
 * or custom hook, unlike an inline factory.
 */
export function useEntityMutation<TArgs, TResult>(options: {
  mutationFn: (args: TArgs) => Promise<TResult>;
  /** Static key list, or a resolver that narrows keys from the mutation input. */
  invalidate: readonly QueryKey[] | ((args: TArgs) => readonly QueryKey[]);
  success: string;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: options.mutationFn,
    onSuccess: (_data, args) => {
      const keys =
        typeof options.invalidate === "function" ? options.invalidate(args) : options.invalidate;
      keys.forEach((queryKey) => qc.invalidateQueries({ queryKey }));
      toast.success(options.success);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}