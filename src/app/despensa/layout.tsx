import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lista de compras · Alicia & Fernando',
  robots: { index: false, follow: false },
};

export default function DespensaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
