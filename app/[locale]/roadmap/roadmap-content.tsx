'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Circle, Code2, Flame, Landmark, Lock, Rocket, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const phases = [
  {
    key: 'phase_0',
    titleKey: 'phase0Title',
    days: '1 agosto 2026',
    daysEn: 'August 1, 2026',
    icon: Rocket,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    items: [
      'Crear y publicar el mint SEON Token-2022 con supply fijo de 444,444,444 SEON.',
      'Publicar el código de commitment_claim y staking; desplegar commitment_claim y abrir Genesis Claim.',
      'Financiar 440,000,000 SEON en la reward vault de staking.',
      'Publicar la distribución inicial de 4,444,444 SEON: 44,444 para el desarrollador inicial y 4,400,000 para 2,200 Genesis Claims.',
      'Mostrar mint, vaults y direcciones públicas en Solscan cuando existan.',
    ],
    itemsEn: [
      'Create and publish the Token-2022 SEON mint with fixed supply of 444,444,444 SEON.',
      'Publish the commitment_claim and staking source code; deploy commitment_claim and open Genesis Claim.',
      'Fund 440,000,000 SEON into the staking reward vault.',
      'Publish the 4,444,444 SEON initial distribution: 44,444 for the initial developer and 4,400,000 for 2,200 Genesis Claims.',
      'Display mint, vaults and public addresses on Solscan when available.',
    ],
  },
  {
    key: 'phase_1',
    titleKey: 'phase1Title',
    days: 'agosto 2026',
    daysEn: 'August 2026',
    icon: Code2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    items: [
      'Mantener abierta la distribución inicial gratuita mientras existan fondos y se cumplan las reglas de claim.',
      'Publicar las reglas de reputación, su hash y el estado verificable de Genesis Claim.',
      'Mantener público el código de la web, commitment_claim y staking.',
      'Completar las pruebas integradas de elegibilidad, claim, límites diarios y cierre.',
      'Corregir cualquier problema técnico confirmado antes del despliegue final.',
      'Preparar ensayo final de staking, fee collection y cleanup de posiciones fuera de gracia.',
    ],
    itemsEn: [
      'Keep the free initial distribution open while funds remain and claim rules are satisfied.',
      'Publish the reputation rules, their hash and the verifiable Genesis Claim state.',
      'Keep the website, commitment_claim and staking source code public.',
      'Complete integrated tests for eligibility, claims, daily limits and closure.',
      'Fix any confirmed technical issue before the final deployment.',
      'Prepare final rehearsal for staking, fee collection and post-grace cleanup.',
    ],
  },
  {
    key: 'phase_2',
    titleKey: 'phase2Title',
    days: 'agosto 2026',
    daysEn: 'August 2026',
    icon: Landmark,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
    items: [
      'Preparar el mercado order-book SEON/USDC en Manifest como objetivo DEX inicial.',
      'Mantener claro que no hay pool AMM oficial inicial ni liquidez controlada por Soleon.',
      'Publicar guía para que la comunidad entienda y cree pools en Raydium, Orca o Meteora.',
      'Definir criterios de verificación: mint correcto, DEX real, liquidez visible y riesgos públicos.',
      'No custodiar fondos ni fijar precio desde la web.',
    ],
    itemsEn: [
      'Prepare the SEON/USDC order-book market on Manifest as the initial DEX target.',
      'Keep clear that there is no initial official AMM pool and no Soleon-controlled liquidity.',
      'Publish guidance for the community to understand and create pools on Raydium, Orca or Meteora.',
      'Define verification criteria: correct mint, real DEX, visible liquidity and public risks.',
      'Do not custody funds or set price from the website.',
    ],
  },
  {
    key: 'phase_3',
    titleKey: 'phase3Title',
    days: '1 septiembre o fin de Genesis Claim',
    daysEn: 'September 1 or Genesis completion',
    icon: Lock,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    items: [
      'Desplegar y abrir staking en la fecha más tardía entre el 1 de septiembre y el fin de Genesis Claim, si el rehearsal es correcto.',
      'Activar lock único de 7 días y gracia de 3 días.',
      'Permitir stake, claim, renew, unstake y cleanup público de posiciones fuera de gracia.',
      'Habilitar la primera actualización permissionless de transfer fee a 0.02%.',
      'Iniciar el presupuesto anual: 1% de reward vault no comprometida el primer año.',
    ],
    itemsEn: [
      'Deploy and open staking on the later of September 1 and Genesis Claim completion, provided the rehearsal passes.',
      'Activate the single 7-day lock and 3-day grace period.',
      'Enable stake, claim, renew, unstake and public cleanup of post-grace positions.',
      'Enable the first permissionless transfer-fee update to 0.02%.',
      'Start the annual budget: 1% of uncommitted reward vault in year one.',
    ],
  },
  {
    key: 'phase_4',
    titleKey: 'phase4Title',
    days: 'septiembre 2026 - septiembre 2027',
    daysEn: 'September 2026 - September 2027',
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    items: [
      'Rewards proporcionales al principal activo, no APR fijo garantizado.',
      'Renew puntual compone principal + rewards sin redistribución y reduce futuras redistribuciones de claim del 10% hacia 0%.',
      'Claim y unstake aplican redistribución solo sobre rewards; el principal no se penaliza.',
      'Fees Token-2022 recolectadas públicamente: 20% quema, 1 SEON al ejecutor y resto a reward vault.',
      'La fee de transferencia permanece en 0.02% hasta la siguiente actualización anual.',
    ],
    itemsEn: [
      'Rewards are proportional to active principal, not a guaranteed fixed APR.',
      'On-time renew compounds principal + rewards without redistribution and reduces future claim redistribution from 10% toward 0%.',
      'Claim and unstake apply redistribution only to rewards; principal is not penalized.',
      'Token-2022 fees are collected publicly: 20% burn, 1 SEON caller and rest to reward vault.',
      'The transfer fee remains 0.02% until the next annual update.',
    ],
  },
  {
    key: 'phase_5',
    titleKey: 'phase5Title',
    days: 'fase final',
    daysEn: 'Final phase',
    icon: ShieldCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    items: [
      'Publicar estado final de mint, program IDs, vaults y autoridades.',
      'Revocar autoridades críticas cuando las reglas estén cerradas.',
      'Mantener la web como interfaz y documentación, no como autoridad del protocolo.',
      'Conservar acciones permissionless: fee update, fee collection y cleanup.',
      'Avanzar hacia un protocolo verificable, ejecutable on-chain e independiente de decisiones privadas.',
    ],
    itemsEn: [
      'Publish final state of mint, program IDs, vaults and authorities.',
      'Revoke critical authorities once the rules are closed.',
      'Keep the website as interface and documentation, not as protocol authority.',
      'Preserve permissionless actions: fee update, fee collection and cleanup.',
      'Move toward a verifiable protocol that remains callable on-chain and independent from private decisions.',
    ],
  },
] as const;

export function RoadmapContent() {
  const t = useTranslations('roadmap');
  const locale = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="relative min-h-screen py-20">
      <div className="absolute inset-0 stars-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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

        <div className="relative mt-16">
          <div className="absolute left-4 top-0 h-full w-0.5 bg-gradient-to-b from-primary via-primary/50 to-primary/20 md:left-1/2 md:-translate-x-1/2" />

          <div className="space-y-12">
            {phases.map((phase, index) => {
              const isLeft = index % 2 === 0;
              const items = isEn ? phase.itemsEn : phase.items;

              return (
                <motion.div
                  key={phase.key}
                  initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="relative"
                >
                  <div className="absolute left-4 top-6 z-10 -translate-x-1/2 md:left-1/2">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${phase.bgColor} ring-4 ring-background`}>
                      <phase.icon className={`h-5 w-5 ${phase.color}`} />
                    </div>
                  </div>

                  <div
                    className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] ${
                      isLeft ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'
                    }`}
                  >
                    <Card className="border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/30">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline" className={`${phase.color} border-current`}>
                            {isEn ? phase.daysEn : phase.days}
                          </Badge>
                          <Badge variant="outline" className="text-muted-foreground">
                            {isEn ? 'Planned' : 'Planificado'}
                          </Badge>
                        </div>
                        <CardTitle className="mt-2 text-xl">
                          {t(phase.titleKey)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {items.map((item) => (
                            <li key={item} className="flex items-start gap-2 text-sm">
                              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                              <span className="text-foreground/80">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-16 text-center"
        >
          <div className="mx-auto h-px w-32 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          <p className="mt-6 font-serif text-lg italic text-primary/60">
            {t('footer')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
