'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Coins,
  Download,
  FileText,
  Gift,
  Landmark,
  Lightbulb,
  Lock,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const sectionsEs = [
  { id: 'introduction', label: 'Introducción', icon: BookOpen },
  { id: 'problem', label: 'El Problema', icon: AlertTriangle },
  { id: 'solution', label: 'La Solución', icon: Lightbulb },
  { id: 'distribution', label: 'Distribución Inicial', icon: Gift },
  { id: 'tokenomics', label: 'Tokenomics', icon: Coins },
  { id: 'staking', label: 'Staking', icon: Lock },
  { id: 'markets', label: 'Mercados DEX-first', icon: Landmark },
  { id: 'technical', label: 'Especificaciones', icon: Code },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'conclusion', label: 'Conclusión', icon: CheckCircle },
] as const;

const sectionsEn = [
  { id: 'introduction', label: 'Introduction', icon: BookOpen },
  { id: 'problem', label: 'The Problem', icon: AlertTriangle },
  { id: 'solution', label: 'The Solution', icon: Lightbulb },
  { id: 'distribution', label: 'Initial Distribution', icon: Gift },
  { id: 'tokenomics', label: 'Tokenomics', icon: Coins },
  { id: 'staking', label: 'Staking', icon: Lock },
  { id: 'markets', label: 'DEX-first Markets', icon: Landmark },
  { id: 'technical', label: 'Specifications', icon: Code },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'timeline', label: 'Timeline', icon: Clock },
  { id: 'conclusion', label: 'Conclusion', icon: CheckCircle },
] as const;

const whitepaperContentEs = {
  introduction: {
    title: 'Introducción',
    content: `Soleon representa un modelo de lanzamiento de token en Solana basado en transparencia, distribución pública y reglas on-chain verificables. Su objetivo no es prometer retornos, sino construir una estructura donde cualquier persona pueda revisar cómo nace el token, dónde están los fondos, qué puede cambiarse y qué debe quedar inmutable.

El mercado de criptomonedas ha visto demasiados lanzamientos con preventas privadas, wallets ocultas, pools falsos, liquidez controlada por pocos y promesas imposibles de verificar. Soleon nace de la necesidad de un modelo distinto: pequeño al principio, público desde el primer día y diseñado para reducir la dependencia de decisiones privadas.

El lanzamiento inicial previsto es el **1 de agosto de 2026**. Ese día se publica el mint SEON Token-2022, se despliega y abre commitment_claim, y se publica el código de commitment_claim y staking. Staking se despliega y abre en la fecha más tardía entre el **1 de septiembre de 2026** y la finalización completa de Genesis Claim, siempre que el rehearsal sea correcto.

El diseño actual evita tres dependencias habituales:
• No hay preventa, ICO ni pretoken temporal.
• No hay pool AMM inicial controlado por el creador.
• No hay promesa de listing en CEX ni precio oficial.

Soleon nace con una filosofía clara:
• La transparencia es fundamental: los fondos relevantes deben ser públicos y verificables.
• La distribución inicial no se compra: se reclama mediante Genesis Claim si la wallet cumple reglas públicas de reputación Solana.
• La descentralización es un objetivo técnico, no un eslogan.
• La web ayuda a usar el protocolo, pero no debe ser la autoridad del protocolo.
• Los mercados deben formarse de manera DEX-first, pública y verificable.
• La revisión pública es parte del lanzamiento, no un adorno posterior.

SEON se distribuye primero mediante un Genesis Claim on-chain: un claim de 2,000 SEON por wallet elegible, con firma de la wallet y firma server-side de elegibilidad. Después, si la revisión pública y el ensayo final son correctos, se despliega y abre staking con lock fijo de 7 días, rewards proporcionales y mantenimiento permissionless.`,
  },
  problem: {
    title: 'El Problema',
    content: `Muchos lanzamientos de tokens fallan por problemas repetidos:

**Preventas Injustas**
Las preventas tradicionales crean una ventaja injusta para los early investors que pueden comprar a precios significativamente más bajos, dejando a los inversores posteriores en desventaja.

**Falta de transparencia**
Muchos proyectos no muestran con claridad qué wallets reciben tokens, qué fondos se reservan, quién puede moverlos o qué autoridades siguen activas. Las ventas no anunciadas, dev wallets ocultas y cambios de reglas destruyen confianza.

**Liquidez centralizada**
Un pool inicial controlado por una sola wallet puede dar apariencia de mercado, pero esa liquidez puede retirarse o usarse para crear presión artificial.

**Pools falsos y rutas inseguras**
En Solana cualquiera puede crear un pool con un nombre parecido. Si el mint no coincide, si la liquidez es mínima o si el LP puede retirarla sin aviso, el usuario puede acabar operando en un mercado falso o extremadamente manipulable.

**Código difícil de revisar**
Si las reglas no están documentadas, el usuario depende de promesas. Un contrato puede tener funciones admin, upgrade authority o rutas de salida que no se entienden desde la interfaz.

**Emisión poco clara**
Muchos sistemas prometen APR sin explicar de dónde salen los tokens, cuánto puede emitirse por año o qué ocurre cuando el fondo de recompensas se reduce.

**Tokenomics Insostenibles**
Muchos tokens tienen modelos de emisión que benefician a corto plazo pero crean presión de venta insostenible a largo plazo.

**Rug Pulls y Abandono**
La facilidad para crear tokens ha llevado a un aumento de proyectos fraudulentos que desaparecen después de recaudar fondos.

**Mantenimiento de la web confundido con control del protocolo**
Una interfaz puede ayudar al usuario, pero no debería ser la autoridad final. Las reglas importantes deben poder verificarse y ejecutarse on-chain incluso si la web oficial no está disponible.`,
  },
  solution: {
    title: 'La Solución Soleon',
    content: `Soleon responde con un lanzamiento más pequeño, verificable y gradual. La idea central es que la confianza no dependa de una historia bonita, sino de direcciones públicas, reglas comprobables y límites claros a lo que puede hacer el mantenedor.

**Distribución inicial gratuita**
El primer reparto no se compra. Se reclama desde el contrato de distribución inicial mediante un único Genesis Claim de 2,000 SEON por wallet elegible.

**Transparencia**
El reparto inicial separa claramente el fondo de recompensas, la vault de Genesis Claim y la asignación del desarrollador inicial. Cada dirección debe poder publicarse y seguirse en Solscan cuando exista.

**Revisión pública antes de staking**
El código de la web y del staking se abre a revisión. No existe reserva de revisión ni pago prometido por reportes. Esto no garantiza ausencia total de errores, pero evita vender una falsa sensación de seguridad y obliga a publicar reglas, direcciones y riesgos.

**Mercado DEX-first**
El objetivo inicial de mercado es un order book SEON/USDC verificable en Manifest. Los pools AMM pueden aparecer por iniciativa comunitaria, pero la web solo los enlaza después de revisar mint, DEX, liquidez y condiciones on-chain.

**Defensa frente a fakes**
La web no debe enlazar cualquier mercado que aparezca. Debe diferenciar entre mercados verificados, comunitarios, alto riesgo y fake. Un pool no es oficial solo por existir, y un enlace no debe activarse hasta que la dirección sea verificable.

**Descentralización Programática Post-Launch**
• Sin autoridad de mint.
• Sin autoridad de freeze.
• Sin autoridad de configuración de fee.
• Programa inmutable.
• Distribución de fees fijada por código: 20% quema, 1 SEON al ejecutor y resto a recompensas.

**Staking con presupuesto anual verificable**
El staking no promete APR fijo. Cada año libera un porcentaje máximo del fondo de recompensas no comprometido. Los usuarios comparten ese presupuesto proporcionalmente al principal activo.

**Inmutabilidad progresiva**
Después de la revisión, correcciones, ensayo final y publicación de direcciones, el objetivo es revocar autoridades críticas para que las reglas no dependan de decisiones privadas.`,
  },
  distribution: {
    title: 'Distribución Inicial',
    content: `**Supply total: 444,444,444 SEON**

La distribución inicial prevista para el 1 de agosto de 2026 se divide en una vault de Genesis Claim de 4,400,000 SEON y una asignación directa de 44,444 SEON al desarrollador inicial. El resto principal se reserva para staking:
• 440,000,000 SEON → fondo de recompensas de staking.
• 4,400,000 SEON → vault de Genesis Claim.
• 44,444 SEON → asignación directa del desarrollador inicial.

**Uso de la vault de 4,400,000 SEON**
• 2,200 claims completos de 2,000 SEON.
• Sin reserva de revisión, vesting ni programa de pagos prometido.

**Genesis Claim**
Cada wallet que cumpla las cinco reglas públicas de reputación puede completar un único claim de 2,000 SEON. La vault permite exactamente 2,200 claims completos y el contrato admite un máximo de 100 claims exitosos por día UTC.

Cada claim cobra 0.005 SOL de coste de protocolo, además de la comisión variable de red. Los 44,444 SEON del desarrollador se transfieren a una wallet pública y pueden mantenerse, transferirse, venderse o ponerse en staking como tokens propios.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Modelo de token**
• Red: Solana.
• Estándar: Token-2022 con TransferFee extension.
• Decimales: 9.
• Supply fijo: 444,444,444 SEON.
• Mint authority: revocada.
• Freeze authority: nula.

**Transfer fee**
El mint empieza con 0% para no bloquear el arranque del mercado. Cuando staking_open sea true, cualquiera podrá ejecutar la actualización permissionless:
• Antes de staking: 0%.
• Al abrir staking: 0.02%.
• Cada año de staking completo: +0.02%.
• Máximo: 0.4%.
• Cap por transferencia: 400 SEON.

**Distribución de fees Token-2022**
Las fees retenidas se recolectan mediante una acción pública:
• 20% → quema permanente.
• 1 SEON → incentivo fijo al ejecutor si se alcanza el mínimo.
• Resto → fondo de recompensas de staking.

La acción requiere al menos 200 SEON acumulados para distribuir. Hay cooldown global y por wallet para evitar ejecución excesiva.

**Fee de mantenimiento de interfaz**
Además de la transfer fee del token:
• El claim de distribución inicial cobra 0.005 SOL.
• Algunas acciones de staking cobran 0.0005 SOL:
• claim_rewards de staking.
• unstake_expired de staking.

Esta fee va a una wallet pública de mantenimiento. No cambia supply, no cambia APR, no concede control sobre el protocolo y no se cobra en renovación.`,
  },
  staking: {
    title: 'Sistema de Staking',
    content: `Staking se despliega y abre en la fecha más tardía entre el **1 de septiembre de 2026** y la finalización completa de Genesis Claim, siempre que el rehearsal sea correcto.

**Regla base**
• Lock único obligatorio: 7 días.
• Periodo de gracia: 3 días.
• Durante el lock: se puede hacer claim de rewards positivos.
• Durante la gracia: se puede reclamar, renovar o retirar.
• Después de la gracia: no se puede hacer claim separado; se puede renovar o retirar.

**Presupuesto anual**
El contrato libera un presupuesto máximo por año desde el fondo de recompensas no comprometido. Ese porcentaje se aplica sobre lo que va quedando cada año en el fondo de recompensas, no sobre el supply total ni sobre una cantidad fija. Empieza en 1.0%, sube 0.5 puntos porcentuales por año y puede llegar al 100% en el largo plazo.

Tabla orientativa:
Año | Presupuesto máximo anual sobre fondo de recompensas no comprometido
1   | 1.0%
2   | 1.5%
3   | 2.0%
5   | 3.0%
10  | 5.5%
20  | 10.5%
50  | 25.5%
100 | 50.5%
199 | 100.0%

Esto no es un APR garantizado. El reward efectivo depende de cuántos SEON estén en staking, cuánto tiempo permanezcan activos y cuánto presupuesto anual quede disponible.

**Cálculo proporcional**
Las posiciones comparten rewards según principal activo. Conceptualmente:
reward_usuario = presupuesto_acumulado × principal_usuario / total_staked

El contrato usa acumuladores globales para que cada posición pueda calcular lo que le corresponde sin recorrer todas las wallets.

**Renovación y consolidación**
Si el usuario renueva puntualmente, se crea una nueva posición con principal + rewards. No se aplica redistribución sobre esos rewards porque siguen dentro del staking.

Cada renovación puntual reduce la redistribución futura de claims:
• Inicial: 10%.
• Cada renovación puntual: -0.5 puntos.
• Después de 20 renovaciones puntuales: 0%.

Si el usuario hace claim, se aplica el porcentaje vigente a los rewards reclamados y esa parte vuelve al fondo de recompensas. Si retira, el principal vuelve al usuario y la redistribución se aplica solo sobre rewards, nunca sobre principal.

**Después de la gracia**
Si una posición supera 7 días + 3 días de gracia:
• El propietario puede renovar o retirar.
• Cualquiera puede cerrar posiciones fuera de gracia mediante limpieza pública.
• Si hay renovación tardía, se aplica 10% sobre rewards y se reinicia la consolidación.
• El principal y los rewards netos siempre vuelven al propietario.`,
  },
  markets: {
    title: 'Mercados DEX-first y Liquidez Comunitaria',
    content: `Soleon no nace con una preventa ni con financiación recaudada para crear un pool inicial. Por eso no habrá un pool AMM oficial inicial controlado por el proyecto. Esta decisión evita una señal falsa de liquidez y reduce el riesgo de que una sola wallet parezca representar al mercado.

**Order book como primer objetivo**
El objetivo inicial es un mercado SEON/USDC tipo order book en Manifest, si el mercado queda publicado y verificable. Un order book funciona de forma parecida a un exchange tradicional: compradores y vendedores ponen órdenes con precio y cantidad. La diferencia es que la ejecución es DEX, on-chain y sin custodia de Soleon.

**Por qué DEX-first**
• No requiere que un CEX acepte listar SEON.
• No obliga al proyecto a custodiar fondos de usuarios.
• Permite que el precio se forme por órdenes visibles.
• Encaja mejor con un token que busca reglas públicas e inmutabilidad.

**Pools AMM comunitarios**
La comunidad puede crear pools en Raydium, Orca, Meteora u otros DEX compatibles. Esos pools no serán oficiales por defecto. La web podrá mostrarlos si se revisa:
• que usan el mint SEON correcto,
• que el DEX y el par son claros,
• que la liquidez es visible,
• que se indica si el LP está bloqueado, quemado, en multisig o libremente retirable,
• que no hay señales de mint falso, ruta sospechosa o liquidez engañosa.

**Por qué no crear un pool inicial pequeño**
Un pool con muy poca liquidez puede dar una imagen peor que no tener pool: puede sufrir slippage extremo, manipulación fácil y confusión sobre el precio real. Soleon prefiere declarar que el mercado debe formarse orgánicamente antes que simular profundidad.

**Rol de la web**
La web no opera como exchange, no fija precio y no custodia fondos. Su función es publicar direcciones, explicar riesgos, enlazar mercados verificados y ayudar a distinguir entre liquidez útil, liquidez débil y pools fake.`,
  },
  technical: {
    title: 'Especificaciones Técnicas',
    content: `**Programas**
• commitment_claim: distribución inicial gratuita.
• staking_program: staking, rewards, renovación, retirada, fee collection y cleanup.

**Cuentas principales**
• reward_vault: reserva finita para staking.
• staking_vault: mantiene principal bloqueado.
• soleon_fee_vault: cuenta técnica para distribución de fees.
• commitment_claim_vault: vault de claims automáticos.
• maintenance_fee_receiver: wallet pública que recibe fees SOL de mantenimiento.

**Instrucciones principales del staking**
• initialize: crea configuración, vaults y parámetros base.
• open_staking: abre staking y permite activar la primera transfer fee.
• stake: crea posición con lock de 7 días.
• claim_rewards: reclama rewards positivos y cobra 0.0005 SOL.
• renew_expired_position: compone principal + rewards en nueva posición.
• unstake_expired: cierra posición y devuelve principal + rewards netos.
• update_transfer_fee: actualización permissionless anual.
• withdraw_and_distribute_from_mint: recolecta y distribuye fees Token-2022.
• cleanup_expired_positions: cierra por lotes posiciones fuera de gracia.

**Mercados**
• Objetivo inicial: Manifest order book SEON/USDC.
• Pools AMM: comunitarios, no oficiales por defecto.
• La web solo enlaza mercados/pools después de revisar que usan el mint SEON correcto.
• No hay custodia: cada usuario firma desde su wallet en interfaces DEX externas.

**Mantenimiento**
La web oficial es una capa de conveniencia. Debe mantener dominios, RPC, documentación, enlaces DEX, wallet adapters y releases, pero no puede cambiar las reglas on-chain cuando el protocolo quede inmutable.`,
  },
  security: {
    title: 'Seguridad, Autoridades e Inmutabilidad',
    content: `**Principios**
• No hay ruta admin para retirar principal de usuarios.
• No hay mint adicional después de revocar mint authority.
• No hay freeze authority.
• Las reglas de fees y rewards viven en el programa.
• Las acciones críticas de mantenimiento son permissionless.

**Revisión pública**
Durante julio y agosto de 2026 se abre revisión pública del código de la web y del staking. Los reportes deben incluir:
• pasos para reproducir,
• impacto,
• wallet,
• evidencias,
• explicación clara del riesgo.

No existe reserva de revisión ni programa de pagos prometido por reportes. La revisión pública reduce riesgo, pero no garantiza ausencia total de errores.

**Autoridades temporales**
Antes de la inmutabilidad puede existir autoridad temporal para desplegar, corregir y abrir staking. Esa autoridad debe estar documentada, limitada y revocarse cuando las reglas queden cerradas.

**Estado final buscado**
• Mint authority: null.
• Freeze authority: null.
• Program upgrade authority: revocada.
• Transfer fee config authority: controlada solo por reglas del programa o revocada según diseño final.
• Withdraw withheld authority: PDA del programa para distribución fija.

En el estado final, el usuario debe poder verificar mint, program IDs, vaults, autoridades y reglas desde exploradores y código público.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**1 de agosto de 2026: lanzamiento inicial**
• Crear mint SEON Token-2022.
• Publicar el código de commitment_claim y staking.
• Desplegar commitment_claim.
• Publicar direcciones principales.
• Financiar el fondo de recompensas con 440,000,000 SEON.
• Financiar la vault de Genesis Claim con 4,400,000 SEON.
• Abrir claims gratuitos.
• Abrir canal de reportes cuando esté definido.

**Agosto de 2026: Genesis Claim y código público**
• Publicar código de la web y del staking.
• Recibir reportes reproducibles.
• Clasificar hallazgos.
• Corregir problemas confirmados.
• Actualizar documentación y direcciones.
• Preparar rehearsal final.

**1 de septiembre de 2026 o después: inicio previsto de staking**
• Esperar hasta que Genesis Claim haya finalizado por completo.
• Desplegar y abrir staking cuando se cumplan ambas condiciones y el rehearsal final sea correcto.
• Abrir staking_open.
• Activar primera transfer fee de 0.02% mediante acción permissionless.
• Permitir stake, claim, renovación, unstake y cleanup.

**Después**
• Publicar mercados DEX verificables cuando existan.
• Mantener documentación y enlaces.
• Seguir recolectando fees Token-2022 hacia fondo de recompensas y burn.
• Avanzar hacia revocación de autoridades críticas e inmutabilidad.`,
  },
  conclusion: {
    title: 'Conclusión',
    content: `Soleon no intenta empezar con una gran venta ni con una liquidez artificial controlada por el creador. Empieza pequeño: un token fijo, una distribución inicial verificable, revisión pública, staking con presupuesto finito y mercado DEX-first.

**Lo que Soleon sí intenta hacer**
• Poner reglas claras on-chain.
• Hacer visible la distribución inicial.
• Separar interfaz web de autoridad del protocolo.
• Usar transfer fees para quemar parte del supply y rellenar rewards.
• Permitir que staking y mantenimiento funcionen sin decisiones privadas constantes.

**Lo que Soleon no promete**
• No promete precio.
• No promete liquidez inmediata.
• No promete APR económico garantizado.
• No promete listing en CEX.
• No promete que la revisión pública encuentre todos los errores.

SEON puede no tener mercado o puede valer cero. El proyecto solo puede ofrecer reglas públicas, documentación, código revisable y una estructura que reduzca dependencias centralizadas. La decisión final la toma el mercado y la comunidad.`,
  },
};

const whitepaperContentEn = {
  introduction: {
    title: 'Introduction',
    content: `Soleon represents a Solana token launch model based on transparency, public distribution and verifiable on-chain rules. Its goal is not to promise returns, but to build a structure where anyone can review how the token starts, where the funds are, what can change and what should become immutable.

Crypto markets have seen too many launches with private presales, hidden wallets, fake pools, liquidity controlled by a few actors and promises that cannot be verified. Soleon starts from the need for a different model: small at first, public from day one and designed to reduce dependence on private decisions.

The planned initial launch is **August 1, 2026**. That day publishes the Token-2022 SEON mint, deploys and opens commitment_claim, and publishes the commitment_claim and staking source code. Staking is deployed and opened on the later of **September 1, 2026** and full Genesis Claim completion, provided the rehearsal passes.

The current design avoids three common dependencies:
• No presale, ICO or temporary pretoken.
• No creator-controlled initial AMM pool.
• No promise of a CEX listing or official price.

Soleon starts with a clear philosophy:
• Transparency is fundamental: relevant funds should be public and verifiable.
• Initial distribution is not bought: it is claimed through Genesis Claim if the wallet satisfies public Solana reputation rules.
• Decentralization is a technical target, not a slogan.
• The website helps use the protocol, but should not be the protocol authority.
• Markets should form in a DEX-first, public and verifiable way.
• Public review is part of launch, not a later decoration.

SEON is first distributed through an on-chain Genesis Claim: one 2,000 SEON claim per eligible wallet, with both the wallet signature and a server-side eligibility signature. Later, if public review and the final rehearsal are correct, staking is deployed and opened with a fixed 7-day lock, proportional rewards and permissionless maintenance.`,
  },
  problem: {
    title: 'The Problem',
    content: `Many token launches fail because of repeated problems:

**Unfair Presales**
Traditional presales create an unfair advantage for early investors who can buy at significantly lower prices, leaving later investors at a disadvantage.

**Lack of transparency**
Many projects do not clearly show which wallets receive tokens, which funds are reserved, who can move them or which authorities remain active. Unannounced sales, hidden dev wallets and rule changes destroy trust.

**Centralized liquidity**
An initial pool controlled by one wallet can look like a market, but that liquidity can be removed or used to create artificial pressure.

**Fake pools and unsafe routes**
On Solana, anyone can create a pool with a similar name. If the mint does not match, liquidity is tiny or LP can be removed without warning, users may trade in a fake or extremely manipulable market.

**Code that is hard to review**
If rules are not documented, users depend on promises. A contract may include admin functions, upgrade authority or exit paths that are not clear from the interface.

**Unclear emission**
Many systems promise APR without explaining where tokens come from, how much can be emitted each year or what happens when the reward fund decreases.

**Unsustainable Tokenomics**
Many tokens have emission models that benefit the short term but create unsustainable sell pressure over the long term.

**Rug Pulls and Abandonment**
The ease of creating tokens has led to an increase in fraudulent projects that disappear after raising funds.

**Website maintenance confused with protocol control**
An interface can help users, but it should not be the final authority. Important rules should remain verifiable and callable on-chain even if the official website is unavailable.`,
  },
  solution: {
    title: 'The Soleon Solution',
    content: `Soleon answers with a smaller, verifiable and gradual launch. The core idea is that trust should not depend on a good story, but on public addresses, checkable rules and clear limits on what the maintainer can do.

**Free initial distribution**
The first allocation is not purchased. It is claimed through the initial distribution contract as one 2,000 SEON Genesis Claim per eligible wallet.

**Transparency**
The initial allocation clearly separates the reward fund, Genesis Claim vault and initial developer allocation. Each address should be publishable and trackable on Solscan when it exists.

**Public review before staking**
The website and staking source code are opened for review. There is no review reserve and no promised payout for reports. This does not guarantee that every issue is absent, but it avoids selling a false sense of security and requires rules, addresses and risks to be published.

**DEX-first market**
The initial market target is a verifiable SEON/USDC order book on Manifest. AMM pools may appear through community initiative, but the website only links them after checking mint, DEX, liquidity and on-chain conditions.

**Defense against fakes**
The website should not link every market that appears. It should distinguish verified, community, high-risk and fake markets. A pool is not official just because it exists, and a link should not activate until the address is verifiable.

**Programmatic Decentralization Post-Launch**
• No mint authority.
• No freeze authority.
• No fee configuration authority.
• Immutable program.
• Fee distribution fixed by code: 20% burn, 1 SEON to the caller and the rest to rewards.

**Staking with a verifiable annual budget**
Staking does not promise a fixed APR. Each year releases a maximum percentage of the uncommitted reward fund. Users share that budget proportionally to active principal.

**Progressive immutability**
After review, fixes, final rehearsal and publication of addresses, the goal is to revoke critical authorities so the rules do not depend on private decisions.`,
  },
  distribution: {
    title: 'Initial Distribution',
    content: `**Total supply: 444,444,444 SEON**

The initial distribution planned for August 1, 2026 is split into a 4,400,000 SEON Genesis Claim vault and a direct 44,444 SEON allocation to the initial developer. The main remainder is reserved for staking:
• 440,000,000 SEON → staking reward vault.
• 4,400,000 SEON → Genesis Claim vault.
• 44,444 SEON → direct initial developer allocation.

**Use of the 4,400,000 SEON vault**
• 2,200 complete claims of 2,000 SEON.
• No review reserve, vesting, or promised report payout program.

**Genesis Claim**
Each wallet that satisfies all five public reputation rules can complete one 2,000 SEON claim. The vault supports exactly 2,200 full claims and the contract accepts at most 100 successful claims per UTC day.

Each claim charges a 0.005 SOL protocol cost plus the variable network fee. The developer's 44,444 SEON are transferred to a public wallet and may be held, transferred, sold or staked as personally owned tokens.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Token model**
• Network: Solana.
• Standard: Token-2022 with TransferFee extension.
• Decimals: 9.
• Fixed supply: 444,444,444 SEON.
• Mint authority: revoked.
• Freeze authority: null.

**Transfer fee**
The mint starts at 0% to avoid blocking early market formation. When staking_open is true, anyone may execute the permissionless update:
• Before staking: 0%.
• At staking opening: 0.02%.
• Each completed staking year: +0.02%.
• Maximum: 0.4%.
• Cap per transfer: 400 SEON.

**Token-2022 fee distribution**
Withheld fees are collected through a public action:
• 20% → permanent burn.
• 1 SEON → fixed caller incentive if the threshold is reached.
• Rest → staking reward vault.

The action requires at least 200 SEON accumulated to distribute. Global and per-wallet cooldowns prevent excessive execution.

**Interface maintenance fee**
Separate from the token transfer fee:
• The initial distribution claim charges 0.005 SOL.
• Some staking actions charge 0.0005 SOL:
• staking claim_rewards.
• staking unstake_expired.

This fee goes to a public maintenance wallet. It does not change supply, does not change APR, does not grant protocol control and is not charged on renew.`,
  },
  staking: {
    title: 'Staking System',
    content: `Staking is deployed and opened on the later of **September 1, 2026** and full Genesis Claim completion, provided the rehearsal passes.

**Base rule**
• Single mandatory lock: 7 days.
• Grace period: 3 days.
• During lock: positive rewards can be claimed.
• During grace: claim, renew or unstake are available.
• After grace: separate claim is disabled; renew or unstake remain available.

**Annual budget**
The contract releases a maximum annual budget from the uncommitted reward fund. That percentage applies to what remains in the reward fund each year, not to total supply and not to a fixed amount. It starts at 1.0%, rises by 0.5 percentage points per year and may reach 100% in the long term.

Indicative table:
Year | Maximum annual budget over uncommitted reward fund
1    | 1.0%
2    | 1.5%
3    | 2.0%
5    | 3.0%
10   | 5.5%
20   | 10.5%
50   | 25.5%
100  | 50.5%
199  | 100.0%

This is not a guaranteed APR. Effective rewards depend on how many SEON are staked, how long they remain active and how much annual budget remains available.

**Proportional calculation**
Positions share rewards by active principal. Conceptually:
user_reward = accrued_budget × user_principal / total_staked

The contract uses global accumulators so each position can calculate its share without iterating over all wallets.

**Renew and consolidation**
If the user renews on time, a new position is created with principal + rewards. No redistribution is applied to those rewards because they stay in staking.

Each on-time renew reduces future claim redistribution:
• Initial: 10%.
• Each on-time renew: -0.5 percentage points.
• After 20 on-time renews: 0%.

If the user claims, the current percentage is applied to claimed rewards and that part returns to the reward vault. If the user unstakes, principal returns to the user and redistribution applies only to rewards, never principal.

**After grace**
If a position passes 7 days + 3 days grace:
• The owner can renew or unstake.
• Anyone can close post-grace positions through public cleanup.
• A late renew applies 10% on rewards and resets consolidation.
• Principal and net rewards always return to the owner.`,
  },
  markets: {
    title: 'DEX-first Markets and Community Liquidity',
    content: `Soleon does not start with a presale or with raised funding to create an initial pool. For that reason, there will be no official initial AMM pool controlled by the project. This avoids a false liquidity signal and reduces the risk that a single wallet appears to represent the market.

**Order book as the first target**
The initial target is an SEON/USDC order-book market on Manifest, if the market is published and verifiable. An order book works similarly to a traditional exchange: buyers and sellers place orders with price and amount. The difference is that execution is DEX, on-chain and without Soleon custody.

**Why DEX-first**
• It does not require a CEX to agree to list SEON.
• It does not require the project to custody user funds.
• It lets price form from visible orders.
• It better fits a token that seeks public rules and immutability.

**Community AMM pools**
The community may create pools on Raydium, Orca, Meteora or other compatible DEXs. Those pools are not official by default. The website may display them if it reviews:
• they use the correct SEON mint,
• the DEX and pair are clear,
• liquidity is visible,
• it states whether LP is locked, burned, multisig-controlled or freely removable,
• there are no signs of a fake mint, suspicious route or misleading liquidity.

**Why not create a tiny initial pool**
A pool with very little liquidity can be worse than no pool: it can suffer extreme slippage, easy manipulation and confusion around the real price. Soleon prefers to declare that the market must form organically rather than simulate depth.

**Role of the website**
The website does not operate as an exchange, set price or custody funds. Its role is to publish addresses, explain risks, link verified markets and help distinguish useful liquidity, weak liquidity and fake pools.`,
  },
  technical: {
    title: 'Technical Specifications',
    content: `**Programs**
• commitment_claim: free initial distribution.
• staking_program: staking, rewards, renew, unstake, fee collection and cleanup.

**Main accounts**
• reward_vault: finite staking reserve.
• staking_vault: holds locked principal.
• soleon_fee_vault: technical account for fee distribution.
• commitment_claim_vault: automatic claim vault.
• maintenance_fee_receiver: public wallet receiving SOL maintenance fees.

**Main staking instructions**
• initialize: creates config, vaults and base parameters.
• open_staking: opens staking and enables the first transfer-fee update.
• stake: creates a 7-day lock position.
• claim_rewards: claims positive rewards and charges 0.0005 SOL.
• renew_expired_position: compounds principal + rewards into a new position.
• unstake_expired: closes position and returns principal + net rewards.
• update_transfer_fee: annual permissionless update.
• withdraw_and_distribute_from_mint: collects and distributes Token-2022 fees.
• cleanup_expired_positions: batch-closes post-grace positions.

**Markets**
• Initial target: Manifest SEON/USDC order book.
• AMM pools: community-created, not official by default.
• The website only links markets/pools after checking they use the correct SEON mint.
• No custody: each user signs from their own wallet using external DEX interfaces.

**Maintenance**
The official website is a convenience layer. It maintains domains, RPC, documentation, DEX links, wallet adapters and releases, but it cannot change on-chain rules once the protocol is immutable.`,
  },
  security: {
    title: 'Security, Authorities and Immutability',
    content: `**Principles**
• No admin path to withdraw user principal.
• No additional mint after mint authority revocation.
• No freeze authority.
• Fee and reward rules live in the program.
• Critical maintenance actions are permissionless.

**Public review**
During July and August 2026, the website and staking code are opened for public review. Reports must include:
• reproduction steps,
• impact,
• wallet,
• evidence,
• clear explanation of risk.

There is no review reserve and no promised payout program for reports. Public review reduces risk, but it does not guarantee every issue is absent.

**Temporary authorities**
Before immutability, temporary authority may exist to deploy, fix and open staking. That authority must be documented, limited and revoked once rules are closed.

**Target final state**
• Mint authority: null.
• Freeze authority: null.
• Program upgrade authority: revoked.
• Transfer fee config authority: controlled only by program rules or revoked according to final design.
• Withdraw withheld authority: program PDA for fixed distribution.

In the final state, users should be able to verify mint, program IDs, vaults, authorities and rules from explorers and public code.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**August 1, 2026: initial launch**
• Create SEON Token-2022 mint.
• Publish the commitment_claim and staking source code.
• Deploy commitment_claim.
• Publish main addresses.
• Fund reward vault with 440,000,000 SEON.
• Fund the Genesis Claim vault with 4,400,000 SEON.
• Open free claims.
• Open report channel when defined.

**August 2026: Genesis Claim and public code**
• Publish website and staking source code.
• Receive reproducible reports.
• Classify findings.
• Fix confirmed issues.
• Update documentation and addresses.
• Prepare final rehearsal.

**September 1, 2026 or later: planned staking opening**
• Wait until Genesis Claim has fully completed.
• Deploy and open staking once both conditions are met and the final rehearsal passes.
• Open staking_open.
• Activate first 0.02% transfer fee through permissionless action.
• Enable stake, claim, renew, unstake and cleanup.

**Afterwards**
• Publish verifiable DEX markets when they exist.
• Maintain documentation and links.
• Continue collecting Token-2022 fees toward reward vault and burn.
• Move toward revocation of critical authorities and immutability.`,
  },
  conclusion: {
    title: 'Conclusion',
    content: `Soleon does not try to start with a large sale or artificial liquidity controlled by the creator. It starts small: a fixed token, a verifiable initial distribution, public review, staking with a finite budget and DEX-first markets.

**What Soleon tries to do**
• Put clear rules on-chain.
• Make the initial distribution visible.
• Separate website interface from protocol authority.
• Use transfer fees to burn part of supply and refill rewards.
• Allow staking and maintenance to work without constant private decisions.

**What Soleon does not promise**
• It does not promise price.
• It does not promise immediate liquidity.
• It does not promise guaranteed economic APR.
• It does not promise CEX listing.
• It does not promise public review will find every issue.

SEON may have no market or may be worth zero. The project can only offer public rules, documentation, reviewable code and a structure that reduces centralized dependencies. The final decision belongs to the market and the community.`,
  },
};

export function WhitepaperContent() {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const t = useTranslations('whitepaper');
  const locale = useLocale();
  const isEn = locale === 'en';
  const sections = isEn ? sectionsEn : sectionsEs;
  const whitepaperContent = isEn ? whitepaperContentEn : whitepaperContentEs;
  const whitepaperPdfHref = isEn ? '/whitepaper-en.pdf' : '/whitepaper-es.pdf';
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
          <Button
            asChild
            className="mt-6 bg-gradient-gold text-primary-foreground hover:opacity-90"
          >
            <a href={whitepaperPdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 h-4 w-4" />
              {t('downloadPdf')}
            </a>
          </Button>
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
                    {activeSection === section.id && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
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
                    <h2 className="text-2xl font-bold text-foreground">
                      {activeContent.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Soleon Whitepaper v1.0 - Token-2022
                    </p>
                  </div>
                </div>

                <div className="prose prose-invert max-w-none">
                  {activeContent.content
                    .split('\n\n')
                    .map((paragraph, index) => (
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
