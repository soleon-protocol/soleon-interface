import { getTranslations } from 'next-intl/server';
import { MaintenanceContent } from './maintenance-content';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'maintenance' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function MaintenancePage() {
  return <MaintenanceContent />;
}
