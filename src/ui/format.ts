/**
 * Number formatting used across the screens.
 * Keeping it in one place makes units consistent everywhere.
 */

/** A number with a fixed number of decimals, e.g. fmt(7.75, 1) -> "7.8". */
export function fmt(value: number, decimals = 1): string {
  // Avoid "-0.0" when a value rounds to zero.
  const rounded = Number(value.toFixed(decimals));
  return (rounded === 0 ? 0 : rounded).toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Money in US$ million per year, e.g. "$1,684M". */
export function money(millionUsd: number): string {
  return `$${Math.round(millionUsd).toLocaleString("en-GB")}M`;
}

/** A share as a whole percentage, e.g. pct(0.314) -> "31%". */
export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}
