import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export const formatUsd = (n: number) => usd.format(n);
export const formatPhp = (n: number) => php.format(n);

// Cutoff dates are stored as DATE (UTC midnight), so always format in UTC.
export function formatDate(d: Date | string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Date(d).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * PDF passwords are typed into env vars and forms, where stray spaces or
 * wrapping quotes (e.g. "08071980" pasted with the quotes) are easy to add.
 */
export function normalizePdfPassword(raw: string | null | undefined) {
  return (raw ?? "").trim().replace(/^(["'])(.*)\1$/, "$2").trim();
}
