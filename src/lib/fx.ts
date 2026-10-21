import { DEFAULT_FX_FEE_PERCENT } from "./constants";

export type FxQuote = {
  /** Mid-market USD -> PHP rate from the API, or null if unavailable. */
  midRate: number | null;
  /** Stripe FX fee/margin deducted, in percent (1.5 = 1.5%). */
  feePercent: number;
  /** Rate after the fee: what UnionBank actually pays out per USD. */
  effectiveRate: number | null;
  updatedAt: string | null;
};

export function applyFee(midRate: number, feePercent: number) {
  return midRate * (1 - feePercent / 100);
}

/** Live USD -> PHP mid rate (cached for 1 hour). Returns null on failure. */
export async function fetchUsdPhpRate(): Promise<{ rate: number; updatedAt: string } | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_utc?: string;
    };
    const rate = data.rates?.PHP;
    if (data.result !== "success" || typeof rate !== "number") return null;
    return { rate, updatedAt: data.time_last_update_utc ?? new Date().toUTCString() };
  } catch {
    return null;
  }
}

export async function getFxQuote(feePercent = DEFAULT_FX_FEE_PERCENT): Promise<FxQuote> {
  const live = await fetchUsdPhpRate();
  return {
    midRate: live?.rate ?? null,
    feePercent,
    effectiveRate: live ? applyFee(live.rate, feePercent) : null,
    updatedAt: live?.updatedAt ?? null,
  };
}
