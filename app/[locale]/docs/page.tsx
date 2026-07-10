import { setRequestLocale } from 'next-intl/server';
import { getTranslations } from 'next-intl/server';
import { DocsContent } from './docs-content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'docs' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function DocsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DocsContent />;
}
