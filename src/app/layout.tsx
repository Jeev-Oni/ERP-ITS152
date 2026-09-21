import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JJPG Trading — ERP',
  description: 'Phase 1 ERP: Salary Distribution, Warehouse Recording, Trucking Logistics, Storage Location',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
