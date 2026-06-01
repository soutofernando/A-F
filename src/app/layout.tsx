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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://aliciaefernando.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Alicia & Fernando · 28.11.2026',
  description: 'Pelos olhares que não desviaram, até virarem destino.',
  applicationName: 'Alicia & Fernando',
  icons: {
    icon: '/AeF.png',
    shortcut: '/AeF.png',
    apple: '/AeF.png',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Alicia & Fernando',
    title: 'Alicia & Fernando · 28.11.2026',
    description: 'Pelos olhares que não desviaram, até virarem destino.',
    url: siteUrl,
    images: [
      {
        url: '/AeF.png',
        width: 648,
        height: 385,
        alt: 'Monograma Alicia & Fernando',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Alicia & Fernando · 28.11.2026',
    description: 'Pelos olhares que não desviaram, até virarem destino.',
    images: ['/AeF.png'],
  },
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
