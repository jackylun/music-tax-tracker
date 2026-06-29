import type { ReportData, Transaction } from "./types";
import { getEffectivePaymentStatus, getPerformanceDate } from "./income";
import { getGbpAmount, getTransactionNotes } from "./transactions";

function escapeCsv(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const headers = [
    "Date",
    "Performance Date",
    "Type",
    "Category",
    "Original Currency",
    "Original Amount",
    "Exchange Rate",
    "GBP Equivalent",
    "Gig / Client",
    "Payment Status",
    "Invoice Date",
    "Due Date",
    "Paid Date",
    "Notes",
    "Receipts",
    "Created By",
    "Created At",
  ];

  const rows = transactions.map((t) =>
    [
      t.date,
      t.type === "income" ? getPerformanceDate(t) : "",
      t.type,
      t.category,
      t.currency,
      t.original_amount.toFixed(t.currency === "JPY" ? 0 : 2),
      t.exchange_rate.toFixed(6),
      getGbpAmount(t).toFixed(2),
      t.gig_client ?? "",
      t.type === "income" ? getEffectivePaymentStatus(t) : "",
      t.invoice_date ?? "",
      t.due_date ?? "",
      t.paid_date ?? "",
      getTransactionNotes(t) ?? "",
      t.receipts?.length ?? 0,
      t.created_by,
      t.created_at,
    ]
      .map(escapeCsv)
      .join(",")
  );

  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
}

export function reportToCsv(report: ReportData): string {
  const { summary, monthly } = report;
  const lines: string[] = [
    `UK Tax Year,${summary.taxYear}`,
    "All totals in GBP",
    "",
    "Tax Year Summary",
    "Total Income (£)," + summary.totalIncome.toFixed(2),
    "Total Expenses (£)," + summary.totalExpenses.toFixed(2),
    "Net Profit (£)," + summary.netProfit.toFixed(2),
    "",
    "Income by Category (GBP)",
    "Category,Amount (£)",
  ];

  for (const [cat, amount] of Object.entries(summary.incomeByCategory).sort()) {
    lines.push(`${escapeCsv(cat)},${amount.toFixed(2)}`);
  }

  lines.push("", "Expenses by Category (GBP)", "Category,Amount (£)");

  for (const [cat, amount] of Object.entries(summary.expensesByCategory).sort()) {
    lines.push(`${escapeCsv(cat)},${amount.toFixed(2)}`);
  }

  lines.push("", "Monthly Summary (GBP)", "Month,Income (£),Expenses (£),Net (£)");

  for (const m of monthly) {
    lines.push(
      `${escapeCsv(m.label)},${m.income.toFixed(2)},${m.expenses.toFixed(2)},${m.net.toFixed(2)}`
    );
  }

  return "\uFEFF" + lines.join("\r\n");
}
