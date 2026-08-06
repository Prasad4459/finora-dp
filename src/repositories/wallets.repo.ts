import { createRepository } from "./base.repo";
import type { WalletType } from "@/types/database";

const repo = createRepository("wallets");

export const walletsRepo = {
  ...repo,
  listActive: () => repo.list({ filters: { is_active: true }, orderBy: "created_at", ascending: true }),
  listByType: (type: WalletType) => repo.list({ filters: { type }, orderBy: "created_at" }),
};