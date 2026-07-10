import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { WhitepaperContent } from './whitepaper-content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'whitepaper' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function WhitepaperPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <WhitepaperContent />;
}
