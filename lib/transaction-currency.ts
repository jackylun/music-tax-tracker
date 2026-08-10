import type { StoredTransaction } from "./db";
import type { RateSource } from "./exchange-rates";
import { resolveCurrencyForSave, ExchangeRateError } from "./exchange-rates";
import type { CurrencyCode } from "./currency";
import { buildTransactionFields } from "./transactions";
import type { PaymentStatus, Receipt } from "./types";

interface ValidatedTransactionInput {
  type: "income" | "expense";
  category: string;
  currency: CurrencyCode;
  original_amount: number;
  date: string;
  performance_date: string;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_status: PaymentStatus | null;
  rate_manual_override: boolean;
  gbp_manual_override: boolean;
  exchange_rate?: number;
  amount_gbp?: number;
}

export async function buildTransactionFieldsWithCurrency(
  input: ValidatedTransactionInput,
  meta: {
    gig_client: string | null;
    notes: string | null;
    created_by: string;
    created_at?: string;
    receipts?: Receipt[];
  },
  existing?: StoredTransaction | null
) {
  const currencyFields = await resolveCurrencyForSave({
    currency: input.currency,
    original_amount: input.original_amount,
    date: input.date,
    exchange_rate: input.exchange_rate,
    amount_gbp: input.amount_gbp,
    rate_manual_override: input.rate_manual_override,
    gbp_manual_override: input.gbp_manual_override,
    existing: existing
      ? {
          currency: (existing.currency as CurrencyCode) ?? "GBP",
          date: existing.date as string,
          exchange_rate: Number(existing.exchange_rate ?? 1),
          amount_gbp: Number(existing.amount_gbp ?? existing.amount ?? 0),
          exchange_rate_date: (existing.exchange_rate_date as string | null) ?? null,
          rate_source: (existing.rate_source as RateSource | null) ?? null,
          rate_manual_override: Boolean(existing.rate_manual_override),
          gbp_manual_override: Boolean(existing.gbp_manual_override),
        }
      : null,
  });

  return buildTransactionFields({
    type: input.type,
    category: input.category,
    date: input.date,
    currency: input.currency,
    original_amount: input.original_amount,
    exchange_rate: currencyFields.exchange_rate,
    amount_gbp: currencyFields.amount_gbp,
    exchange_rate_date: currencyFields.exchange_rate_date,
    rate_source: currencyFields.rate_source,
    rate_manual_override: currencyFields.rate_manual_override,
    gbp_manual_override: currencyFields.gbp_manual_override,
    performance_date: input.performance_date,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    paid_date: input.paid_date,
    payment_status: input.payment_status,
    gig_client: meta.gig_client,
    notes: meta.notes,
    created_by: meta.created_by,
    created_at: meta.created_at,
    receipts: meta.receipts,
  });
}

export function exchangeRateErrorResponse(error: unknown) {
  if (error instanceof ExchangeRateError) {
    return { error: error.message, status: 400 as const };
  }
  return null;
}
