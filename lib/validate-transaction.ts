import {
  isValidExpenseCategory,
  isValidIncomeCategory,
} from "./categories";
import {
  isValidCurrency,
  roundJpy,
  roundMoney,
  type CurrencyCode,
} from "./currency";
import { isValidPaymentStatus } from "./income";
import {
  isValidBank,
  isValidPaymentMethod,
  type Bank,
  type PaymentMethod,
} from "./payment-method";
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Invalid date" };
  }

  const rateManualOverride = body.rate_manual_override === true;
  const gbpManualOverride = body.gbp_manual_override === true;

  if (currency !== "GBP" && !rateManualOverride && !gbpManualOverride) {
    // Server will auto-fetch; client may still send a preview rate.
  } else if (currency !== "GBP" && rateManualOverride) {
    const rate = parseFloat(String(body.exchange_rate ?? ""));
    if (isNaN(rate) || rate <= 0) {
      return { error: "Invalid exchange rate" };
    }
  } else if (currency !== "GBP" && gbpManualOverride) {
    const gbp = parseFloat(String(body.amount_gbp ?? ""));
    if (isNaN(gbp) || gbp <= 0) {
      return { error: "Invalid GBP amount" };
    }
  }

  let paymentStatus: PaymentStatus | null = null;
  let paymentMethod: PaymentMethod | null = null;
  let bank: Bank | null = null;

  if (txType === "income") {
    const ps = body.payment_status as string | undefined;
    if (ps && !isValidPaymentStatus(ps)) {
      return { error: "Invalid payment status" };
    }
    paymentStatus = (ps as PaymentStatus) ?? "Pending";

    const pm = body.payment_method as string | undefined;
    if (pm != null && pm !== "") {
      if (!isValidPaymentMethod(pm)) {
        return { error: "Invalid payment method" };
      }
      paymentMethod = pm;
    }

    if (paymentMethod === "Bank") {
      const bankValue = body.bank as string | undefined;
      if (!bankValue || !isValidBank(bankValue)) {
        return { error: "Bank is required when payment method is Bank" };
      }
      bank = bankValue;
    }
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
      date,
      performance_date: parseOptionalDate(body.performance_date) ?? date,
      invoice_date: invoiceDate,
      due_date: dueDate,
      paid_date: paidDate,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      bank,
      rate_manual_override: rateManualOverride,
      gbp_manual_override: gbpManualOverride,
      exchange_rate:
        body.exchange_rate != null ? Number(body.exchange_rate) : undefined,
      amount_gbp: body.amount_gbp != null ? Number(body.amount_gbp) : undefined,
    },
  };
}
