'use client';

// Standalone button so the payslip detail page (a Server Component) can still offer a
// client-side window.print() without becoming a Client Component itself.
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded border px-3 py-1 text-sm print:hidden">
      Print / Save as PDF
    </button>
  );
}
