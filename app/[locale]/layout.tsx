import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/config';
import { SOLEON_CONFIG } from '@/lib/solana/config';
import { WalletProvider } from '@/components/providers/wallet-provider';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HtmlLang } from '@/components/html-lang';

interface LocaleLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  const deploymentKey = `${SOLEON_CONFIG.programId}:${SOLEON_CONFIG.soleonMint ?? 'no-mint'}:${SOLEON_CONFIG.configPda ?? 'no-config'}`;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <WalletProvider key={deploymentKey}>
        <HtmlLang locale={locale} />
        <div lang={locale} className="flex min-h-screen flex-col">
          <Header />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </div>
      </WalletProvider>
    </NextIntlClientProvider>
  );
}
