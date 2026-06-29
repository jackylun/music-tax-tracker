import {
  formatAmountForCurrency,
  type CurrencyCode,
} from "./currency";
import type { Transaction } from "./types";
import { getGbpAmount } from "./transactions";

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatOriginalAmount(t: Transaction): string {
  return formatAmountForCurrency(t.original_amount, t.currency);
}

export function formatGbpApprox(t: Transaction): string {
  return formatMoney(getGbpAmount(t));
}

export function isForeignCurrency(t: Transaction): boolean {
  return t.currency !== "GBP";
}
