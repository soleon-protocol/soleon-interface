import { getTranslations } from 'next-intl/server';
import { StakingContent } from './staking-content';
import { SOLEON_CONFIG } from '@/lib/solana/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'staking' });

  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default function StakingPage() {
  const deploymentKey = `${SOLEON_CONFIG.programId}:${SOLEON_CONFIG.soleonMint ?? 'no-mint'}:${SOLEON_CONFIG.configPda ?? 'no-config'}`;
  return <StakingContent key={deploymentKey} />;
}
