import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PublicSchema = Database["public"];
export type TableName = keyof PublicSchema["Tables"];

type Row<T extends TableName> = PublicSchema["Tables"][T]["Row"];
type Insert<T extends TableName> = PublicSchema["Tables"][T]["Insert"];
type Update<T extends TableName> = PublicSchema["Tables"][T]["Update"];

/** Column names of a table — used to type `orderBy` and `filters`. */
export type Column<T extends TableName> = Extract<keyof Row<T>, string>;

/**
 * Loosely-typed view of the client. The generated Supabase types cannot infer
 * a generic table name, so we narrow the return types ourselves below.
 */
type UntypedQuery = {
  select: (cols?: string) => UntypedQuery;
  insert: (values: unknown) => UntypedQuery;
  update: (values: unknown) => UntypedQuery;
  delete: () => UntypedQuery;
  eq: (col: string, value: unknown) => UntypedQuery;
  is: (col: string, value: unknown) => UntypedQuery;
  gte: (col: string, value: unknown) => UntypedQuery;
  lte: (col: string, value: unknown) => UntypedQuery;
  order: (col: string, opts: { ascending: boolean }) => UntypedQuery;
  limit: (n: number) => UntypedQuery;
  maybeSingle: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  single: () => PromiseLike<{ data: unknown; error: { message: string } | null }>;
} & PromiseLike<{ data: unknown; error: { message: string } | null }>;

const db = supabase as unknown as { from: (table: string) => UntypedQuery };

export type ListOptions<T extends TableName> = {
  orderBy?: Column<T>;
  ascending?: boolean;
  limit?: number;
  /** Simple equality filters, e.g. { type: "expense" } — keys are checked against the table columns. */
  filters?: Partial<Record<Column<T>, string | number | boolean | null>>;
};

/** Throws a readable error for any failed Supabase call. */
function unwrap<T>(data: T | null, error: { message: string } | null, ctx: string): T {
  if (error) throw new Error(`[${ctx}] ${error.message}`);
  return data as T;
}

/** Current user's id — every table is RLS-scoped to it. */
export async function currentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * Generic, typed CRUD helpers for a user-owned table.
 * RLS already restricts rows to the signed-in user; user_id is filled on create.
 */
export function createRepository<T extends TableName>(table: T) {
  return {
    async list(options: ListOptions<T> = {}): Promise<Row<T>[]> {
      let query = db.from(table).select("*");
      for (const [key, value] of Object.entries(options.filters ?? {})) {
        query = value === null ? query.is(key, null) : query.eq(key, value);
      }
      if (options.orderBy) {
        query = query.order(options.orderBy, { ascending: options.ascending ?? false });
      }
      if (options.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      return unwrap(data, error, `${table}.list`) as Row<T>[];
    },

    async getById(id: string): Promise<Row<T> | null> {
      const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
      return unwrap(data, error, `${table}.getById`) as Row<T> | null;
    },

    async create(values: Omit<Insert<T>, "user_id"> & { user_id?: string }): Promise<Row<T>> {
      const user_id = values.user_id ?? (await currentUserId());
      const { data, error } = await db
        .from(table)
        .insert({ ...values, user_id })
        .select()
        .single();
      return unwrap(data, error, `${table}.create`) as Row<T>;
    },

    async update(id: string, values: Update<T>): Promise<Row<T>> {
      const { data, error } = await db
        .from(table)
        .update(values)
        .eq("id", id)
        .select()
        .single();
      return unwrap(data, error, `${table}.update`) as Row<T>;
    },

    async remove(id: string): Promise<void> {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw new Error(`[${table}.remove] ${error.message}`);
    },
  };
}