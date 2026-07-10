import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { TokenomicsContent } from './tokenomics-content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tokenomics' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function TokenomicsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <TokenomicsContent />;
}
