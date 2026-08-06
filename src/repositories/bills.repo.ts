import { createRepository } from "./base.repo";

const repo = createRepository("bills");

export const billsRepo = {
  ...repo,
  listUpcoming: () => repo.list({ orderBy: "due_date", ascending: true }),
};