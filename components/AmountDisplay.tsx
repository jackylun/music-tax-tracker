"use client";

import type { Transaction } from "@/lib/types";
import {
  formatGbpApprox,
  formatMoney,
  formatOriginalAmount,
  isForeignCurrency,
} from "@/lib/format";

export default function AmountDisplay({
  transaction: t,
  size = "md",
}: {
  transaction: Transaction;
  size?: "sm" | "md" | "lg";
}) {
  const sign = t.type === "income" ? "+" : "−";
  const color = t.type === "income" ? "text-emerald-700" : "text-rose-700";
  const mainSize =
    size === "lg" ? "text-xl font-bold" : size === "sm" ? "text-sm font-semibold" : "text-lg font-bold";

  if (!isForeignCurrency(t)) {
    return (
      <p className={`shrink-0 ${mainSize} ${color}`}>
        {sign}
        {formatMoney(t.amount_gbp)}
      </p>
    );
  }

  return (
    <div className={`shrink-0 text-right ${color}`}>
      <p className={mainSize}>
        {sign}
        {formatOriginalAmount(t)}
      </p>
      <p className="text-sm font-medium text-slate-500">
        ≈ {formatGbpApprox(t)}
      </p>
    </div>
  );
}
