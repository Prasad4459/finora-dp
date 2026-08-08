import { supabase } from "@/integrations/supabase/client";
import { createRepository } from "./base.repo";
import type { Category, CategoryKind } from "@/types/database";

const repo = createRepository("categories");

export const categoriesRepo = {
  ...repo,
  listAll: () => repo.list({ orderBy: "name", ascending: true }),
  listByKind: (kind: CategoryKind) => repo.list({ filters: { kind }, orderBy: "name", ascending: true }),

  /** Case-insensitive lookup used to avoid creating duplicate categories. */
  async findByName(name: string, kind: CategoryKind): Promise<Category | null> {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .ilike("name", name)
      .in("kind", [kind, "both"])
      .limit(1);
    if (error) throw new Error(`[categories.findByName] ${error.message}`);
    return data?.[0] ?? null;
  },

  /**
   * Returns the existing category or creates it. Safe under concurrency: a
   * unique-violation from a racing insert falls back to a re-read.
   */
  async ensure(name: string, kind: CategoryKind): Promise<Category> {
    const existing = await categoriesRepo.findByName(name, kind);
    if (existing) return existing;
    try {
      return (await repo.create({ name, kind })) as Category;
    } catch (e) {
      const again = await categoriesRepo.findByName(name, kind);
      if (again) return again;
      throw e;
    }
  },
};
