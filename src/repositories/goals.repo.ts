import { createRepository } from "./base.repo";

const repo = createRepository("goals");

export const goalsRepo = {
  ...repo,
  listActive: () => repo.list({ filters: { status: "active" }, orderBy: "target_date", ascending: true }),
};