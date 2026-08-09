
"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

type VoucherCodePanelProps = {
  code: string;
};

export function VoucherCodePanel({
  code,
}: VoucherCodePanelProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function copyCode() {
    setError("");

    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError("Không thể sao chép tự động. Hãy chọn và sao chép mã.");
    }
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
        Mã voucher riêng của bạn
      </p>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 select-all break-all rounded-xl bg-white px-4 py-3 text-center text-lg font-black tracking-[0.12em] text-emerald-950 sm:text-left">
          {code}
        </code>

        <button
          type="button"
          onClick={() => {
            void copyCode();
          }}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? "Đã sao chép" : "Sao chép mã"}
        </button>
      </div>

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-xs leading-5 text-emerald-800">
          Không chia sẻ mã nếu bạn chưa muốn sử dụng voucher.
        </p>
      )}
    </div>
  );
}
