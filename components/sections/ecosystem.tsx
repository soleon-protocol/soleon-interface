'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Lock, Flame, ArrowLeftRight } from 'lucide-react';

const features = [
  {
    titleKey: 'stakingTitle',
    descKey: 'stakingDesc',
    icon: Lock,
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  {
    titleKey: 'renewalTitle',
    descKey: 'renewalDesc',
    icon: Flame,
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    titleKey: 'feeTitle',
    descKey: 'feeDesc',
    icon: ArrowLeftRight,
    gradient: 'from-gray-500/20 to-slate-500/20',
  },
] as const;

export function EcosystemSection() {
  const t = useTranslations('ecosystem');

  return (
    <section className="relative py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-serif text-3xl font-bold text-gradient-gold sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-2 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        {/* Features */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <motion.div
              key={feature.titleKey}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.15 * index }}
              className="group"
            >
              <div className="relative rounded-2xl border border-border/50 bg-card/30 p-8 backdrop-blur-sm transition-all hover:border-primary/50">
                {/* Gradient background */}
                <div
                  className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />

                <div className="relative">
                  {/* Icon */}
                  <div className="mb-6 inline-flex rounded-xl bg-primary/10 p-4">
                    <feature.icon className="h-8 w-8 text-primary" />
                  </div>

                  {/* Title */}
                  <h3 className="mb-3 text-2xl font-semibold text-foreground">
                    {t(feature.titleKey)}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground">
                    {t(feature.descKey)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
