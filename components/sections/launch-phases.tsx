'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Rocket, Zap, TrendingUp, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const phases = [
  {
    key: 'phase1',
    icon: Rocket,
    status: 'upcoming',
  },
  {
    key: 'phase2',
    icon: Zap,
    status: 'upcoming',
  },
  {
    key: 'phase3',
    icon: TrendingUp,
    status: 'upcoming',
  },
] as const;

export function LaunchPhasesSection() {
  const t = useTranslations('phases');

  return (
    <section className="relative py-24">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-card/30 to-background" />

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

        {/* Timeline */}
        <div className="relative mt-16">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-gradient-to-b from-primary/50 via-primary/20 to-transparent lg:block" />

          <div className="grid gap-8 lg:grid-cols-3">
            {phases.map((phase, index) => {
              const points = t.raw(`${phase.key}Points`) as string[];

              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.15 * index }}
                >
                  <Card className="group relative h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50">
                    {/* Phase number indicator */}
                    <div className="absolute -right-4 -top-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-gold text-2xl font-bold text-primary-foreground opacity-20">
                      {index + 1}
                    </div>

                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-primary/10 p-3">
                          <phase.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">
                            {t(`${phase.key}Title`)}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="mt-1 bg-secondary/50 text-secondary-foreground"
                          >
                            {t(`${phase.key}Duration`)}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <p className="mb-4 text-muted-foreground">
                        {t(`${phase.key}Desc`)}
                      </p>

                      <ul className="space-y-2">
                        {points.map((point, pointIndex) => (
                          <li
                            key={pointIndex}
                            className="flex items-start gap-2 text-sm"
                          >
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span className="text-foreground/80">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
