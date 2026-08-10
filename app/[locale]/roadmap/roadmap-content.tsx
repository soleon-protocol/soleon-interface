'use client';

import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Circle, FlaskConical, Landmark, Lock, Rocket, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const phases = [
  {
    key: 'phase_0',
    titleKey: 'phase0Title',
    days: '10-23 agosto 2026',
    daysEn: 'August 10-23, 2026',
    icon: FlaskConical,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    items: [
      'Cerrar scripts reanudables de mint, metadata, selección, oleadas y verificación acumulada.',
      'Ejecutar rehearsal completo en devnet: mint, cuatro asignaciones, staking, mantenimiento y airdrop.',
      'Publicar reglas de selección, allowlist de programas, exclusiones, formato de informes y riesgos.',
      'Corregir únicamente problemas confirmados antes de crear activos en mainnet.',
    ],
    itemsEn: [
      'Finalize resumable mint, metadata, selection, wave and cumulative verification scripts.',
      'Run the complete devnet rehearsal: mint, four allocations, staking, maintenance and airdrop.',
      'Publish selection rules, program allowlist, exclusions, report format and risks.',
      'Correct only confirmed issues before creating mainnet assets.',
    ],
  },
  {
    key: 'phase_1',
    titleKey: 'phase1Title',
    days: '24 agosto 2026',
    daysEn: 'August 24, 2026',
    icon: Rocket,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    items: [
      'Crear el mint Token-2022 con supply fijo de 444,444,444 SEON y metadata oficial.',
      'Revocar mint authority y freeze authority; mantener transfer fee en 0% hasta abrir staking.',
      'Asignar 440,000,000 SEON a rewards, 4,000,000 a Genesis, 400,000 a mercado/liquidez y 44,444 al desarrollador.',
      'Publicar mint, wallets, token accounts, balances y hashes de configuración.',
      'Fijar el snapshot y preparar la selección determinista de 400 wallets independientes.',
    ],
    itemsEn: [
      'Create the Token-2022 mint with fixed 444,444,444 SEON supply and official metadata.',
      'Revoke mint and freeze authorities; keep the transfer fee at 0% until staking opens.',
      'Allocate 440,000,000 SEON to rewards, 4,000,000 to Genesis, 400,000 to market/liquidity and 44,444 to the developer.',
      'Publish the mint, wallets, token accounts, balances and configuration hashes.',
      'Fix the snapshot and prepare deterministic selection of 400 independent wallets.',
    ],
  },
  {
    key: 'phase_2',
    titleKey: 'phase2Title',
    days: '31 agosto 2026',
    daysEn: 'August 31, 2026',
    icon: Lock,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    items: [
      'Desplegar e inicializar staking después de superar el rehearsal y las comprobaciones de mainnet.',
      'Abrir lock único de 7 días, gracia de 3 días y rewards proporcionales sin APR garantizado.',
      'Ejecutar la ola 1: 40 wallets x 10,000 SEON y publicar su informe verificable.',
      'Activar de forma permissionless la transfer fee inicial de 0.02%.',
      'Mantener temporalmente la upgrade authority para correcciones verificadas durante las diez olas.',
    ],
    itemsEn: [
      'Deploy and initialize staking after the rehearsal and mainnet checks pass.',
      'Open the single 7-day lock, 3-day grace and proportional rewards without guaranteed APR.',
      'Execute wave 1: 40 wallets x 10,000 SEON and publish its verifiable report.',
      'Permissionlessly activate the initial 0.02% transfer fee.',
      'Temporarily retain the upgrade authority for verified corrections during the ten waves.',
    ],
  },
  {
    key: 'phase_3',
    titleKey: 'phase3Title',
    days: '31 agosto - 2 noviembre',
    daysEn: 'August 31 - November 2',
    icon: Landmark,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
    items: [
      'Ejecutar una ola semanal de 40 wallets hasta completar 400 receptores y 4,000,000 SEON.',
      'Publicar por ola receptores, firmas, fallos, reintentos e informe acumulado.',
      'Permitir órdenes SEON/USDC reales desde la reserva pública bajo reglas fijas; sin autooperaciones ni volumen fabricado.',
      'Observar staking, actividad de terceros, profundidad y price discovery sin prometer liquidez ni valor.',
      'Publicar cualquier corrección del staking con motivo, diff, pruebas y nueva dirección verificable.',
    ],
    itemsEn: [
      'Execute one weekly wave of 40 wallets until 400 recipients and 4,000,000 SEON are complete.',
      'Publish recipients, signatures, failures, retries and the cumulative report for every wave.',
      'Allow genuine SEON/USDC orders from the public reserve under fixed rules; no self-trading or fabricated volume.',
      'Observe staking, third-party activity, depth and price discovery without promising liquidity or value.',
      'Publish every staking correction with its reason, diff, tests and new verifiable address.',
    ],
  },
  {
    key: 'phase_4',
    titleKey: 'phase4Title',
    days: 'noviembre 2026',
    daysEn: 'November 2026',
    icon: ShieldCheck,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    items: [
      'Verificar las diez olas, balances, supply, vaults, transfer fee y estado completo del staking.',
      'Completar la auditoría final y revocar las autoridades críticas del programa de staking.',
      'Mantener la web, informes y maintenance wallet como operaciones públicas, no como autoridad sobre las reglas inmutables.',
      'Evaluar tras 2-3 meses si la actividad real justifica un pool con activos restantes de mercado.',
      'Crear pool solo con precio observado y LP quemado o bloqueado permanentemente; si no se cumplen las condiciones, no forzarlo.',
    ],
    itemsEn: [
      'Verify all ten waves, balances, supply, vaults, transfer fee and complete staking state.',
      'Complete the final audit and revoke critical staking program authorities.',
      'Keep the website, reports and maintenance wallet as public operations, not authority over immutable rules.',
      'After 2-3 months, assess whether real activity justifies a pool using remaining market assets.',
      'Create a pool only from observed prices with permanently burned or locked LP; otherwise do not force it.',
    ],
  },
] as const;

export function RoadmapContent() {
  const t = useTranslations('roadmap');
  const isEn = useLocale() === 'en';

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

                  <div className={`ml-12 md:ml-0 md:w-[calc(50%-2rem)] ${isLeft ? 'md:mr-auto md:pr-8' : 'md:ml-auto md:pl-8'}`}>
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
                        <CardTitle className="mt-2 text-xl">{t(phase.titleKey)}</CardTitle>
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
          <p className="mt-6 font-serif text-lg italic text-primary/60">{t('footer')}</p>
        </motion.div>
      </div>
    </div>
  );
}
