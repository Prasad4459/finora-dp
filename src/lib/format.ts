// Indian locale (en-IN) formatting helpers for currency and dates.

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const currencyExactFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN");

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Kolkata",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Kolkata",
});

export const formatINR = (n: number) => currencyFormatter.format(n);
export const formatINRExact = (n: number) => currencyExactFormatter.format(n);
export const formatNumberIN = (n: number) => numberFormatter.format(n);
export const formatDateIN = (d: Date | string | number) =>
  dateFormatter.format(new Date(d));
export const formatShortDateIN = (d: Date | string | number) =>
  shortDateFormatter.format(new Date(d));

// Compact axis tick, e.g. ₹1.2L, ₹1.5Cr
export const formatINRCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(abs % 1_00_00_000 === 0 ? 0 : 1)}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(abs % 1_00_000 === 0 ? 0 : 1)}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1)}k`;
  return `₹${n}`;
};