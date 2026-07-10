'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CTASection() {
  const t = useTranslations('cta');
  const locale = useLocale();

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  return (
    <section className="relative overflow-hidden py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />

      {/* Decorative elements */}
      <div className="absolute left-1/4 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute right-1/4 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-secondary/10 blur-3xl" />

      {/* Token image - left */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        whileInView={{ opacity: 0.3, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="absolute -left-20 top-1/2 hidden -translate-y-1/2 lg:block"
      >
        <Image
          src="/images/logo-token.png"
          alt=""
          width={300}
          height={300}
          className="h-auto w-48 opacity-50"
        />
      </motion.div>

      {/* Token image - right */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        whileInView={{ opacity: 0.3, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="absolute -right-20 top-1/2 hidden -translate-y-1/2 lg:block"
      >
        <Image
          src="/images/logo-token.png"
          alt=""
          width={300}
          height={300}
          className="h-auto w-48 opacity-50 scale-x-[-1]"
        />
      </motion.div>

      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-3xl font-bold text-gradient-gold sm:text-4xl md:text-5xl">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            {t('subtitle')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap"
        >
          <Button
            asChild
            size="lg"
            className="bg-gradient-gold hover:opacity-90 text-primary-foreground"
          >
            <Link href={getLocalizedHref('/genesis')}>
              {t('exploreGenesis')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-primary/50 text-primary hover:bg-primary/10"
          >
            <Link href={getLocalizedHref('/markets')}>
              {t('viewMarkets')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-secondary/50 text-secondary hover:bg-secondary/10"
          >
            <Link href={getLocalizedHref('/whitepaper')}>
              {t('learnMore')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </motion.div>

        {/* Decorative line */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mx-auto mt-16 h-px w-full max-w-md bg-gradient-to-r from-transparent via-primary/50 to-transparent"
        />
      </div>
    </section>
  );
}
