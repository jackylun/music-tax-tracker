"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/components/NavBar";
import IncomeList from "@/components/IncomeList";
import TaxYearFilter, { StatCard } from "@/components/TaxYearFilter";
import type { Transaction } from "@/lib/types";
import type { IncomeDashboardBreakdown } from "@/lib/income";

export default function IncomeClient({
  displayName,
  initialTaxYear,
  initialYears,
  initialTransactions,
  initialBreakdown,
}: {
  displayName: string;
  initialTaxYear: string;
  initialYears: string[];
  initialTransactions: Transaction[];
  initialBreakdown: IncomeDashboardBreakdown;
}) {
  const [taxYear, setTaxYear] = useState(initialTaxYear);
  const [years] = useState(initialYears);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [breakdown, setBreakdown] = useState(initialBreakdown);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (year: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/income?taxYear=${encodeURIComponent(year)}`);
      const data = await res.json();
      setTransactions(data.transactions);
      setBreakdown(data.breakdown);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(taxYear);
  }, [taxYear, load]);

  return (
    <div className="min-h-screen pb-20 lg:pb-8">
      <NavBar displayName={displayName} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title">Income</h1>
            <p className="page-subtitle">
              Track gigs, invoices and payments ·{" "}
              <Link href="/transactions" className="font-semibold text-brand-700">
                All records
              </Link>
            </p>
          </div>
          <TaxYearFilter years={years} selectedYear={taxYear} onChange={setTaxYear} />
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Paid Income" amount={breakdown.paid.amountGbp} variant="income" compact />
          <StatCard label="Pending" amount={breakdown.pending.amountGbp} variant="neutral" compact />
          <StatCard label="Invoiced" amount={breakdown.invoiced.amountGbp} variant="neutral" compact />
          <StatCard label="Overdue" amount={breakdown.overdue.amountGbp} variant="expense" compact />
          <StatCard label="Cancelled" amount={breakdown.cancelled.amountGbp} variant="neutral" compact />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card h-24 animate-pulse bg-slate-100" />
            ))}
          </div>
        ) : (
          <IncomeList
            transactions={transactions}
            taxYear={taxYear}
            onChanged={() => load(taxYear)}
          />
        )}
      </main>
    </div>
  );
}
