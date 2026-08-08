import { createRepository } from "./base.repo";

const repo = createRepository("investment_contributions");

export const investmentContributionsRepo = {
  ...repo,
  listAll: () => repo.list({ orderBy: "next_due_date", ascending: true }),
};