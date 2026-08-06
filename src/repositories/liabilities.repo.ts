import { createRepository } from "./base.repo";

const repo = createRepository("liabilities");

export const liabilitiesRepo = {
  ...repo,
  listActive: () => repo.list({ filters: { status: "active" }, orderBy: "next_due_date", ascending: true }),
};