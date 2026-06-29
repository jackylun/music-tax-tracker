import type { CurrencyCode } from "./currency";

export type TransactionType = "income" | "expense";

export type PaymentStatus =
  | "Pending"
  | "Invoiced"
  | "Paid"
  | "Overdue"
  | "Cancelled";

export interface Receipt {
  id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  uploaded_at: string;
  uploaded_by: string;
}

export interface Transaction {
  id: number;
  type: TransactionType;
  category: string;
  /** GBP equivalent — used for received-income totals and reports */
  amount_gbp: number;
  /** @deprecated alias for amount_gbp */
  amount: number;
  currency: CurrencyCode;
  original_amount: number;
  exchange_rate: number;
  /** Performance / work date (income) or transaction date (expense) */
  date: string;
  performance_date: string | null;
  gig_client: string | null;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  payment_status: PaymentStatus | null;
  notes: string | null;
  /** @deprecated use notes */
  description?: string | null;
  created_by: string;
  created_at: string;
  receipts: Receipt[];
  /** @deprecated use receipts */
  receipt_ids?: string[];
}

export interface User {
  id: number;
  username: string;
  display_name: string;
}

export interface IncomeDashboardBreakdown {
  totalPaidIncome: number;
  totalPendingIncome: number;
  totalInvoicedIncome: number;
  totalOverdueIncome: number;
  totalCancelledIncome: number;
  paidCount: number;
  pendingCount: number;
  invoicedCount: number;
  overdueCount: number;
  cancelledCount: number;
}

export interface DashboardStats {
  taxYear: string;
  ytdIncome: number;
  ytdExpenses: number;
  netProfit: number;
  monthIncome: number;
  monthExpenses: number;
  incomeBreakdown: IncomeDashboardBreakdown;
  recentTransactions: Transaction[];
}

export interface TaxYearSummary {
  taxYear: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  incomeByCategory: Record<string, number>;
  expensesByCategory: Record<string, number>;
  transactionCount: number;
}

export interface MonthlySummary {
  month: string;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export interface ReportData {
  taxYear: string;
  summary: TaxYearSummary;
  monthly: MonthlySummary[];
}
