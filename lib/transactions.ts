import {
  calculateGbpEquivalent,
  type CurrencyCode,
  isValidCurrency,
  roundJpy,
  roundMoney,
} from "./currency";
import { isValidPaymentStatus } from "./income";
import type { PaymentStatus, Receipt, Transaction } from "./types";

function parseOptionalDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/** Normalise legacy records and compute currency fields. */
export function normalizeTransaction(raw: Record<string, unknown>): Transaction {
  const currency = resolveCurrency(raw);
  const originalAmount = resolveOriginalAmount(raw, currency);
  const exchangeRate = resolveExchangeRate(raw, currency);
  const amountGbp = resolveAmountGbp(raw, currency, originalAmount, exchangeRate);
  const type = raw.type as Transaction["type"];
  const date = raw.date as string;

  const rawReceipts = raw.receipts as Receipt[] | undefined;
  const receipts: Receipt[] = Array.isArray(rawReceipts) ? rawReceipts : [];

  let paymentStatus: PaymentStatus | null = null;
  if (type === "income") {
    const stored = raw.payment_status as string | undefined;
    paymentStatus =
      stored && isValidPaymentStatus(stored) ? stored : "Paid";
  }

  return {
    id: raw.id as number,
    type,
    category: raw.category as string,
    amount_gbp: amountGbp,
    amount: amountGbp,
    currency,
    original_amount: originalAmount,
    exchange_rate: exchangeRate,
    date,
    performance_date:
      parseOptionalDate(raw.performance_date) ?? date,
    gig_client: (raw.gig_client as string | null) ?? null,
    invoice_date: parseOptionalDate(raw.invoice_date),
    due_date: parseOptionalDate(raw.due_date),
    paid_date: parseOptionalDate(raw.paid_date),
    payment_status: paymentStatus,
    notes:
      (raw.notes as string | null) ??
      (raw.description as string | null) ??
      null,
    description: raw.description as string | null | undefined,
    created_by: raw.created_by as string,
    created_at: raw.created_at as string,
    receipts,
    receipt_ids: (raw.receipt_ids as string[]) ?? receipts.map((r) => r.id),
  };
}

function resolveCurrency(raw: Record<string, unknown>): CurrencyCode {
  const c = raw.currency as string | undefined;
  if (c && isValidCurrency(c)) return c;
  return "GBP";
}

function resolveOriginalAmount(
  raw: Record<string, unknown>,
  currency: CurrencyCode
): number {
  if (raw.original_amount != null) {
    const v = Number(raw.original_amount);
    return currency === "JPY" ? roundJpy(v) : roundMoney(v);
  }
  const legacy = Number(raw.amount);
  return currency === "JPY" ? roundJpy(legacy) : roundMoney(legacy);
}

function resolveExchangeRate(
  raw: Record<string, unknown>,
  currency: CurrencyCode
): number {
  if (currency === "GBP") return 1;
  if (raw.exchange_rate != null) return Number(raw.exchange_rate);
  return 1;
}

function resolveAmountGbp(
  raw: Record<string, unknown>,
  currency: CurrencyCode,
  originalAmount: number,
  exchangeRate: number
): number {
  if (raw.amount_gbp != null) return roundMoney(Number(raw.amount_gbp));
  return calculateGbpEquivalent(originalAmount, currency, exchangeRate);
}

export function getGbpAmount(t: Transaction): number {
  return t.amount_gbp ?? t.amount;
}

export function getTransactionNotes(t: Transaction): string | null {
  return t.notes ?? t.description ?? null;
}

export function buildTransactionFields(input: {
  type: Transaction["type"];
  category: string;
  date: string;
  currency: CurrencyCode;
  original_amount: number;
  exchange_rate: number;
  gig_client: string | null;
  notes: string | null;
  performance_date?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  payment_status?: PaymentStatus | null;
  created_by: string;
  created_at?: string;
  receipts?: Receipt[];
}) {
  const originalAmount =
    input.currency === "JPY"
      ? roundJpy(input.original_amount)
      : roundMoney(input.original_amount);
  const exchangeRate = input.currency === "GBP" ? 1 : input.exchange_rate;
  const amountGbp = calculateGbpEquivalent(
    originalAmount,
    input.currency,
    exchangeRate
  );

  const base = {
    type: input.type,
    category: input.category,
    currency: input.currency,
    original_amount: originalAmount,
    exchange_rate: exchangeRate,
    amount_gbp: amountGbp,
    amount: amountGbp,
    date: input.date,
    gig_client: input.gig_client,
    notes: input.notes,
    created_by: input.created_by,
    created_at: input.created_at ?? new Date().toISOString(),
    receipts: input.receipts ?? [],
  };

  if (input.type === "income") {
    return {
      ...base,
      performance_date: input.performance_date ?? input.date,
      invoice_date: input.invoice_date ?? null,
      due_date: input.due_date ?? null,
      paid_date: input.paid_date ?? null,
      payment_status: input.payment_status ?? "Pending",
    };
  }

  return {
    ...base,
    performance_date: null,
    invoice_date: null,
    due_date: null,
    paid_date: null,
    payment_status: null,
  };
}
