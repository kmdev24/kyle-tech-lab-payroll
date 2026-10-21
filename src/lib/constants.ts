export const BRAND = "KYLE TECH LAB";
export const PAYSLIP_TITLE = `${BRAND} - OFFICIAL PAYSLIP STATEMENT`;
export const BASE_RATE_USD = 30;
export const VIEWER_SHARE = 0.3; // Mom's 30%
export const VIEWER_RATE_USD = BASE_RATE_USD * VIEWER_SHARE; // $9.00
// Calibrated from a real Stripe payout (Oct 14, 2026): 62.3271 PHP/USD vs ~62.93 mid-market.
export const DEFAULT_FX_FEE_PERCENT = 1.0;
export const BANK_OPTIONS = ["GoTyme", "GCash", "Maya", "UnionBank", "BPI", "BDO", "Other"] as const;
