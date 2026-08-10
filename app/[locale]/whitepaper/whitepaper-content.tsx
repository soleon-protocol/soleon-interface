'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Coins,
  FileText,
  Gift,
  Landmark,
  Lightbulb,
  Lock,
  Shield,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const sectionsEs = [
  { id: 'introduction', label: 'Introducción', icon: BookOpen },
  { id: 'problem', label: 'El problema', icon: AlertTriangle },
  { id: 'solution', label: 'La solución', icon: Lightbulb },
  { id: 'distribution', label: 'Distribución Genesis', icon: Gift },
  { id: 'tokenomics', label: 'Tokenomics', icon: Coins },
  { id: 'staking', label: 'Staking', icon: Lock },
  { id: 'markets', label: 'Mercado y liquidez', icon: Landmark },
  { id: 'technical', label: 'Especificaciones', icon: Code },
  { id: 'security', label: 'Seguridad y control', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'conclusion', label: 'Conclusión', icon: CheckCircle },
] as const;

const sectionsEn = [
  { id: 'introduction', label: 'Introduction', icon: BookOpen },
  { id: 'problem', label: 'The problem', icon: AlertTriangle },
  { id: 'solution', label: 'The solution', icon: Lightbulb },
  { id: 'distribution', label: 'Genesis distribution', icon: Gift },
  { id: 'tokenomics', label: 'Tokenomics', icon: Coins },
  { id: 'staking', label: 'Staking', icon: Lock },
  { id: 'markets', label: 'Market and liquidity', icon: Landmark },
  { id: 'technical', label: 'Specifications', icon: Code },
  { id: 'security', label: 'Security and control', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'conclusion', label: 'Conclusion', icon: CheckCircle },
] as const;

const whitepaperContentEs = {
  introduction: {
    title: 'Introducción',
    content: `Soleon es un protocolo Token-2022 de supply fijo en Solana con una distribución Genesis transparente y verificable y staking on-chain.

El objetivo no es prometer precio, rentabilidad o liquidez, sino publicar reglas, direcciones y límites que puedan verificarse de forma independiente. Soleon separa el control temporal necesario para lanzar y monitorizar el sistema de las reglas del protocolo que deben quedar inmutables al finalizar el proceso.

No existe preventa, ICO, ronda privada, pretoken ni reserva oculta de revisión. La web es una interfaz mantenida por Soleon Maintainer; no debe confundirse con la autoridad final del protocolo.`,
  },
  problem: {
    title: 'El problema',
    content: `Muchos lanzamientos de tokens dependen de ventas privadas, asignaciones opacas, volumen artificial, liquidez retirable y contratos que conservan poderes administrativos indefinidos.

Un claim también presupone descubrimiento previo: el usuario debe conocer el proyecto, visitar una web desconocida, conectar su wallet y firmar. Para un protocolo sin marketing pagado, ese modelo puede no distribuir nada y puede parecerse a los patrones utilizados por airdrops fraudulentos.

Distribuir tokens no crea automáticamente compradores, precio ni comunidad. Del mismo modo, un mercado técnicamente creado no tiene liquidez hasta que compradores y vendedores independientes aceptan órdenes reales.`,
  },
  solution: {
    title: 'La solución Soleon',
    content: `Soleon utiliza un lanzamiento gradual y reproducible:

• Supply fijo y metadata oficial publicados antes de la distribución.
• Cuatro asignaciones exactas y direcciones separadas.
• Airdrop directo: el receptor no conecta, firma, reclama ni paga.
• Selección determinista basada en snapshot, reglas y seed pública futura.
• Diez olas semanales con informes y verificación acumulada.
• Staking on-chain abierto tras rehearsal y comprobaciones de mainnet.
• Reserva temporal de mercado identificada, con órdenes reales y prohibición de autooperaciones.
• Auditoría final y revocación de autoridades críticas tras la décima ola.

La confianza se apoya en datos verificables, no en la identidad real del mantenedor. La figura pública operativa es Soleon Maintainer.`,
  },
  distribution: {
    title: 'Distribución Genesis',
    content: `**Supply total: 444,444,444 SEON**

Asignación exacta:
• 440,000,000 SEON → reward vault finita de staking.
• 4,000,000 SEON → Genesis Distribution Wallet.
• 400,000 SEON → Market / Liquidity Wallet temporal.
• 44,444 SEON → Developer Wallet.

**Airdrop Genesis**
Se seleccionan 400 wallets independientes antes de iniciar la distribución. Cada wallet recibe directamente 10,000 SEON. La distribución se divide en diez olas de 40 wallets, una por semana, por un total de 400,000 SEON por ola.

No existe contrato adicional de distribución, servidor de firmas, botón de claim ni fee Genesis. Soleon nunca pedirá conectar una wallet o aprobar una transacción para recibir la asignación.

**Selección reproducible**
Las fuentes de candidatos, el slot del snapshot, las reglas de actividad, la allowlist de programas, las exclusiones y su hash se publican antes de seleccionar. Las wallets deben mostrar historial real, actividad reciente en el ecosistema y entre 0.05 y 500 SOL en el snapshot. Se excluyen exchanges, programas, bots evidentes, duplicados y direcciones controladas por Soleon.

Una seed derivada de un dato futuro público selecciona los 400 receptores de forma determinista. La lista queda fijada antes de la primera ola. Cada informe publica receptores, cuentas Token-2022 creadas, firmas, errores y reintentos. El proceso es idempotente: un reintento no duplica una asignación.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Token**
• Red: Solana mainnet.
• Estándar: Token-2022.
• Nombre: Soleon.
• Símbolo: SEON.
• Decimales: 9.
• Supply fijo: 444,444,444 SEON.
• Mint authority: revocada tras crear y asignar el supply.
• Freeze authority: nula.
• Transfer fee inicial: 0%.

**Calendario de transfer fee**
Cuando staking_open sea true, una acción permissionless puede activar 0.02%. Cada año completo de staking añade 0.02 puntos porcentuales, hasta un máximo de 0.4%. La fee máxima por transferencia es 400 SEON.

**Distribución de transfer fees**
Cuando se alcanza el mínimo publicado, una acción pública recolecta y distribuye:
• 20% → quema permanente.
• Hasta 1 SEON → incentivo fijo al ejecutor.
• Resto → reward vault.

No existe emisión adicional: los rewards proceden de la reward vault finita y las fees redistribuidas.`,
  },
  staking: {
    title: 'Sistema de staking',
    content: `El staking se abre en mainnet solo después del rehearsal y las comprobaciones finales. La fecha prevista es el 31 de agosto de 2026, junto con la ola 1.

**Reglas base**
• Lock único: 7 días.
• Periodo de gracia: 3 días.
• Rewards proporcionales al principal activo.
• Claim de rewards disponible hasta terminar la gracia.
• Renew puntual consolida principal + rewards.
• Unstake devuelve siempre el principal al propietario.
• Cleanup permissionless de posiciones expiradas tras la gracia.

**Presupuesto anual**
El primer año puede comprometer hasta el 1% de la reward vault no comprometida. El porcentaje aumenta 0.5 puntos por año de staking hasta un máximo de 100%. No es un APR económico garantizado: el resultado por posición depende del total staked, el tiempo activo y el presupuesto disponible.

**Redistribución de rewards**
Las posiciones nuevas empiezan con 10% de redistribución sobre rewards reclamados o retirados. Cada renew puntual reduce 0.5 puntos hasta llegar a 0% tras 20 renovaciones. La redistribución nunca se aplica al principal.

Las acciones de claim_rewards y unstake_expired pueden incluir la fee de mantenimiento publicada de 0.0005 SOL. Renew no la cobra. La wallet receptora es pública y la fee no concede control sobre las reglas.`,
  },
  markets: {
    title: 'Mercado y liquidez',
    content: `Soleon es DEX-first: no hay preventa, listing CEX prometido, precio oficial ni valoración inicial impuesta.

**Market / Liquidity Wallet**
La reserva temporal recibe 400,000 SEON y puede ser fondeada por Soleon Maintainer con hasta 200 USDC. Su dirección, balances y órdenes son públicos. Puede colocar bids y asks genuinos en un mercado SEON/USDC, aceptando operaciones reales de terceros.

Reglas obligatorias:
• Nunca operar contra otra wallet controlada por Soleon.
• Nunca fabricar volumen, demanda o precio.
• Si no hay operaciones independientes, el volumen real es cero.
• No perseguir el precio operación por operación.
• Ajustar quotes solo mediante reglas publicadas de inventario, spread, profundidad y frecuencia.
• Etiquetar claramente la liquidez controlada por Soleon.

**Posible pool posterior**
Tras dos o tres meses se evalúan actividad independiente, profundidad y precio observado. Los activos restantes pueden iniciar un pool solo si esas condiciones lo justifican. El ratio debe derivarse del mercado real y el LP debe quemarse o bloquearse permanentemente. Si no existe actividad suficiente, no se fuerza un pool.

No se garantiza que aparezcan compradores, liquidez, volumen o valor.`,
  },
  technical: {
    title: 'Especificaciones técnicas',
    content: `**Programas y cuentas**
• Token-2022 mint SEON.
• Programa Anchor de staking.
• Reward vault controlada por PDA.
• Staking vault controlada por PDA.
• Fee vault Token-2022 controlada por el programa.
• Genesis Distribution Wallet y token account.
• Market / Liquidity Wallet y token account.
• Developer Wallet.
• Maintenance Wallet.

La distribución Genesis se ejecuta mediante scripts que usan System Program, Associated Token Program y Token-2022 Program; no necesita un programa Soleon adicional.

**Metadata oficial**
Nombre Soleon, símbolo SEON, logo oficial, descripción, web y enlaces públicos se sirven desde soleonprotocol.com. La metadata no incluye mensajes de claim ni instrucciones para firmar.

Los scripts de mint y oleadas son reanudables. El estado privado local evita preparar accidentalmente un segundo mint y los memos de distribución permiten distinguir una transferencia Genesis de un balance adquirido por otra vía.`,
  },
  security: {
    title: 'Seguridad, autoridad y descentralización',
    content: `La descentralización se describe por capas:

**Token**
Mint y freeze authorities se revocan tras la creación y asignación. El supply no puede ampliarse.

**Staking**
La upgrade authority se conserva temporalmente durante las diez olas para corregir fallos confirmados. Cualquier corrección debe publicar motivo, diff, pruebas y nueva dirección verificable. Tras la ola 10, la verificación acumulada y la auditoría final, las autoridades críticas se revocan y el programa queda inmutable.

**Operaciones**
Soleon Maintainer sigue manteniendo web, documentación, informes y Maintenance Wallet. Estas tareas no equivalen a control sobre un protocolo inmutable. La Developer Wallet contiene propiedad personal declarada. La Market / Liquidity Wallet es temporal y su actividad está etiquetada.

No se afirma descentralización total mientras existan autoridades temporales o wallets operativas. El objetivo verificable es la inmutabilidad de las reglas on-chain, no la desaparición de toda persona que mantenga información o infraestructura.

El código público y las pruebas reducen riesgo, pero no sustituyen una auditoría independiente ni garantizan ausencia de errores.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**10-23 de agosto de 2026**
Rehearsal completo en devnet, cierre de scripts, reglas, metadata, informes y documentación.

**24 de agosto de 2026**
Mint previsto en mainnet, cuatro asignaciones, revocación de mint/freeze authorities y publicación de direcciones.

**31 de agosto de 2026**
Despliegue y apertura previstos del staking, activación permissionless de transfer fee y ola Genesis 1.

**7 de septiembre - 2 de noviembre de 2026**
Olas 2-10, una por semana. Monitorización del staking, informes acumulados y mercado DEX real bajo reglas públicas.

**Noviembre de 2026**
Verificación final, auditoría, revocación de autoridades críticas y publicación del estado inmutable.

**Tras 2-3 meses de actividad real**
Evaluación opcional de pool con activos restantes y LP permanentemente quemado o bloqueado. Las fechas son objetivos operativos y pueden aplazarse si una comprobación técnica falla.`,
  },
  conclusion: {
    title: 'Conclusión',
    content: `Soleon propone un lanzamiento pequeño, público y comprobable. La distribución directa resuelve el primer contacto sin pedir confianza en una firma o fee de claim; las diez olas limitan el coste y permiten publicar resultados verificables.

El protocolo no promete precio, liquidez, adopción, rentabilidad, APR económico ni listing. Un airdrop crea holders, no demanda. La reserva temporal puede aportar órdenes reales, no actividad ficticia.

El criterio de éxito es que supply, asignaciones, selección, transferencias, staking, fees y autoridades puedan auditarse on-chain y que, tras la ventana declarada de corrección, las reglas críticas de staking dejen de depender del mantenedor.`,
  },
};

const whitepaperContentEn = {
  introduction: {
    title: 'Introduction',
    content: `Soleon is a fixed-supply Token-2022 protocol on Solana with a transparent, verifiable Genesis distribution and on-chain staking.

The objective is not to promise price, returns or liquidity, but to publish independently verifiable rules, addresses and limits. Soleon separates the temporary control required to launch and monitor the system from the protocol rules that must become immutable when the process is complete.

There is no presale, ICO, private round, temporary pretoken or hidden review reserve. The website is an interface maintained by Soleon Maintainer; it must not be confused with the protocol's final authority.`,
  },
  problem: {
    title: 'The problem',
    content: `Many token launches depend on private sales, opaque allocations, fabricated volume, removable liquidity and contracts that retain administrative power indefinitely.

A claim also assumes prior discovery: a user must know the project, visit an unknown website, connect a wallet and sign. For a protocol without paid marketing, this model may distribute nothing and may resemble patterns used by fraudulent airdrops.

Distributing tokens does not automatically create buyers, price or community. Likewise, a technically created market has no liquidity until independent buyers and sellers accept genuine orders.`,
  },
  solution: {
    title: 'The Soleon solution',
    content: `Soleon uses a gradual and reproducible launch:

• Fixed supply and official metadata published before distribution.
• Four exact allocations and separate addresses.
• Direct airdrop: recipients do not connect, sign, claim or pay.
• Deterministic selection based on a snapshot, public rules and a future public seed.
• Ten weekly waves with reports and cumulative verification.
• On-chain staking opened after rehearsal and mainnet checks.
• An identified temporary market reserve with genuine orders and no self-trading.
• Final audit and revocation of critical authorities after wave ten.

Trust is based on verifiable data rather than the maintainer's real-world identity. The public operational role is Soleon Maintainer.`,
  },
  distribution: {
    title: 'Genesis distribution',
    content: `**Total supply: 444,444,444 SEON**

Exact allocation:
• 440,000,000 SEON → finite staking reward vault.
• 4,000,000 SEON → Genesis Distribution Wallet.
• 400,000 SEON → temporary Market / Liquidity Wallet.
• 44,444 SEON → Developer Wallet.

**Genesis Airdrop**
Four hundred independent wallets are selected before distribution begins. Each wallet receives 10,000 SEON directly. Distribution is split into ten waves of 40 wallets, one per week, for 400,000 SEON per wave.

There is no additional distribution contract, signing server, claim button or Genesis fee. Soleon will never ask a recipient to connect a wallet or approve a transaction to receive the allocation.

**Reproducible selection**
Candidate sources, snapshot slot, activity rules, program allowlist, exclusions and their hash are published before selection. Wallets must show real history, recent ecosystem activity and a snapshot balance between 0.05 and 500 SOL. Exchanges, programs, obvious bots, duplicates and Soleon-controlled addresses are excluded.

A seed derived from future public data selects all 400 recipients deterministically. The list is fixed before wave one. Every report publishes recipients, created Token-2022 accounts, signatures, errors and retries. Execution is idempotent: a retry cannot duplicate an allocation.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Token**
• Network: Solana mainnet.
• Standard: Token-2022.
• Name: Soleon.
• Symbol: SEON.
• Decimals: 9.
• Fixed supply: 444,444,444 SEON.
• Mint authority: revoked after supply creation and allocation.
• Freeze authority: none.
• Initial transfer fee: 0%.

**Transfer-fee schedule**
When staking_open is true, a permissionless action may activate 0.02%. Each completed staking year adds 0.02 percentage points up to 0.4%. The maximum fee per transfer is 400 SEON.

**Transfer-fee distribution**
Once the published minimum is reached, a public action collects and distributes:
• 20% → permanent burn.
• Up to 1 SEON → fixed caller incentive.
• Remainder → reward vault.

There is no additional issuance: rewards come from the finite reward vault and redistributed fees.`,
  },
  staking: {
    title: 'Staking system',
    content: `Staking opens on mainnet only after the rehearsal and final checks. The planned date is August 31, 2026, together with wave 1.

**Base rules**
• Single lock: 7 days.
• Grace period: 3 days.
• Rewards proportional to active principal.
• Reward claim available until grace ends.
• On-time renew consolidates principal + rewards.
• Unstake always returns principal to its owner.
• Permissionless cleanup of expired positions after grace.

**Annual budget**
Year one may commit up to 1% of the uncommitted reward vault. The percentage increases by 0.5 points per staking year up to 100%. This is not guaranteed economic APR: a position's result depends on total staked, active time and available budget.

**Reward redistribution**
New positions start with 10% redistribution on rewards claimed or withdrawn. Each on-time renew reduces this by 0.5 points until it reaches 0% after 20 renewals. Redistribution never applies to principal.

The claim_rewards and unstake_expired actions may include the published 0.0005 SOL maintenance fee. Renew does not charge it. The receiving wallet is public and the fee grants no control over protocol rules.`,
  },
  markets: {
    title: 'Market and liquidity',
    content: `Soleon is DEX-first: there is no presale, promised CEX listing, official price or imposed initial valuation.

**Market / Liquidity Wallet**
The temporary reserve receives 400,000 SEON and may be funded by Soleon Maintainer with up to 200 USDC. Its address, balances and orders are public. It may place genuine bids and asks in a SEON/USDC market and accept real third-party trades.

Mandatory rules:
• Never trade against another Soleon-controlled wallet.
• Never fabricate volume, demand or price.
• If no independent trade occurs, real volume is zero.
• Do not chase the price trade by trade.
• Adjust quotes only under published inventory, spread, depth and frequency rules.
• Clearly label Soleon-controlled liquidity.

**Possible later pool**
After two to three months, independent activity, depth and observed prices are assessed. Remaining assets may seed a pool only if those conditions justify it. Its ratio must derive from real trading and its LP must be permanently burned or locked. If activity is insufficient, no pool is forced.

Buyers, liquidity, volume and value are not guaranteed.`,
  },
  technical: {
    title: 'Technical specifications',
    content: `**Programs and accounts**
• Token-2022 SEON mint.
• Anchor staking program.
• PDA-controlled reward vault.
• PDA-controlled staking vault.
• Program-controlled Token-2022 fee vault.
• Genesis Distribution Wallet and token account.
• Market / Liquidity Wallet and token account.
• Developer Wallet.
• Maintenance Wallet.

Genesis distribution is executed by scripts using the System Program, Associated Token Program and Token-2022 Program; it needs no additional Soleon program.

**Official metadata**
Soleon name, SEON symbol, official logo, description, website and public links are served from soleonprotocol.com. Metadata contains no claim message or signing instruction.

Mint and wave scripts are resumable. Private local state prevents accidental preparation of a second mint, and distribution memos distinguish a Genesis transfer from a balance acquired through another route.`,
  },
  security: {
    title: 'Security, authority and decentralization',
    content: `Decentralization is described in layers:

**Token**
Mint and freeze authorities are revoked after creation and allocation. Supply cannot be expanded.

**Staking**
The upgrade authority is temporarily retained during ten waves to correct confirmed failures. Every correction must publish its reason, diff, tests and new verifiable address. After wave 10, cumulative verification and the final audit, critical authorities are revoked and the program becomes immutable.

**Operations**
Soleon Maintainer continues to maintain the website, documentation, reports and Maintenance Wallet. These tasks do not equal control over immutable protocol rules. The Developer Wallet contains disclosed personal property. The Market / Liquidity Wallet is temporary and its activity is labelled.

Soleon does not claim total decentralization while temporary authorities or operational wallets remain. The verifiable objective is immutability of on-chain rules, not the disappearance of every person maintaining information or infrastructure.

Public code and tests reduce risk but do not replace an independent audit or guarantee absence of defects.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**August 10-23, 2026**
Complete devnet rehearsal; finalize scripts, rules, metadata, reports and documentation.

**August 24, 2026**
Planned mainnet mint, four allocations, revocation of mint/freeze authorities and publication of addresses.

**August 31, 2026**
Planned staking deployment and opening, permissionless transfer-fee activation and Genesis wave 1.

**September 7 - November 2, 2026**
Waves 2-10, one per week. Staking monitoring, cumulative reports and real DEX market activity under public rules.

**November 2026**
Final verification, audit, revocation of critical authorities and publication of immutable state.

**After 2-3 months of real activity**
Optional assessment of a pool using remaining assets and permanently burned or locked LP. Dates are operational targets and may be delayed if a technical check fails.`,
  },
  conclusion: {
    title: 'Conclusion',
    content: `Soleon proposes a small, public and reviewable launch. Direct distribution solves first contact without asking recipients to trust a claim signature or fee; ten waves limit cost and allow verifiable results to be published.

The protocol does not promise price, liquidity, adoption, returns, economic APR or listing. An airdrop creates holders, not demand. The temporary reserve may provide genuine orders, never fictitious activity.

Success means supply, allocations, selection, transfers, staking, fees and authorities can be audited on-chain and that, after the disclosed correction window, critical staking rules no longer depend on the maintainer.`,
  },
};

export function WhitepaperContent() {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const t = useTranslations('whitepaper');
  const isEn = useLocale() === 'en';
  const sections = isEn ? sectionsEn : sectionsEs;
  const whitepaperContent = isEn ? whitepaperContentEn : whitepaperContentEs;
  const activeContent = whitepaperContent[activeSection as keyof typeof whitepaperContent];

  return (
    <div className="relative min-h-screen py-20">
      <div className="absolute inset-0 stars-bg opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-6 w-fit rounded-full bg-primary/10 p-4">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-4xl font-bold text-gradient-gold sm:text-5xl">
            {t('title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{t('subtitle')}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {isEn ? 'Version 1.1 - Genesis Airdrop revision - August 10, 2026' : 'Versión 1.1 - revisión Airdrop Genesis - 10 de agosto de 2026'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr]"
        >
          <Card className="h-fit border-border/50 bg-card/50 backdrop-blur-sm lg:sticky lg:top-24">
            <CardContent className="p-4">
              <nav className="space-y-1">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <section.icon className="h-4 w-4" />
                    {section.label}
                    {activeSection === section.id && <ChevronRight className="ml-auto h-4 w-4" />}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6 lg:p-8">
              <ScrollArea className="h-[calc(100vh-300px)] pr-4">
                <div className="mb-6 flex items-center gap-4">
                  <Image
                    src="/images/logo-symbol.png"
                    alt="Soleon"
                    width={48}
                    height={48}
                    className="h-12 w-12"
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{activeContent.title}</h2>
                    <p className="text-sm text-muted-foreground">Soleon Whitepaper v1.1 - Token-2022</p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  {activeContent.content.split('\n\n').map((paragraph, index) => (
                    <p
                      key={index}
                      className="mb-4 whitespace-pre-line text-foreground/80"
                      dangerouslySetInnerHTML={{
                        __html: paragraph
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                          .replace(/^• /gm, '<span class="text-primary mr-2">•</span>'),
                      }}
                    />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
