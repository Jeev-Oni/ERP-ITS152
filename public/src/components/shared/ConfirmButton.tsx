'use client';

import { useState } from 'react';

type Result = { success?: boolean; error?: string } | void;

// Two-step button for destructive actions: first click asks, second click does it.
// Avoids window.confirm() and keeps the question right next to the row it's about.
export function ConfirmButton({
  label,
  confirmLabel = 'Confirm',
  onConfirm,
  onDone,
  onError,
  disabled,
  danger = true,
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => Promise<Result>;
  onDone?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const result = await onConfirm();
    setPending(false);
    setAsking(false);
    if (result && result.error) onError?.(result.error);
    else onDone?.();
  }

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        disabled={disabled}
        className={`rounded border px-2 py-0.5 text-xs disabled:opacity-40 ${
          danger ? 'border-red-400/30 text-red-300 hover:bg-red-400/10' : 'border-border hover:bg-surface-hover'
        }`}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs text-muted-foreground">Sure?</span>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded bg-red-500/80 px-2 py-0.5 text-xs text-white disabled:opacity-50"
      >
        {pending ? '…' : confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setAsking(false)}
        disabled={pending}
        className="rounded border border-border px-2 py-0.5 text-xs hover:bg-surface-hover"
      >
        No
      </button>
    </span>
  );
}
