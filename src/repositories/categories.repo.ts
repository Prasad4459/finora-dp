import { createRepository } from "./base.repo";
import type { CategoryKind } from "@/types/database";

const repo = createRepository("categories");

export const categoriesRepo = {
  ...repo,
  listAll: () => repo.list({ orderBy: "name", ascending: true }),
  listByKind: (kind: CategoryKind) => repo.list({ filters: { kind }, orderBy: "name", ascending: true }),
};