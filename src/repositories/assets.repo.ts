import { createRepository } from "./base.repo";

const repo = createRepository("assets");

export const assetsRepo = {
  ...repo,
  listAll: () => repo.list({ orderBy: "created_at" }),
};