import { createRepository } from "./base.repo";

/**
 * Valuation history for an investment. One row per intentional price update
 * (manual today, market feed later). Never written automatically.
 */
const repo = createRepository("asset_valuations");

export const assetValuationsRepo = {
  ...repo,
  listForAsset: (assetId: string) =>
    repo.list({ orderBy: "as_of", ascending: false, filters: { asset_id: assetId } }),
};
