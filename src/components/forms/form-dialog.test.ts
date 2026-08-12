import { describe, expect, it } from "vitest";
import { normalizeOptions } from "./form-dialog";

describe("normalizeOptions", () => {
  it("drops empty-valued options (Radix SelectItem throws on empty values)", () => {
    expect(normalizeOptions(["", "NSE", "BSE"])).toEqual([
      { value: "NSE", label: "NSE" },
      { value: "BSE", label: "BSE" },
    ]);
  });

  it("keeps sentinel options used for legacy assets with no exchange", () => {
    const opts = normalizeOptions([{ value: "none", label: "Not applicable" }, "NSE"]);
    expect(opts.map((o) => o.value)).toEqual(["none", "NSE"]);
  });
});
