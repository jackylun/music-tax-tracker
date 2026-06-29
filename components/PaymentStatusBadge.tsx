"use client";

import type { PaymentStatus } from "@/lib/types";
import { getEffectivePaymentStatus } from "@/lib/income";

const STYLES: Record<
  PaymentStatus,
  string
> = {
  Paid: "bg-emerald-100 text-emerald-800",
  Pending: "bg-amber-100 text-amber-800",
  Invoiced: "bg-sky-100 text-sky-800",
  Overdue: "bg-rose-100 text-rose-800 ring-1 ring-rose-300",
  Cancelled: "bg-slate-100 text-slate-500 line-through",
};

export default function PaymentStatusBadge({
  status,
}: {
  status: PaymentStatus;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STYLES[status]}`}
    >
      {status}
    </span>
  );
}

export function PaymentStatusBadgeForTransaction({
  transaction,
}: {
  transaction: { type: string; payment_status: PaymentStatus | null; due_date: string | null };
}) {
  if (transaction.type !== "income") return null;
  const status = getEffectivePaymentStatus(
    transaction as Parameters<typeof getEffectivePaymentStatus>[0]
  );
  return <PaymentStatusBadge status={status} />;
}
