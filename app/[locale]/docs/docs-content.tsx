'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';
import {
  FileText,
  BookOpen,
  Map,
  Terminal,
  Layers,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SOLEON_CONFIG } from '@/lib/solana/config';

const INTERFACE_REPOSITORY_URL = 'https://github.com/soleon-protocol/soleon-interface';

function getSolscanAccountUrl(address: string): string {
  const cluster = SOLEON_CONFIG.cluster === 'devnet' ? 'devnet' : 'mainnet';
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}

export function DocsContent() {
  const t = useTranslations('docs');
  const locale = useLocale();

  const getLocalizedHref = (href: string) => `/${locale}${href === '/' ? '' : href}`;

  const docSections = [
    {
      key: 'whitepaper',
      href: '/whitepaper',
      icon: FileText,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      key: 'guides',
      href: '/guides',
      icon: BookOpen,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      key: 'roadmap',
      href: '/roadmap',
      icon: Map,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      key: 'technical',
      href: '/docs#public-verification',
      icon: Terminal,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const publicVerificationItems = [
    {
      key: 'interfaceRepository',
      value: t('githubRepository'),
      href: INTERFACE_REPOSITORY_URL,
    },
    {
      key: 'stakingRepository',
      value: SOLEON_CONFIG.stakingRepositoryUrl ? t('githubRepository') : t('notAvailable'),
      href: SOLEON_CONFIG.stakingRepositoryUrl,
    },
    {
      key: 'commitmentClaimProgram',
      value: SOLEON_CONFIG.commitmentClaimProgramIdConfigured
        ? SOLEON_CONFIG.commitmentClaimProgramId
        : t('notAvailable'),
      href: SOLEON_CONFIG.commitmentClaimProgramIdConfigured
        ? getSolscanAccountUrl(SOLEON_CONFIG.commitmentClaimProgramId)
        : null,
    },
    {
      key: 'stakingProgram',
      value: SOLEON_CONFIG.programIdConfigured ? SOLEON_CONFIG.programId : t('notAvailable'),
      href: SOLEON_CONFIG.programIdConfigured ? getSolscanAccountUrl(SOLEON_CONFIG.programId) : null,
    },
  ] as const;

  const technicalStatusItems = [
    { key: 'localTests', done: true },
    { key: 'webE2e', done: false },
    { key: 'finalRehearsal', done: false },
  ] as const;

  return (
    <main className="min-h-screen bg-background pt-24 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="font-serif text-4xl font-bold text-gradient-gold md:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        {/* Philosophy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                {t('philosophyTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                  <span className="text-muted-foreground">{t('philosophy1')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                  <span className="text-muted-foreground">{t('philosophy2')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                  <span className="text-muted-foreground">{t('philosophy3')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">4</span>
                  <span className="text-muted-foreground">{t('philosophy4')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">5</span>
                  <span className="text-muted-foreground">{t('philosophy5')}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">6</span>
                  <span className="text-muted-foreground">{t('philosophy6')}</span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </motion.div>

        {/* Doc Sections Grid */}
        <div className="grid gap-6 sm:grid-cols-2">
          {docSections.map((section, index) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
            >
              <Card className="group h-full border-border/50 bg-card/50 backdrop-blur transition-all hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${section.bgColor} p-3`}>
                      <section.icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                  </div>
                  <CardTitle className="mt-4">{t(`${section.key}Title`)}</CardTitle>
                  <CardDescription>{t(`${section.key}Desc`)}</CardDescription>
                </CardHeader>
                <CardContent>
                  {section.href ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={getLocalizedHref(section.href)}>
                        {t('viewSection')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" disabled>
                      {t('comingSoon')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Public verification */}
        <motion.div
          id="public-verification"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 scroll-mt-24"
        >
          <Card className="border-primary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5 text-primary" />
                {t('publicVerificationTitle')}
              </CardTitle>
              <CardDescription>{t('publicVerificationDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-2">
                {publicVerificationItems.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-border/50 bg-background/30 p-4"
                  >
                    <p className="text-sm font-semibold">{t(`${item.key}Title`)}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t(`${item.key}Desc`)}</p>
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex max-w-full items-center gap-2 break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {item.value}
                        <ExternalLink className="h-4 w-4 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-3 text-sm font-semibold text-muted-foreground">{item.value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <h3 className="mb-3 font-semibold">{t('technicalStateTitle')}</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  {technicalStatusItems.map((item) => {
                    const Icon = item.done ? CheckCircle2 : Circle;
                    return (
                      <div
                        key={item.key}
                        className="rounded-lg border border-border/50 bg-background/30 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${item.done ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <p className="text-sm font-semibold">{t(`${item.key}Title`)}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{t(`${item.key}Desc`)}</p>
                        <p className={`mt-3 text-xs font-semibold ${item.done ? 'text-green-500' : 'text-muted-foreground'}`}>
                          {item.done ? t('completed') : t('pending')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* DEX-First Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-12"
        >
          <Card className="border-secondary/20 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-secondary">{t('dexFirstTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('dexFirstDesc')}</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
