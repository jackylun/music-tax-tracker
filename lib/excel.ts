import ExcelJS from "exceljs";
import type { ReportData, Transaction } from "./types";
import { getEffectivePaymentStatus, getPerformanceDate } from "./income";
import { getGbpAmount, getTransactionNotes } from "./transactions";
const MONEY_FMT = '"£"#,##0.00';

async function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };
}

export async function transactionsToExcel(
  transactions: Transaction[],
  taxYear: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Music Tax Tracker";

  const sheet = wb.addWorksheet("Transactions");
  sheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Performance Date", key: "performance_date", width: 16 },
    { header: "Type", key: "type", width: 10 },
    { header: "Category", key: "category", width: 22 },
    { header: "Currency", key: "currency", width: 10 },
    { header: "Original Amount", key: "original_amount", width: 16 },
    { header: "Exchange Rate", key: "exchange_rate", width: 14 },
    { header: "GBP Equivalent", key: "amount_gbp", width: 16 },
    { header: "Gig / Client", key: "gig_client", width: 24 },
    { header: "Payment Status", key: "payment_status", width: 14 },
    { header: "Invoice Date", key: "invoice_date", width: 14 },
    { header: "Due Date", key: "due_date", width: 14 },
    { header: "Paid Date", key: "paid_date", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Receipts", key: "receipts", width: 10 },
    { header: "Created By", key: "created_by", width: 14 },
  ];

  await styleHeader(sheet.getRow(1));

  for (const t of transactions) {
    sheet.addRow({
      date: t.date,
      performance_date: t.type === "income" ? getPerformanceDate(t) : "",
      type: t.type,
      category: t.category,
      currency: t.currency,
      original_amount: t.original_amount,
      exchange_rate: t.exchange_rate,
      amount_gbp: getGbpAmount(t),
      gig_client: t.gig_client ?? "",
      payment_status: t.type === "income" ? getEffectivePaymentStatus(t) : "",
      invoice_date: t.invoice_date ?? "",
      due_date: t.due_date ?? "",
      paid_date: t.paid_date ?? "",
      notes: getTransactionNotes(t) ?? "",
      receipts: t.receipts?.length ?? 0,
      created_by: t.created_by,
    });
  }

  sheet.getColumn("amount_gbp").numFmt = MONEY_FMT;

  const info = wb.addWorksheet("Info");
  info.addRow(["Tax Year", taxYear]);
  info.addRow(["Exported", new Date().toISOString()]);
  info.getColumn(1).width = 16;
  info.getColumn(2).width = 30;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function reportToExcel(report: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Music Tax Tracker";

  const summary = wb.addWorksheet("Tax Year Summary");
  summary.addRow(["UK Tax Year", report.taxYear]);
  summary.addRow([]);
  summary.addRow(["Total Income (£)", report.summary.totalIncome]);
  summary.addRow(["Total Expenses (£)", report.summary.totalExpenses]);
  summary.addRow(["Net Profit (£)", report.summary.netProfit]);
  summary.getColumn(1).width = 22;
  summary.getColumn(2).width = 16;
  summary.getRow(3).getCell(2).numFmt = MONEY_FMT;
  summary.getRow(4).getCell(2).numFmt = MONEY_FMT;
  summary.getRow(5).getCell(2).numFmt = MONEY_FMT;

  const income = wb.addWorksheet("Income by Category");
  income.addRow(["Category", "Amount (£)"]);
  await styleHeader(income.getRow(1));
  for (const [cat, amount] of Object.entries(report.summary.incomeByCategory).sort()) {
    income.addRow([cat, amount]);
  }
  income.getColumn(1).width = 24;
  income.getColumn(2).width = 14;
  income.getColumn(2).numFmt = MONEY_FMT;

  const expenses = wb.addWorksheet("Expenses by Category");
  expenses.addRow(["Category", "Amount (£)"]);
  await styleHeader(expenses.getRow(1));
  for (const [cat, amount] of Object.entries(report.summary.expensesByCategory).sort()) {
    expenses.addRow([cat, amount]);
  }
  expenses.getColumn(1).width = 24;
  expenses.getColumn(2).width = 14;
  expenses.getColumn(2).numFmt = MONEY_FMT;

  const monthly = wb.addWorksheet("Monthly Summary");
  monthly.addRow(["Month", "Income (£)", "Expenses (£)", "Net (£)"]);
  await styleHeader(monthly.getRow(1));
  for (const m of report.monthly) {
    monthly.addRow([m.label, m.income, m.expenses, m.net]);
  }
  monthly.getColumn(1).width = 16;
  monthly.getColumn(2).numFmt = MONEY_FMT;
  monthly.getColumn(3).numFmt = MONEY_FMT;
  monthly.getColumn(4).numFmt = MONEY_FMT;

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
