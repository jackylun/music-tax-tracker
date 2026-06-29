"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { DashboardStats } from "@/lib/types";
import AmountDisplay from "./AmountDisplay";
import { formatDate } from "@/lib/format";
import { getEffectivePaymentStatus } from "@/lib/income";
import { getTransactionNotes } from "@/lib/transactions";
import PaymentStatusBadge from "./PaymentStatusBadge";
import { StatCard } from "./TaxYearFilter";

export default function DashboardClient() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !stats) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">
          UK Tax Year {stats.taxYear} · Year-to-date overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Year-to-Date Income (Paid)" amount={stats.ytdIncome} variant="income" />
        <StatCard label="Year-to-Date Expenses" amount={stats.ytdExpenses} variant="expense" />
        <StatCard label="Net Profit" amount={stats.netProfit} variant="profit" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Paid Income" amount={stats.incomeBreakdown.totalPaidIncome} variant="income" compact />
        <StatCard label="Pending" amount={stats.incomeBreakdown.totalPendingIncome} variant="neutral" compact />
        <StatCard label="Invoiced" amount={stats.incomeBreakdown.totalInvoicedIncome} variant="neutral" compact />
        <StatCard label="Overdue" amount={stats.incomeBreakdown.totalOverdueIncome} variant="expense" compact />
        <StatCard label="Cancelled" amount={stats.incomeBreakdown.totalCancelledIncome} variant="neutral" compact />
      </div>

      <p className="text-sm text-slate-500">
        <Link href="/income" className="font-semibold text-brand-700">
          View all income →
        </Link>
        {" · "}
        <Link href="/transactions?type=expense" className="font-semibold text-brand-700">
          View all expenses →
        </Link>
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="This Month Income (Paid)" amount={stats.monthIncome} variant="income" compact />
        <StatCard label="This Month Expenses" amount={stats.monthExpenses} variant="expense" compact />
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
          <Link href="/transactions" className="text-sm font-semibold text-brand-700">
            View all
          </Link>
        </div>

        {stats.recentTransactions.length === 0 ? (
          <p className="py-6 text-center text-slate-500">No records yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.recentTransactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">
                    {t.gig_client || t.category}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(t.date)} · {t.category}
                  </p>
                  {t.type === "income" && (
                    <div className="mt-1">
                      <PaymentStatusBadge status={getEffectivePaymentStatus(t)} />
                    </div>
                  )}
                  {getTransactionNotes(t) && (
                    <p className="truncate text-sm text-slate-400">
                      {getTransactionNotes(t)}
                    </p>
                  )}
                </div>
                <AmountDisplay transaction={t} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
