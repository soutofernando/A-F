import type { Metadata, Viewport } from 'next';
import './festa.css';

export const metadata: Metadata = {
  title: 'Desafios da festa · Alicia & Fernando',
  description: 'Fotos da festa. Cada desafio vale 1 ponto, e a galeria é de todo mundo.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F8F5EE',
};

export default function FestaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
