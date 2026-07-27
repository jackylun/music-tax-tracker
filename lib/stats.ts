import { readDb } from "./db";
import { isReceivedIncome, sumIncomeByStatus } from "./income";
import {
  getAvailableTaxYears,
  getCurrentUkTaxYear,
  getUkTaxYearEnd,
  getUkTaxYearStart,
  isDateInTaxYear,
} from "./tax-year";
import { normalizeTransaction, getGbpAmount } from "./transactions";
import type {
  DashboardStats,
  IncomeDashboardBreakdown,
  MonthlySummary,
  ReportData,
  TaxYearSummary,
  Transaction,
} from "./types";

async function getAllTransactions(): Promise<Transaction[]> {
  const db = await readDb();
  return db.transactions.map((t) => normalizeTransaction(t));
}

function sortByDateDesc(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.id - a.id;
  });
}

export async function getTransactions(taxYear?: string): Promise<Transaction[]> {
  let transactions = await getAllTransactions();

  if (taxYear) {
    transactions = transactions.filter((t) => isDateInTaxYear(t.date, taxYear));
  }

  return sortByDateDesc(transactions);
}

export async function getIncomeTransactions(
  taxYear?: string
): Promise<Transaction[]> {
  return (await getTransactions(taxYear)).filter((t) => t.type === "income");
}

export async function getTransactionById(
  id: number
): Promise<Transaction | undefined> {
  return (await getAllTransactions()).find((t) => t.id === id);
}

export async function getAvailableYears(): Promise<string[]> {
  const db = await readDb();
  const dates = db.transactions.map((t) => t.date as string);
  return getAvailableTaxYears(dates);
}

function sumReceivedIncome(transactions: Transaction[]) {
  return transactions
    .filter(isReceivedIncome)
    .reduce((sum, t) => sum + getGbpAmount(t), 0);
}

function sumExpenses(transactions: Transaction[]) {
  return transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + getGbpAmount(t), 0);
}

function categoryTotalsReceivedIncome(
  transactions: Transaction[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (!isReceivedIncome(t)) continue;
    totals[t.category] = (totals[t.category] || 0) + getGbpAmount(t);
  }
  return totals;
}

function categoryTotalsExpenses(
  transactions: Transaction[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    totals[t.category] = (totals[t.category] || 0) + getGbpAmount(t);
  }
  return totals;
}

function toIncomeBreakdown(
  transactions: Transaction[]
): IncomeDashboardBreakdown {
  const b = sumIncomeByStatus(transactions);
  return {
    totalPaidIncome: b.paid.amountGbp,
    totalPendingIncome: b.pending.amountGbp,
    totalInvoicedIncome: b.invoiced.amountGbp,
    totalOverdueIncome: b.overdue.amountGbp,
    totalCancelledIncome: b.cancelled.amountGbp,
    paidCount: b.paid.count,
    pendingCount: b.pending.count,
    invoicedCount: b.invoiced.count,
    overdueCount: b.overdue.count,
    cancelledCount: b.cancelled.count,
  };
}

export async function getTaxYearSummary(
  taxYear: string
): Promise<TaxYearSummary> {
  const transactions = await getTransactions(taxYear);
  const totalIncome = sumReceivedIncome(transactions);
  const totalExpenses = sumExpenses(transactions);

  return {
    taxYear,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    incomeByCategory: categoryTotalsReceivedIncome(transactions),
    expensesByCategory: categoryTotalsExpenses(transactions),
    transactionCount: transactions.length,
  };
}

function isCurrentMonth(dateStr: string): boolean {
  const now = new Date();
  const d = new Date(dateStr + "T12:00:00");
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
}

function isYtd(dateStr: string, taxYear: string): boolean {
  if (!isDateInTaxYear(dateStr, taxYear)) return false;
  const today = new Date().toISOString().slice(0, 10);
  const taxYearEnd = getUkTaxYearEnd(taxYear);
  const effectiveEnd = today < taxYearEnd ? today : taxYearEnd;
  const taxYearStart = getUkTaxYearStart(taxYear);
  return dateStr >= taxYearStart && dateStr <= effectiveEnd;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const taxYear = getCurrentUkTaxYear();
  const all = await getAllTransactions();

  const ytd = all.filter((t) => isYtd(t.date, taxYear));
  const thisMonth = all.filter((t) => isCurrentMonth(t.date));
  const ytdIncome = sumReceivedIncome(ytd);
  const ytdExpenses = sumExpenses(ytd);

  return {
    taxYear,
    ytdIncome,
    ytdExpenses,
    netProfit: ytdIncome - ytdExpenses,
    monthIncome: sumReceivedIncome(thisMonth),
    monthExpenses: sumExpenses(thisMonth),
    incomeBreakdown: toIncomeBreakdown(
      ytd.filter((t) => t.type === "income")
    ),
    recentTransactions: sortByDateDesc(all).slice(0, 8),
  };
}

export async function getMonthlySummaries(
  taxYear: string
): Promise<MonthlySummary[]> {
  const transactions = await getTransactions(taxYear);
  const startYear = parseInt(taxYear.split("/")[0], 10);

  const months: MonthlySummary[] = [];
  for (let i = 0; i < 12; i++) {
    const monthIndex = (3 + i) % 12;
    const year = monthIndex >= 3 ? startYear : startYear + 1;
    const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
    const label = new Date(year, monthIndex, 1).toLocaleDateString("en-GB", {
      month: "short",
      year: "numeric",
    });

    const monthTx = transactions.filter((t) => t.date.startsWith(monthKey));
    const income = sumReceivedIncome(monthTx);
    const expenses = sumExpenses(monthTx);

    months.push({
      month: monthKey,
      label,
      income,
      expenses,
      net: income - expenses,
    });
  }

  return months;
}

export async function getReportData(taxYear: string): Promise<ReportData> {
  return {
    taxYear,
    summary: await getTaxYearSummary(taxYear),
    monthly: await getMonthlySummaries(taxYear),
  };
}

export async function getIncomePageStats(taxYear: string) {
  const income = await getIncomeTransactions(taxYear);
  const breakdown = sumIncomeByStatus(income);
  return { transactions: income, breakdown };
}
