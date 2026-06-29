import {
  isValidExpenseCategory,
  isValidIncomeCategory,
} from "./categories";
import {
  calculateGbpEquivalent,
  isValidCurrency,
  roundJpy,
  roundMoney,
  type CurrencyCode,
} from "./currency";
import { isValidPaymentStatus } from "./income";
import type { PaymentStatus, TransactionType } from "./types";

function parseOptionalDate(value: unknown): string | null {
  if (value == null || value === "") return null;
  const s = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

export function validateTransactionInput(body: Record<string, unknown>) {
  const type = body.type as string | undefined;
  const category = body.category as string | undefined;
  const date =
    (body.date as string | undefined) ??
    (body.performance_date as string | undefined);
  const amountRaw = body.original_amount ?? body.amount;

  if (!type || !category || amountRaw == null || !date) {
    return { error: "Missing required fields" };
  }

  if (type !== "income" && type !== "expense") {
    return { error: "Invalid type" };
  }

  const txType = type as TransactionType;

  if (txType === "income" && !isValidIncomeCategory(category)) {
    return { error: "Invalid income category" };
  }

  if (txType === "expense" && !isValidExpenseCategory(category)) {
    return { error: "Invalid expense category" };
  }

  const currency: CurrencyCode =
    body.currency && isValidCurrency(body.currency as string)
      ? (body.currency as CurrencyCode)
      : "GBP";

  let originalAmount = parseFloat(String(amountRaw));
  if (isNaN(originalAmount) || originalAmount <= 0) {
    return { error: "Invalid amount" };
  }

  originalAmount =
    currency === "JPY" ? roundJpy(originalAmount) : roundMoney(originalAmount);

  let exchangeRate = 1;
  if (currency !== "GBP") {
    exchangeRate = parseFloat(String(body.exchange_rate ?? ""));
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      return { error: "Invalid exchange rate" };
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Invalid date" };
  }

  const amountGbp = calculateGbpEquivalent(
    originalAmount,
    currency,
    exchangeRate
  );

  let paymentStatus: PaymentStatus | null = null;
  if (txType === "income") {
    const ps = body.payment_status as string | undefined;
    if (ps && !isValidPaymentStatus(ps)) {
      return { error: "Invalid payment status" };
    }
    paymentStatus = (ps as PaymentStatus) ?? "Pending";
  }

  const invoiceDate = parseOptionalDate(body.invoice_date);
  const dueDate = parseOptionalDate(body.due_date);
  const paidDate = parseOptionalDate(body.paid_date);

  if (body.invoice_date && !invoiceDate) return { error: "Invalid invoice date" };
  if (body.due_date && !dueDate) return { error: "Invalid due date" };
  if (body.paid_date && !paidDate) return { error: "Invalid paid date" };

  return {
    data: {
      type: txType,
      category,
      currency,
      original_amount: originalAmount,
      exchange_rate: exchangeRate,
      amount_gbp: amountGbp,
      date,
      performance_date: parseOptionalDate(body.performance_date) ?? date,
      invoice_date: invoiceDate,
      due_date: dueDate,
      paid_date: paidDate,
      payment_status: paymentStatus,
    },
  };
}
