import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { RoadmapContent } from './roadmap-content';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'roadmap' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function RoadmapPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RoadmapContent />;
}
