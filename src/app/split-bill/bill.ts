/** Plain decimal number: digits with an optional decimal point. No signs, separators or exponents. */
const PLAIN_DECIMAL = /^(\d+\.?\d*|\.\d+)$/;

/** Reads what the user typed as a bill total. Returns null unless it is a plain number greater than 0. */
export function parseBillTotal(raw: string): number | null {
  const trimmed = raw.trim();
  if (!PLAIN_DECIMAL.test(trimmed)) {
    return null;
  }
  const total = Number(trimmed);
  return Number.isFinite(total) && total > 0 ? total : null;
}

/** Each person's share when the bill is split evenly. Unrounded: display decides the precision. */
export function evenShare(total: number, peopleCount: number): number {
  return total / peopleCount;
}
