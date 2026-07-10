'use client';

import { useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, FileText, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CountdownTimer } from '@/components/countdown-timer';
import { SOLEON_CONFIG } from '@/lib/solana/config';

const PUBLIC_REVIEW_START_DATE = new Date(SOLEON_CONFIG.genesisLaunchDate);

export function HeroSection() {
  const t = useTranslations('hero');
  const locale = useLocale();
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  return (
    <section
      ref={ref}
      className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-black"
    >
      {/* Background - pure black center fading to theme background at edges */}
      <div className="absolute inset-0 bg-gradient-radial from-black via-black to-background" />
      
      {/* Subtle star effects only at the edges */}
      <div className="absolute inset-0 stars-bg opacity-30" />

      <motion.div
        style={{ y, opacity }}
        className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6 lg:px-8"
      >
        {/* Logo - no glow effects to keep clean integration with black bg */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-4"
        >
          <Image
            src="/images/logo-principal.png"
            alt="Soleon Logo"
            width={500}
            height={500}
            className="relative h-auto w-72 sm:w-96 md:w-[28rem] lg:w-[32rem]"
            priority
          />
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl"
        >
          {t('subtitle')}
        </motion.p>

        {/* Countdown to public review */}
        {new Date() < PUBLIC_REVIEW_START_DATE && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="mt-8 rounded-xl border border-primary/20 bg-black/50 p-6 backdrop-blur"
          >
            <div className="mb-4 flex items-center justify-center gap-2 text-primary">
              <FlaskConical className="h-5 w-5" />
              <span className="font-semibold">{t('countdownTitle')}</span>
            </div>
            <CountdownTimer targetDate={PUBLIC_REVIEW_START_DATE} />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('countdownDesc')}
            </p>
          </motion.div>
        )}

        {/* CTA Buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold glow-gold-sm px-8"
          >
            <Link href={getLocalizedHref('/docs')}>
              {t('cta')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <Link href={getLocalizedHref('/whitepaper')}>
              <FileText className="mr-2 h-5 w-5" />
              {t('ctaSecondary')}
            </Link>
          </Button>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="h-10 w-6 rounded-full border-2 border-primary/30 p-1"
          >
            <div className="h-2 w-1.5 rounded-full bg-primary/50 mx-auto" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
