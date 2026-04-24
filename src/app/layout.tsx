import type { Metadata } from 'next';
import { Cormorant_Garamond, Italiana, Inter, JetBrains_Mono } from 'next/font/google';
import { Shell } from '@/components/Shell';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

const italiana = Italiana({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-italiana',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Alicia & Fernando · 28.11.2026',
  description: 'Pelos olhares que não desviaram, até virarem destino.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${italiana.variable} ${inter.variable} ${jetbrains.variable}`}>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
