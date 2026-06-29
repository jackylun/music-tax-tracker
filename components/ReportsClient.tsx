"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportData } from "@/lib/types";
import { formatMoney } from "@/lib/format";
import TaxYearFilter, { StatCard } from "./TaxYearFilter";

export default function ReportsClient({
  initialTaxYear,
  initialYears,
}: {
  initialTaxYear: string;
  initialYears: string[];
}) {
  const [taxYear, setTaxYear] = useState(initialTaxYear);
  const [years] = useState(initialYears);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (year: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?taxYear=${encodeURIComponent(year)}`);
      setReport(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(taxYear);
  }, [taxYear, load]);

  function exportFile(type: "csv" | "excel", format: "report" | "transactions") {
    window.location.href = `/api/export/${type}?taxYear=${encodeURIComponent(taxYear)}&format=${format}`;
  }

  const summary = report?.summary;
  const topIncome = summary
    ? Object.entries(summary.incomeByCategory).sort((a, b) => b[1] - a[1])
    : [];
  const topExpenses = summary
    ? Object.entries(summary.expensesByCategory).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">UK tax year summaries for your accountant</p>
        </div>
        <TaxYearFilter years={years} selectedYear={taxYear} onChange={setTaxYear} />
      </div>

      {loading || !report || !summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total Income" amount={summary.totalIncome} variant="income" />
            <StatCard label="Total Expenses" amount={summary.totalExpenses} variant="expense" />
            <StatCard label="Net Profit" amount={summary.netProfit} variant="profit" />
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900">Tax Year Summary</h2>
            <p className="mt-1 text-sm text-slate-500">
              {summary.transactionCount} records · 6 Apr – 5 Apr
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryTable title="Income by Category" items={topIncome} />
            <CategoryTable title="Expenses by Category" items={topExpenses} />
          </div>

          <div className="card overflow-x-auto">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Monthly Summary</h2>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2 font-semibold">Month</th>
                  <th className="pb-2 font-semibold">Income</th>
                  <th className="pb-2 font-semibold">Expenses</th>
                  <th className="pb-2 font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {report.monthly.map((m) => (
                  <tr key={m.month} className="border-b border-slate-100">
                    <td className="py-2.5 font-medium">{m.label}</td>
                    <td className="py-2.5 text-emerald-700">{formatMoney(m.income)}</td>
                    <td className="py-2.5 text-rose-700">{formatMoney(m.expenses)}</td>
                    <td className="py-2.5 font-semibold">{formatMoney(m.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2 className="text-lg font-bold text-slate-900">Export</h2>
            <p className="mt-1 text-sm text-slate-500">
              Download reports for tax filing or your accountant.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => exportFile("csv", "report")} className="btn-secondary">
                Export CSV (Full Report)
              </button>
              <button onClick={() => exportFile("excel", "report")} className="btn-primary">
                Export Excel (Full Report)
              </button>
              <button onClick={() => exportFile("csv", "transactions")} className="btn-secondary">
                Export CSV (Transactions)
              </button>
              <button onClick={() => exportFile("excel", "transactions")} className="btn-secondary">
                Export Excel (Transactions)
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function CategoryTable({
  title,
  items,
}: {
  title: string;
  items: [string, number][];
}) {
  return (
    <div className="card">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">No data</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map(([cat, amount]) => (
            <li key={cat} className="flex justify-between text-sm">
              <span className="text-slate-700">{cat}</span>
              <span className="font-semibold">{formatMoney(amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
