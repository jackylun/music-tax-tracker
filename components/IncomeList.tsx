"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Transaction } from "@/lib/types";
import { formatDate, formatMoney } from "@/lib/format";
import {
  getEffectivePaymentStatus,
  getPerformanceDate,
  PAYMENT_STATUSES,
  sumIncomeByStatus,
} from "@/lib/income";
import { getGbpAmount, getTransactionNotes } from "@/lib/transactions";
import { INCOME_CATEGORIES } from "@/lib/categories";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import AmountDisplay from "./AmountDisplay";
import EditTransactionModal from "./EditTransactionModal";
import PaymentStatusBadge from "./PaymentStatusBadge";
import ReceiptViewer from "./ReceiptViewer";

type SortField =
  | "performance_date"
  | "due_date"
  | "amount"
  | "client"
  | "category"
  | "status";

export default function IncomeList({
  transactions,
  taxYear,
  onChanged,
}: {
  transactions: Transaction[];
  taxYear: string;
  onChanged: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paidFilter, setPaidFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("performance_date");
  const [sortAsc, setSortAsc] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    let result = [...transactions];

    if (statusFilter !== "all") {
      result = result.filter(
        (t) => getEffectivePaymentStatus(t) === statusFilter
      );
    }

    if (paidFilter === "paid") {
      result = result.filter(
        (t) => getEffectivePaymentStatus(t) === "Paid"
      );
    } else if (paidFilter === "unpaid") {
      result = result.filter((t) => {
        const s = getEffectivePaymentStatus(t);
        return s !== "Paid" && s !== "Cancelled";
      });
    }

    if (categoryFilter !== "all") {
      result = result.filter((t) => t.category === categoryFilter);
    }

    if (currencyFilter !== "all") {
      result = result.filter((t) => t.currency === currencyFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) => {
        const haystack = [
          t.gig_client,
          t.category,
          t.notes,
          t.payment_status,
          getEffectivePaymentStatus(t),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "performance_date":
          cmp = getPerformanceDate(a).localeCompare(getPerformanceDate(b));
          break;
        case "due_date":
          cmp = (a.due_date ?? "").localeCompare(b.due_date ?? "");
          break;
        case "amount":
          cmp = getGbpAmount(a) - getGbpAmount(b);
          break;
        case "client":
          cmp = (a.gig_client ?? "").localeCompare(b.gig_client ?? "");
          break;
        case "category":
          cmp = a.category.localeCompare(b.category);
          break;
        case "status":
          cmp = getEffectivePaymentStatus(a).localeCompare(
            getEffectivePaymentStatus(b)
          );
          break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [
    transactions,
    statusFilter,
    paidFilter,
    categoryFilter,
    currencyFilter,
    search,
    sortField,
    sortAsc,
  ]);

  const totals = useMemo(
    () => sumIncomeByStatus(filtered),
    [filtered]
  );

  async function handleDelete(id: number) {
    if (!confirm("Delete this income record?")) return;
    setDeletingId(id);
    try {
      await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
      onChanged();
    } finally {
      setDeletingId(null);
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-4xl">🎹</p>
        <p className="mt-3 font-semibold text-slate-700">
          No income for tax year {taxYear}
        </p>
        <Link href="/add" className="mt-4 inline-block text-sm font-semibold text-brand-700">
          Add income record
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card py-3">
            <p className="text-sm text-slate-600">Paid ({totals.paid.count})</p>
            <p className="text-xl font-bold text-emerald-700">
              {formatMoney(totals.paid.amountGbp)}
            </p>
          </div>
          <div className="card py-3">
            <p className="text-sm text-slate-600">Unpaid ({totals.unpaid.count})</p>
            <p className="text-xl font-bold text-amber-700">
              {formatMoney(totals.unpaid.amountGbp)}
            </p>
          </div>
          <div className="card border-rose-200 bg-rose-50/40 py-3">
            <p className="text-sm text-rose-700">Overdue ({totals.overdue.count})</p>
            <p className="text-xl font-bold text-rose-700">
              {formatMoney(totals.overdue.amountGbp)}
            </p>
          </div>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client, gig, category…"
          className="input-field"
        />

        <div className="flex flex-wrap gap-2">
          {(["all", "paid", "unpaid"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPaidFilter(f)}
              className={`rounded-full px-4 py-2 text-sm font-semibold capitalize ${
                paidFilter === f
                  ? "bg-brand-700 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">All statuses</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">All categories</option>
            {[...INCOME_CATEGORIES, ...categories.filter((c) => !(INCOME_CATEGORIES as readonly string[]).includes(c))].map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="input-field py-2"
          >
            <option value="all">All currencies</option>
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="input-field py-2"
          >
            <option value="performance_date">Sort: Performance date</option>
            <option value="due_date">Sort: Due date</option>
            <option value="amount">Sort: Amount</option>
            <option value="client">Sort: Client</option>
            <option value="category">Sort: Category</option>
            <option value="status">Sort: Status</option>
          </select>
        </div>

        <button
          onClick={() => setSortAsc((v) => !v)}
          className="btn-secondary w-full sm:w-auto"
        >
          {sortAsc ? "Oldest / Lowest first" : "Newest / Highest first"}
        </button>

        <p className="text-sm text-slate-500">
          {filtered.length} of {transactions.length} income records
        </p>

        <div className="space-y-3">
          {filtered.map((t) => {
            const status = getEffectivePaymentStatus(t);
            const isOverdue = status === "Overdue";

            return (
              <div
                key={t.id}
                className={`card py-4 ${isOverdue ? "border-rose-300 bg-rose-50/30 ring-1 ring-rose-200" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <PaymentStatusBadge status={status} />
                      <span className="font-semibold text-slate-800">{t.category}</span>
                    </div>
                    {t.gig_client && (
                      <p className="mt-1 font-medium text-slate-700">{t.gig_client}</p>
                    )}
                    <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                      <p>Performance: {formatDate(getPerformanceDate(t))}</p>
                      {t.invoice_date && <p>Invoiced: {formatDate(t.invoice_date)}</p>}
                      {t.due_date && (
                        <p className={isOverdue ? "font-bold text-rose-700" : ""}>
                          Due: {formatDate(t.due_date)}
                        </p>
                      )}
                      {t.paid_date && <p>Paid: {formatDate(t.paid_date)}</p>}
                    </div>
                    {getTransactionNotes(t) && (
                      <p className="mt-1 text-sm text-slate-500">{getTransactionNotes(t)}</p>
                    )}
                    <ReceiptViewer
                      transactionId={t.id}
                      receipts={t.receipts ?? []}
                      onChanged={onChanged}
                    />
                  </div>
                  <AmountDisplay transaction={t} size="lg" />
                </div>
                <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setEditing(t)}
                    className="text-sm font-semibold text-brand-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    disabled={deletingId === t.id}
                    className="text-sm font-semibold text-rose-600"
                  >
                    {deletingId === t.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-slate-500">No records match your filters.</p>
        )}
      </div>

      {editing && (
        <EditTransactionModal
          transaction={editing}
          onClose={() => setEditing(null)}
          onSaved={onChanged}
        />
      )}
    </>
  );
}
