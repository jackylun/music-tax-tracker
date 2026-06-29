"use client";

import type { Transaction } from "@/lib/types";
import TransactionForm from "./TransactionForm";

export default function EditTransactionModal({
  transaction,
  onClose,
  onSaved,
}: {
  transaction: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Edit Record</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
        <TransactionForm
          initial={transaction}
          onSuccess={() => {
            onSaved();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
