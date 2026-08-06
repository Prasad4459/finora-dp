import { createRepository } from "./base.repo";

const repo = createRepository("budgets");

export const budgetsRepo = {
  ...repo,
  listForMonth: (year: number, month: number) =>
    repo.list({ filters: { period_year: year, period_month: month }, orderBy: "created_at" }),
};