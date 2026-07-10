'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Shield, Eye, TrendingUp, Lightbulb, Scale, Lock, Gift, Clock, AlertTriangle } from 'lucide-react';

export function QuickIntroSection() {
  const t = useTranslations('quickIntro');
  const tNot = useTranslations('whatIsNot');
  const tIs = useTranslations('whatIs');
  const tPhil = useTranslations('philosophy');
  const tStaking = useTranslations('stakingUtility');

  const introPoints = [
    t('point1'),
    t('point2'),
    t('point3'),
    t('point4'),
    t('point5'),
  ];

  const notPoints = [
    tNot('point1'),
    tNot('point2'),
    tNot('point3'),
    tNot('point4'),
    tNot('point5'),
    tNot('point6'),
  ];

  const isPoints = [
    tIs('point1'),
    tIs('point2'),
    tIs('point3'),
    tIs('point4'),
    tIs('point5'),
  ];

  const philCards = [
    { title: tPhil('card1Title'), desc: tPhil('card1Desc'), icon: Shield },
    { title: tPhil('card2Title'), desc: tPhil('card2Desc'), icon: Eye },
    { title: tPhil('card3Title'), desc: tPhil('card3Desc'), icon: TrendingUp },
  ];

  const stakingCards = [
    { title: tStaking('card1Title'), desc: tStaking('card1Desc'), icon: Lock },
    { title: tStaking('card2Title'), desc: tStaking('card2Desc'), icon: Gift },
    { title: tStaking('card3Title'), desc: tStaking('card3Desc'), icon: Clock },
  ];

  return (
    <section className="relative py-20">
      <div className="absolute inset-0 stars-bg opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Philosophy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="mb-6 text-center font-serif text-3xl font-bold text-gradient-gold md:text-4xl">
            {tPhil('title')}
          </h2>
          <p className="mx-auto mb-4 max-w-3xl text-center text-lg text-muted-foreground">
            {tPhil('intro')}
          </p>
          <p className="mx-auto mb-12 max-w-3xl text-center text-muted-foreground">
            {tPhil('marketDecides')}
          </p>

          {/* Philosophy Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {philCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-primary/20 bg-card/50 backdrop-blur text-center">
                  <CardContent className="p-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <card.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* What it solves & What sustainable means */}
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-primary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{tPhil('whatItSolves')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{tPhil('whatItSolvesDesc')}</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-secondary/20 bg-card/50 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Scale className="h-5 w-5 text-secondary" />
                  <h3 className="font-semibold text-foreground">{tPhil('sustainableTitle')}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{tPhil('sustainableDesc')}</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Staking Utility Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="mb-6 text-center font-serif text-3xl font-bold text-gradient-gold md:text-4xl">
            {tStaking('title')}
          </h2>
          <p className="mx-auto mb-4 max-w-3xl text-center text-lg text-muted-foreground">
            {tStaking('intro')}
          </p>
          <p className="mx-auto mb-4 max-w-3xl text-center text-muted-foreground">
            {tStaking('description')}
          </p>
          <p className="mx-auto mb-12 max-w-3xl text-center text-muted-foreground">
            {tStaking('rewardsExplanation')}
          </p>

          {/* Staking Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            {stakingCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full border-secondary/20 bg-card/50 backdrop-blur text-center">
                  <CardContent className="p-6">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
                      <card.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <h3 className="mb-2 font-semibold text-foreground">{card.title}</h3>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Staking Warning */}
          <div className="flex items-start gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 p-4 max-w-3xl mx-auto">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
            <p className="text-sm text-muted-foreground">{tStaking('warning')}</p>
          </div>
        </motion.div>

        {/* 60 Seconds */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h3 className="mb-6 font-serif text-2xl font-bold text-gradient-gold text-center">
                {t('title')}
              </h3>
              <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {introPoints.map((point, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1 shrink-0">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        {/* What IS / What is NOT */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* What Soleon IS */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-green-500/20 bg-green-500/5 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="mb-6 font-serif text-2xl font-bold text-green-500">
                  {tIs('title')}
                </h3>
                <ul className="space-y-3">
                  {isPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-green-500/10 p-1">
                        <Check className="h-4 w-4 text-green-500" />
                      </div>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          {/* What Soleon is NOT */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Card className="h-full border-red-500/20 bg-red-500/5 backdrop-blur">
              <CardContent className="p-6">
                <h3 className="mb-6 font-serif text-2xl font-bold text-red-500">
                  {tNot('title')}
                </h3>
                <ul className="space-y-3">
                  {notPoints.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="mt-0.5 rounded-full bg-red-500/10 p-1">
                        <X className="h-4 w-4 text-red-500" />
                      </div>
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
