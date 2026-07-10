import { getTranslations } from 'next-intl/server';
import { MarketsContent } from './markets-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'markets' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function MarketsPage() {
  return <MarketsContent />;
}
