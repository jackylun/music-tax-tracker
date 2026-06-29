export const SUPPORTED_CURRENCIES = ["GBP", "EUR", "USD", "HKD", "JPY"] as const;
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  GBP: "£",
  EUR: "€",
  USD: "$",
  HKD: "HK$",
  JPY: "¥",
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  GBP: "GBP (£)",
  EUR: "EUR (€)",
  USD: "USD ($)",
  HKD: "HKD (HK$)",
  JPY: "JPY (¥)",
};

export function isValidCurrency(code: string): code is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}

/** GBP per 1 unit of foreign currency. GBP always returns 1. */
export function calculateGbpEquivalent(
  originalAmount: number,
  currency: CurrencyCode,
  exchangeRate: number
): number {
  if (currency === "GBP") return roundMoney(originalAmount);
  return roundMoney(originalAmount * exchangeRate);
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function roundJpy(amount: number): number {
  return Math.round(amount);
}

export function getDecimalPlaces(currency: CurrencyCode): number {
  return currency === "JPY" ? 0 : 2;
}

export function formatAmountForCurrency(
  amount: number,
  currency: CurrencyCode
): string {
  const decimals = getDecimalPlaces(currency);
  const symbol = CURRENCY_SYMBOLS[currency];
  const formatted = amount.toLocaleString("en-GB", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${symbol}${formatted}`;
}
