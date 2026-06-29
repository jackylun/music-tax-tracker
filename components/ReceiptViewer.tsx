"use client";

import { useState } from "react";
import type { Receipt } from "@/lib/types";

function receiptLabel(receipt: Receipt): string {
  if (receipt.mime_type === "application/pdf") return "PDF";
  return receipt.original_name.length > 20
    ? receipt.original_name.slice(0, 17) + "…"
    : receipt.original_name;
}

export default function ReceiptViewer({
  transactionId,
  receipts,
  onChanged,
}: {
  transactionId: number;
  receipts: Receipt[];
  onChanged?: () => void;
}) {
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  if (!receipts.length) return null;

  const viewUrl = (r: Receipt) =>
    `/api/transactions/${transactionId}/receipts/${r.id}`;

  async function handleDelete(receiptId: string) {
    if (!confirm("Delete this receipt?")) return;
    setDeleting(receiptId);
    try {
      await fetch(
        `/api/transactions/${transactionId}/receipts?receiptId=${receiptId}`,
        { method: "DELETE" }
      );
      if (viewing?.id === receiptId) setViewing(null);
      onChanged?.();
    } finally {
      setDeleting(null);
    }
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap gap-2">
        {receipts.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1"
          >
            <button
              type="button"
              onClick={() => setViewing(r)}
              className="text-xs font-semibold text-brand-700"
            >
              📎 {receiptLabel(r)}
            </button>
            {onChanged && (
              <button
                type="button"
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                className="text-xs text-slate-400 hover:text-rose-600"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {viewing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="truncate font-semibold text-slate-800">
                {viewing.original_name}
              </p>
              <div className="flex gap-2">
                <a
                  href={viewUrl(viewing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-brand-700"
                >
                  Open
                </a>
                <button
                  onClick={() => setViewing(null)}
                  className="text-sm text-slate-500"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="max-h-[calc(90vh-56px)] overflow-auto p-2">
              {viewing.mime_type === "application/pdf" ? (
                <iframe
                  src={viewUrl(viewing)}
                  className="h-[70vh] w-full rounded-lg"
                  title={viewing.original_name}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewUrl(viewing)}
                  alt={viewing.original_name}
                  className="mx-auto max-h-[70vh] rounded-lg object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
