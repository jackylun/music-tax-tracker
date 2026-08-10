import {
  calculateGbpEquivalent,
  isValidCurrency,
  roundJpy,
  roundMoney,
  type CurrencyCode,
} from "./currency";

export type RateSource = "frankfurter" | "manual" | "legacy";

export interface ExchangeRateResult {
  currency: CurrencyCode;
  /** GBP per 1 unit of foreign currency */
  rate: number;
  requestedDate: string;
  /** Actual date returned by Frankfurter (may differ on weekends/holidays) */
  rateDate: string;
  source: "frankfurter";
}

export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

export async function fetchGbpRate(
  currency: CurrencyCode,
  date: string
): Promise<ExchangeRateResult> {
  if (currency === "GBP") {
    return {
      currency,
      rate: 1,
      requestedDate: date,
      rateDate: date,
      source: "frankfurter",
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ExchangeRateError("Invalid date for exchange rate lookup");
  }

  const endpoint = `https://api.frankfurter.app/${date}?from=${currency}&to=GBP`;

  let response: Response;
  try {
    response = await fetch(endpoint, { cache: "no-store" });
  } catch {
    throw new ExchangeRateError(
      "Exchange rate service unavailable. Enter a manual rate or GBP amount."
    );
  }

  if (!response.ok) {
    throw new ExchangeRateError(
      `Could not fetch exchange rate for ${currency} on ${date}. Enter a manual rate or GBP amount.`
    );
  }

  let data: { date?: string; rates?: { GBP?: number } };
  try {
    data = await response.json();
  } catch {
    throw new ExchangeRateError("Invalid response from exchange rate service.");
  }

  const rate = data.rates?.GBP;
  if (rate == null || !Number.isFinite(rate) || rate <= 0) {
    throw new ExchangeRateError(
      `Exchange rate not available for ${currency} on ${date}. Enter a manual rate or GBP amount.`
    );
  }

  if (rate === 1) {
    throw new ExchangeRateError(
      `Unexpected 1:1 rate for ${currency}. Enter a manual rate or GBP amount.`
    );
  }

  return {
    currency,
    rate,
    requestedDate: date,
    rateDate: data.date ?? date,
    source: "frankfurter",
  };
}

export interface ResolvedCurrencyFields {
  exchange_rate: number;
  amount_gbp: number;
  exchange_rate_date: string | null;
  rate_source: RateSource;
  rate_manual_override: boolean;
  gbp_manual_override: boolean;
}

export interface ResolveCurrencyInput {
  currency: CurrencyCode;
  original_amount: number;
  date: string;
  exchange_rate?: number | null;
  amount_gbp?: number | null;
  rate_manual_override?: boolean;
  gbp_manual_override?: boolean;
  existing?: {
    currency: CurrencyCode;
    date: string;
    exchange_rate: number;
    amount_gbp: number;
    exchange_rate_date: string | null;
    rate_source: RateSource | null;
    rate_manual_override: boolean;
    gbp_manual_override: boolean;
  } | null;
}

export async function resolveCurrencyForSave(
  input: ResolveCurrencyInput
): Promise<ResolvedCurrencyFields> {
  const originalAmount =
    input.currency === "JPY"
      ? roundJpy(input.original_amount)
      : roundMoney(input.original_amount);

  if (input.currency === "GBP") {
    return {
      exchange_rate: 1,
      amount_gbp: originalAmount,
      exchange_rate_date: input.date,
      rate_source: "frankfurter",
      rate_manual_override: false,
      gbp_manual_override: false,
    };
  }

  const rateManual = Boolean(input.rate_manual_override);
  const gbpManual = Boolean(input.gbp_manual_override);

  const existing = input.existing;
  const currencyOrDateChanged =
    !existing ||
    existing.currency !== input.currency ||
    existing.date !== input.date;

  if (
    existing &&
    !currencyOrDateChanged &&
    !rateManual &&
    !gbpManual
  ) {
    return {
      exchange_rate: existing.exchange_rate,
      amount_gbp: existing.amount_gbp,
      exchange_rate_date: existing.exchange_rate_date,
      rate_source: existing.rate_source ?? "legacy",
      rate_manual_override: existing.rate_manual_override,
      gbp_manual_override: existing.gbp_manual_override,
    };
  }

  if (gbpManual) {
    const amountGbp = Number(input.amount_gbp);
    if (!Number.isFinite(amountGbp) || amountGbp <= 0) {
      throw new ExchangeRateError("Enter a valid GBP amount.");
    }
    const roundedGbp = roundMoney(amountGbp);
    const impliedRate = roundMoney(roundedGbp / originalAmount);
    if (impliedRate <= 0) {
      throw new ExchangeRateError("Invalid GBP amount for this transaction.");
    }
    return {
      exchange_rate: impliedRate,
      amount_gbp: roundedGbp,
      exchange_rate_date: input.date,
      rate_source: "manual",
      rate_manual_override: false,
      gbp_manual_override: true,
    };
  }

  if (rateManual) {
    const rate = Number(input.exchange_rate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new ExchangeRateError("Enter a valid exchange rate.");
    }
    return {
      exchange_rate: rate,
      amount_gbp: calculateGbpEquivalent(originalAmount, input.currency, rate),
      exchange_rate_date: input.date,
      rate_source: "manual",
      rate_manual_override: true,
      gbp_manual_override: false,
    };
  }

  const fetched = await fetchGbpRate(input.currency, input.date);
  return {
    exchange_rate: fetched.rate,
    amount_gbp: calculateGbpEquivalent(
      originalAmount,
      input.currency,
      fetched.rate
    ),
    exchange_rate_date: fetched.rateDate,
    rate_source: "frankfurter",
    rate_manual_override: false,
    gbp_manual_override: false,
  };
}

export function parseCurrencyBody(body: Record<string, unknown>) {
  const currency: CurrencyCode =
    body.currency && isValidCurrency(body.currency as string)
      ? (body.currency as CurrencyCode)
      : "GBP";

  return {
    currency,
    rate_manual_override: body.rate_manual_override === true,
    gbp_manual_override: body.gbp_manual_override === true,
    exchange_rate:
      body.exchange_rate != null ? Number(body.exchange_rate) : undefined,
    amount_gbp: body.amount_gbp != null ? Number(body.amount_gbp) : undefined,
  };
}
