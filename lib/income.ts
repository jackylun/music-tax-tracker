import type { PaymentStatus, Transaction } from "./types";
import { getGbpAmount } from "./transactions";

export const PAYMENT_STATUSES = [
  "Pending",
  "Invoiced",
  "Paid",
  "Overdue",
  "Cancelled",
] as const;

export function isValidPaymentStatus(s: string): s is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(s);
}

/** Resolve stored + auto-overdue from due date. */
export function getEffectivePaymentStatus(t: Transaction): PaymentStatus {
  if (t.type !== "income") return "Paid";

  const stored = t.payment_status ?? "Paid";
  if (stored === "Cancelled" || stored === "Paid" || stored === "Overdue") {
    return stored;
  }

  if ((stored === "Pending" || stored === "Invoiced") && t.due_date) {
    const today = new Date().toISOString().slice(0, 10);
    if (t.due_date < today) return "Overdue";
  }

  return stored;
}

export function isReceivedIncome(t: Transaction): boolean {
  return t.type === "income" && getEffectivePaymentStatus(t) === "Paid";
}

export function isUnpaidIncome(t: Transaction): boolean {
  if (t.type !== "income") return false;
  const s = getEffectivePaymentStatus(t);
  return s === "Pending" || s === "Invoiced" || s === "Overdue";
}

export interface IncomeStatusTotals {
  count: number;
  amountGbp: number;
}

export interface IncomeDashboardBreakdown {
  paid: IncomeStatusTotals;
  pending: IncomeStatusTotals;
  invoiced: IncomeStatusTotals;
  overdue: IncomeStatusTotals;
  cancelled: IncomeStatusTotals;
  unpaid: IncomeStatusTotals;
}

export function sumIncomeByStatus(
  transactions: Transaction[]
): IncomeDashboardBreakdown {
  const income = transactions.filter((t) => t.type === "income");
  const buckets: IncomeDashboardBreakdown = {
    paid: { count: 0, amountGbp: 0 },
    pending: { count: 0, amountGbp: 0 },
    invoiced: { count: 0, amountGbp: 0 },
    overdue: { count: 0, amountGbp: 0 },
    cancelled: { count: 0, amountGbp: 0 },
    unpaid: { count: 0, amountGbp: 0 },
  };

  for (const t of income) {
    const gbp = getGbpAmount(t);
    const status = getEffectivePaymentStatus(t);

    switch (status) {
      case "Paid":
        buckets.paid.count += 1;
        buckets.paid.amountGbp += gbp;
        break;
      case "Pending":
        buckets.pending.count += 1;
        buckets.pending.amountGbp += gbp;
        buckets.unpaid.count += 1;
        buckets.unpaid.amountGbp += gbp;
        break;
      case "Invoiced":
        buckets.invoiced.count += 1;
        buckets.invoiced.amountGbp += gbp;
        buckets.unpaid.count += 1;
        buckets.unpaid.amountGbp += gbp;
        break;
      case "Overdue":
        buckets.overdue.count += 1;
        buckets.overdue.amountGbp += gbp;
        buckets.unpaid.count += 1;
        buckets.unpaid.amountGbp += gbp;
        break;
      case "Cancelled":
        buckets.cancelled.count += 1;
        buckets.cancelled.amountGbp += gbp;
        break;
    }
  }

  for (const key of Object.keys(buckets) as (keyof IncomeDashboardBreakdown)[]) {
    buckets[key].amountGbp = Math.round(buckets[key].amountGbp * 100) / 100;
  }

  return buckets;
}

export function getPerformanceDate(t: Transaction): string {
  return t.performance_date ?? t.date;
}
