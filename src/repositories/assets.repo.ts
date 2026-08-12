import { createRepository } from "./base.repo";
import { assetValuationsRepo } from "./asset-valuations.repo";
import { isValidPrice } from "@/services/instruments";

const repo = createRepository("assets");

export type PriceUpdate = {
  /** Price per unit / per gram. Must be a finite, positive number. */
  price: number;
  /** ISO date the price is valid for (defaults to today, IST caller supplied). */
  asOf: string;
  source?: "manual" | "nse" | "bse" | "amfi" | "gold_inr";
};

export const assetsRepo = {
  ...repo,
  listAll: () => repo.list({ orderBy: "created_at" }),

  /**
   * The ONLY way a market/manual price reaches an asset.
   *  • A null / zero / non-finite price is rejected — a failed lookup must
   *    never wipe a good valuation.
   *  • last_price and last_price_at always move together.
   *  • Every accepted price is appended to asset_valuations (history).
   */
  async updatePrice(id: string, update: PriceUpdate) {
    if (!isValidPrice(update.price)) {
      throw new Error("Invalid price — the existing valuation was kept");
    }
    const existing = (await repo.getById(id)) as {
      units: number | null;
      current_value: number | string;
    } | null;
    if (!existing) throw new Error("Investment not found");

    const units = existing.units === null ? null : Number(existing.units);
    const value =
      units && units > 0 ? Math.round(units * update.price) : Number(existing.current_value);

    const row = await repo.update(id, {
      last_price: update.price,
      last_price_at: new Date().toISOString(),
      current_value: value,
    } as never);

    await assetValuationsRepo.create({
      asset_id: id,
      as_of: update.asOf,
      value,
      units,
      source: update.source ?? "manual",
    } as never);

    return row;
  },
};
