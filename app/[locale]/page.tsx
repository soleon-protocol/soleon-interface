import { setRequestLocale } from 'next-intl/server';
import { HeroSection } from '@/components/sections/hero';
import { AboutSection } from '@/components/sections/about';
import { QuickIntroSection } from '@/components/sections/quick-intro';
import { TokenStatsSection } from '@/components/sections/token-stats';
import { LaunchPhasesSection } from '@/components/sections/launch-phases';
import { EcosystemSection } from '@/components/sections/ecosystem';
import { CTASection } from '@/components/sections/cta';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HeroSection />
      <AboutSection />
      <QuickIntroSection />
      <TokenStatsSection />
      <LaunchPhasesSection />
      <EcosystemSection />
      <CTASection />
    </>
  );
}
