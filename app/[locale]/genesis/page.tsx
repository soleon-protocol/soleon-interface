import { getTranslations } from 'next-intl/server';
import { GenesisContent } from './genesis-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'genesis' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function GenesisPage() {
  return <GenesisContent />;
}
