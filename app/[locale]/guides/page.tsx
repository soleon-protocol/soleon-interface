import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { GuidesContent } from './guides-content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'guides' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function GuidesPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <GuidesContent />;
}
