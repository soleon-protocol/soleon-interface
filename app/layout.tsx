import type { Metadata } from 'next';
import { Inter, Playfair_Display, Geist_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://soleonprotocol.com'),
  title: {
    default: 'Soleon - Token con extensión 2022 en Solana',
    template: '%s | Soleon',
  },
  description:
    'Un token en Solana diseñado para la comunidad, con un sistema de lanzamiento innovador y tokenomics transparentes.',
  keywords: ['Soleon', 'Solana', 'Token', 'Crypto', 'DeFi', 'Staking', 'Blockchain'],
  authors: [{ name: 'Soleon' }],
  openGraph: {
    title: 'Soleon - Token con extensión 2022 en Solana',
    description:
      'Un token en Solana diseñado para la comunidad, con un sistema de lanzamiento innovador y tokenomics transparentes.',
    type: 'website',
    locale: 'es_ES',
    alternateLocale: 'en_US',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Soleon - Token con extensión 2022 en Solana',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soleon',
    description:
      'Un token en Solana diseñado para la comunidad, con tokenomics transparentes.',
    images: ['/images/og-image.png'],
  },
  icons: {
    icon: '/images/logo-symbol.png',
    apple: '/images/logo-symbol.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${playfair.variable} ${geistMono.variable} bg-background`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  );
}
