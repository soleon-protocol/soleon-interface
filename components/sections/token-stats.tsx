'use client';

import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Coins, Wallet, Gift, Percent, TrendingUp } from 'lucide-react';

const stats = [
  {
    key: 'totalSupply',
    value: '444.444M',
    icon: Coins,
    tooltip: 'exact',
  },
  {
    key: 'rewardVault',
    value: '440M',
    icon: Wallet,
    tooltip: 'rewards',
  },
  {
    key: 'transferFee',
    value: '0-0.4%',
    icon: TrendingUp,
    tooltip: 'dynamicFee',
  },
  {
    key: 'maxApr',
    value: '100%',
    icon: Percent,
    tooltip: 'apr',
  },
] as const;

export function TokenStatsSection() {
  const t = useTranslations('stats');

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />

      {/* Decorative coin */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 0.1, scale: 1 }}
        viewport={{ once: true }}
        className="absolute -right-32 top-1/2 -translate-y-1/2"
      >
        <Image
          src="/images/logo-token.png"
          alt=""
          width={500}
          height={500}
          className="h-auto w-96 opacity-20"
        />
      </motion.div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="group relative"
            >
              <div className="relative rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                {/* Glow effect */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-3xl font-bold text-gradient-gold sm:text-4xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {t(stat.key)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
