"use client";

import { useRef, useState } from "react";
import type { Receipt } from "@/lib/types";

export default function ReceiptUpload({
  transactionId,
  receipts,
  onUploaded,
}: {
  transactionId: number;
  receipts: Receipt[];
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/transactions/${transactionId}/receipts`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        onChange={handleFile}
        className="hidden"
        id={`receipt-upload-${transactionId}`}
      />
      <label
        htmlFor={`receipt-upload-${transactionId}`}
        className={`btn-secondary w-full cursor-pointer ${uploading ? "opacity-50" : ""}`}
      >
        {uploading ? "Uploading…" : "Upload Receipt (JPG, PNG, PDF)"}
      </label>
      {receipts.length > 0 && (
        <p className="text-xs text-slate-500">
          {receipts.length} receipt{receipts.length !== 1 ? "s" : ""} attached
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}
    </div>
  );
}
