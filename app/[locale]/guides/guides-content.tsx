'use client';

import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import {
  Wallet,
  ShoppingCart,
  Lock,
  Gift,
  Flame,
  Shield,
  ArrowRight,
  Clock,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Coins,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const guides = [
  {
    key: 'guide1',
    icon: Wallet,
    available: true,
    href: '#connect-wallet-guide',
    statusKey: 'guide1Status',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    key: 'guide2',
    icon: ShoppingCart,
    available: false,
    href: null,
    statusKey: 'guide2Status',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    key: 'guide3',
    icon: Lock,
    available: false,
    href: null,
    statusKey: 'guide3Status',
    gradient: 'from-amber-500/20 to-yellow-500/20',
  },
  {
    key: 'guide4',
    icon: Gift,
    available: false,
    href: null,
    statusKey: 'guide4Status',
    gradient: 'from-green-500/20 to-emerald-500/20',
  },
  {
    key: 'guide5',
    icon: Flame,
    available: false,
    href: null,
    statusKey: 'guide5Status',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
  {
    key: 'guide6',
    icon: Shield,
    available: false,
    href: null,
    statusKey: 'guide6Status',
    gradient: 'from-gray-500/20 to-slate-500/20',
  },
  {
    key: 'guide7',
    icon: Coins,
    available: true,
    href: '#liquidity-pool-guide',
    statusKey: 'guide7Status',
    gradient: 'from-green-500/20 to-teal-500/20',
  },
] as const;

export function GuidesContent() {
  const t = useTranslations('guides');

  return (
    <div className="relative min-h-screen py-20">
      {/* Background */}
      <div className="absolute inset-0 stars-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="font-serif text-4xl font-bold text-gradient-gold sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
        </motion.div>

        {/* Guides Grid */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide, index) => (
            <motion.div
              key={guide.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card className="group relative h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50">
                {/* Gradient background on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${guide.gradient} opacity-0 transition-opacity group-hover:opacity-100`}
                />

                <CardHeader className="relative pb-2">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <guide.icon className="h-6 w-6 text-primary" />
                    </div>
                    {!guide.available && (
                      <Badge
                        variant="secondary"
                        className="bg-muted text-muted-foreground"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {t('comingSoon')}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="mt-4 text-lg">
                    {t(`${guide.key}Title`)}
                  </CardTitle>
                </CardHeader>

                <CardContent className="relative">
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t(`${guide.key}Desc`)}
                  </p>
                  {guide.available && guide.href ? (
                    <Button
                      asChild
                      variant="default"
                      size="sm"
                      className="bg-gradient-gold text-primary-foreground hover:opacity-90"
                    >
                      <a href={guide.href}>
                        {t('readGuide')}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" disabled>
                      {t('readGuide')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {t(guide.statusKey)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Wallet Connection Guide (Example of available guide content) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          id="connect-wallet-guide"
          className="mt-16 scroll-mt-24"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3">
                  <Wallet className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>{t('guide1Title')}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('stepByStep')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    1
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t('walletStep1Title')}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('walletStep1Desc')}
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    2
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t('walletStep2Title')}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('walletStep2Desc')}
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    3
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t('walletStep3Title')}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('walletStep3Desc')}
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    4
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">
                      {t('walletStep4Title')}
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t('walletStep4Desc')}
                    </p>
                  </div>
                </div>

                {/* Warning */}
                <div className="mt-6 rounded-lg bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 shrink-0 text-destructive" />
                    <div>
                      <h4 className="font-semibold text-destructive">
                        {t('walletWarningTitle')}
                      </h4>
                      <p className="mt-1 text-sm text-foreground/80">
                        {t('walletWarningDesc')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Liquidity Pool Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          id="liquidity-pool-guide"
          className="mt-8"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Layers className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{t('liquidityGuideTitle')}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t('liquidityGuideSubtitle')}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">{t('liquidityGuideIntro')}</p>

              <div className="rounded-lg bg-primary/10 p-4">
                <h4 className="mb-2 font-semibold">{t('lpFeesTitle')}</h4>
                <p className="text-sm text-muted-foreground">{t('lpFeesDesc')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h4 className="mb-2 font-semibold">{t('createPoolTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('createPoolDesc')}</p>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <h4 className="mb-2 font-semibold">{t('poolTrustTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('poolTrustDesc')}</p>
                </div>
              </div>

              <div className="rounded-lg bg-background/50 p-4">
                <h4 className="mb-3 font-semibold">{t('communityCreationTitle')}</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  {[1, 2, 3].map((index) => (
                    <div key={index} className="rounded-lg border border-border/50 bg-background/30 p-3">
                      <p className="font-semibold">{t(`communityCreationStep${index}Title`)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{t(`communityCreationStep${index}Desc`)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-background/50 p-4">
                  <h4 className="mb-2 font-semibold">{t('cpmmGuideTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cpmmGuideDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <h4 className="mb-2 font-semibold">{t('dammGuideTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('dammGuideDesc')}</p>
                </div>
                <div className="rounded-lg bg-background/50 p-4">
                  <h4 className="mb-2 font-semibold">{t('clmmGuideTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('clmmGuideDesc')}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                  <h4 className="mb-2 font-semibold">{t('cpmmHowTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cpmmHowDesc')}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                  <h4 className="mb-2 font-semibold">{t('dammHowTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('dammHowDesc')}</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                  <h4 className="mb-2 font-semibold">{t('clmmHowTitle')}</h4>
                  <p className="text-sm text-muted-foreground">{t('clmmHowDesc')}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-green-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h4 className="font-semibold">{t('whyCpmmTitle')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('whyCpmmDesc')}</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h4 className="font-semibold">{t('clmmRiskTitle')}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('clmmRiskDesc')}</p>
                </div>
              </div>

              <div className="rounded-lg bg-destructive/10 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h4 className="font-semibold">{t('impermanentLossTitle')}</h4>
                </div>
                <p className="text-sm text-muted-foreground">{t('impermanentLossDesc')}</p>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/30 p-4">
                <h4 className="mb-3 font-semibold">{t('dexDocsTitle')}</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <a
                    href="https://docs.raydium.io/raydium"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/50 p-3 text-sm transition-colors hover:bg-background/70"
                  >
                    <span>{t('raydiumDocs')}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://docs.meteora.ag/overview/products/damm-v2/what-is-damm-v2"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/50 p-3 text-sm transition-colors hover:bg-background/70"
                  >
                    <span>{t('meteoraDocs')}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://docs.orca.so/developers/architecture/account-architecture"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 rounded-lg bg-background/50 p-3 text-sm transition-colors hover:bg-background/70"
                  >
                    <span>{t('orcaDocs')}</span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </a>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t('dexDocsWarning')}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
