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

El calendario operativo actualizado separa el mint, la distribución y la apertura del staking. El mint SEON Token-2022 está previsto para el **24 de agosto de 2026**, después del rehearsal completo. El staking y la primera ola de la distribución Genesis están previstos para el **31 de agosto de 2026**. Las diez olas semanales terminan el **2 de noviembre de 2026**, siempre que las comprobaciones técnicas de cada fase sean correctas.

El diseño actual evita tres dependencias habituales:
• No hay preventa, ICO ni pretoken temporal.
• No hay pool AMM inicial controlado por el creador.
• No hay promesa de listing en CEX ni precio oficial.

Soleon nace con una filosofía clara:
• La transparencia es fundamental: los fondos relevantes deben ser públicos y verificables.
• La distribución inicial no se compra: se envía directamente a 440 wallets independientes seleccionadas mediante reglas públicas, snapshot y aleatoriedad verificable.
• La descentralización es un objetivo técnico progresivo, no un eslogan ni una afirmación de descentralización total mientras existan autoridades temporales y tareas operativas.
• La web ayuda a usar el protocolo, pero no debe ser la autoridad del protocolo.
• Los mercados deben formarse de manera DEX-first, pública y verificable.
• La revisión pública es parte del lanzamiento, no un adorno posterior.

SEON se distribuye primero mediante un Genesis Airdrop directo: 4,400,000 SEON repartidos en diez olas semanales de 44 wallets, con 10,000 SEON por wallet. No hay claim, firma de elegibilidad, conexión obligatoria a la web ni fee de distribución. Después del ensayo final se abre staking con lock fijo de 7 días, rewards proporcionales y mantenimiento permissionless. La autoridad de actualización del programa se conserva únicamente durante las diez olas para corregir errores confirmados y documentados públicamente; después de la verificación final, el objetivo es revocarla y dejar el staking inmutable.`,
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

**Distribución inicial gratuita y directa**
El primer reparto no se compra ni se reclama. Los 4,400,000 SEON de Genesis se envían directamente a 440 wallets independientes en diez olas semanales. Cada wallet recibe 10,000 SEON sin conectar su wallet a la web, firmar un mensaje, pagar una fee de protocolo ni confiar en un servidor de elegibilidad.

**Selección pública y reproducible**
Las wallets candidatas proceden de actividad verificable en protocolos conocidos del ecosistema Solana. Antes de la primera ola se publican las reglas, el slot del snapshot, las exclusiones, los hashes de los datos y el método de aleatoriedad. La lista final queda cerrada antes de la Ola 1 y cada ola publica wallets, ATAs, transacciones, errores y reintentos.

**Transparencia de fondos y funciones**
La asignación inicial separa claramente el fondo de recompensas, la Genesis Distribution Wallet y la asignación del desarrollador. La Maintenance Wallet es una cuenta operativa financiada en SOL por las fees de determinadas acciones, no una asignación del supply de SEON. Cada dirección, balance y función debe poder seguirse en exploradores cuando exista.

**Revisión pública antes y durante el lanzamiento**
El código de la web, del staking y de los scripts de distribución se abre a revisión. No existe reserva de revisión ni pago prometido por reportes. Esto no garantiza ausencia total de errores, pero evita vender una falsa sensación de seguridad y obliga a publicar reglas, direcciones y riesgos.

**Mercado DEX-first sin liquidez oficial**
El primer mercado que puede publicarse es un order book SEON/USDC verificable en Manifest. Puede comenzar completamente vacío: Soleon no reserva tokens para mercado, no coloca órdenes iniciales mediante wallets controladas y no promete precio, volumen, profundidad ni liquidez. Toda actividad debe proceder de participantes independientes.

**Defensa frente a fakes**
La web no debe enlazar cualquier mercado que aparezca. Debe diferenciar entre mercados verificados, comunitarios, alto riesgo y fake. Un pool no es oficial solo por existir, y un enlace no debe activarse hasta que la dirección sea verificable.

**Descentralización programática y progresiva**
• Mint authority revocada después de crear y asignar el supply completo.
• Freeze authority nula.
• Configuración de transfer fee controlada por las reglas del programa y su PDA.
• Programa de staking inmutable después de las diez olas, la verificación final y las correcciones públicas necesarias.
• Distribución de fees fijada por código: 20% quema, 1 SEON al ejecutor y resto a recompensas.

**Staking con presupuesto anual verificable**
El staking no promete APR fijo. Cada año libera un porcentaje máximo del fondo de recompensas no comprometido. Los usuarios comparten ese presupuesto proporcionalmente al principal activo.

**Inmutabilidad sin ocultar la operación humana**
Soleon distingue el protocolo de sus capas operativas. El staking puede quedar inmutable y las acciones críticas pueden ser permissionless, mientras que la web, la documentación y la Maintenance Wallet requieren mantenimiento humano identificable públicamente como Soleon Maintainer. Por ello, durante esta fase se habla de descentralización progresiva y verificable, no de descentralización total.`,
  },
  distribution: {
    title: 'Distribución Inicial',
    content: `**Supply total: 444,444,444 SEON**

El supply completo se crea una sola vez y se separa en tres asignaciones públicas:
• 440,000,000 SEON → fondo de recompensas de staking.
• 4,400,000 SEON → Genesis Distribution Wallet.
• 44,444 SEON → Developer Wallet.

**Genesis Airdrop**
Los 4,400,000 SEON de Genesis se reparten entre 440 wallets independientes:
• 10,000 SEON por wallet.
• 44 wallets por ola.
• 440,000 SEON por ola.
• Diez olas semanales desde el 31 de agosto hasta el 2 de noviembre de 2026.

No existe contrato Genesis, claim, firma server-side, conexión obligatoria a la web ni fee de distribución. La Genesis Distribution Wallet crea el ATA Token-2022 del destinatario cuando sea necesario y realiza una transferencia directa comprobable on-chain.

**Selección verificable**
Antes de la Ola 1 se construye un conjunto de 10,000 candidatos procedentes de actividad reciente en Jupiter, Raydium, Orca, Meteora, Kamino, Marinade/Jito y Drift. Las reglas exigen historial Solana real, actividad en diferentes días y meses, interacción reciente con protocolos conocidos y un balance de snapshot entre 0.05 y 500 SOL. Se excluyen programas, PDAs, exchanges, bots evidentes, wallets controladas por Soleon, duplicados y direcciones de infraestructura identificables.

El slot del snapshot, la allowlist definitiva de programas, los hashes de entrada, la semilla pública derivada de un bloque futuro y el algoritmo de selección se publican para que la elección de las 440 wallets pueda reproducirse. La lista completa se fija antes de la primera ola y se divide determinísticamente en diez grupos de 44. Cada informe semanal muestra el resultado de cada transferencia y permite reintentos idempotentes sin duplicar pagos.

**Developer Wallet**
La Developer Wallet recibe 44,444 SEON como asignación personal pública del desarrollador. Puede mantenerlos, transferirlos, venderlos o ponerlos en staking como tokens propios. No se utiliza para colocar órdenes iniciales ni se presenta como fuente de liquidez del protocolo. Cualquier uso posterior será una actuación personal, pública y verificable on-chain, no una venta Genesis ni liquidez oficial de Soleon.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Modelo de token**
• Red: Solana.
• Estándar: Token-2022 con TransferFee extension.
• Decimales: 9.
• Supply fijo: 444,444,444 SEON.
• Mint authority: revocada después de crear y asignar el supply completo.
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
• La distribución Genesis directa no cobra fee de protocolo al destinatario.
• Algunas acciones de staking cobran 0.0005 SOL:
• claim_rewards de staking.
• unstake_expired de staking.

Esta fee va a una Maintenance Wallet pública y separada de la Developer Wallet y de la Genesis Distribution Wallet. Puede cubrir dominio, RPC, web, informes y otros costes operativos verificables. No cambia supply, no cambia APR, no concede control sobre el protocolo y no se cobra en renovación.`,
  },
  staking: {
    title: 'Sistema de Staking',
    content: `Staking se despliega y abre el **31 de agosto de 2026**, junto con la Ola 1, siempre que el rehearsal final sea correcto. La upgrade authority se conserva durante las diez olas únicamente para corregir bugs confirmados, reproducibles y documentados públicamente. Después de la Ola 10, de la verificación acumulada y de cualquier corrección necesaria, el objetivo es revocarla y dejar el programa inmutable.

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
    title: 'Mercados DEX-first y Participación Independiente',
    content: `Soleon no nace con una preventa ni con capital recaudado para sostener liquidez inicial. Tampoco reserva SEON para operar el mercado. El precio, el volumen y la profundidad solo pueden existir cuando participantes independientes deciden colocar órdenes y ejecutarlas bajo su propio riesgo.

**Order book como primer mercado verificable**
El primer mercado que la web puede publicar es un order book SEON/USDC en Manifest, siempre que su dirección, mints y configuración hayan sido comprobados. Un order book permite que compradores y vendedores publiquen precio y cantidad. La ejecución se realiza mediante el DEX, on-chain y sin custodia de Soleon sobre los fondos de terceros.

La publicación de una dirección verificada no significa que exista liquidez. El mercado puede empezar sin bids, asks, trades ni precio. Ese estado vacío es válido y se muestra como tal: crear técnicamente un mercado no crea demanda económica.

**Formación independiente del precio**
• Soleon no fija un precio inicial ni una capitalización.
• Las wallets controladas por Soleon no colocan bids o asks iniciales.
• No se fabrica volumen mediante self-trading, wallets relacionadas u operaciones circulares.
• Una orden aislada o una operación mínima no demuestra profundidad ni una valoración sostenible.
• Si no existe una contraparte independiente, la liquidez y el volumen reales son cero.
• Cada participante decide sus límites, cantidades y riesgos desde una interfaz DEX externa.

Cuando dos participantes independientes aceptan intercambiar SEON y USDC aparece un precio negociado. Ese precio puede cambiar rápidamente, puede tener un spread amplio y puede no permitir vender cantidades relevantes. Soleon no interviene para sostenerlo, dirigirlo o prometer continuidad.

**Developer Wallet y actividad posterior**
La asignación pública del desarrollador es de 44,444 SEON. No se utiliza para sembrar órdenes en el lanzamiento ni se presenta como demanda, market making o liquidez del protocolo.

Como cualquier titular, el desarrollador puede más adelante mantener, poner en staking, transferir, comprar o vender sus tokens por decisión propia. Cualquier acción será visible on-chain y asumirá el riesgo económico normal de mercado. No forma parte del Genesis Airdrop, no altera sus reglas y no convierte una operación personal en una venta oficial de Soleon.

**Sin liquidez oficial prometida**
Soleon no promete, financia, programa ni gobierna un pool oficial. Tampoco abre una votación de pool, solicita compromisos de liquidez o recoge fondos para crearlo. No existe una fecha en la que deba aparecer un pool ni un umbral que obligue al protocolo a organizarlo.

Esta decisión evita presentar activos controlados por el mantenedor como demanda comunitaria, reduce las funciones financieras centralizadas y mantiene separadas la distribución Genesis, la asignación del desarrollador y el mantenimiento técnico.

**Pools creados por terceros**
Cualquier usuario o grupo puede crear por su cuenta un pool en Raydium, Orca, Meteora u otro DEX compatible y aportar su propia liquidez. Esa acción es independiente:
• no está dirigida ni garantizada por Soleon,
• no recibe una designación oficial por usar el nombre SEON,
• no obliga a otros holders a participar,
• no promete rentabilidad ni protección frente a impermanent loss,
• no concede control sobre el token o el staking.

La web puede mostrar un pool comunitario después de verificar su dirección y dejar clara su naturaleza independiente. Publicarlo como referencia no implica respaldo económico, auditoría del DEX ni garantía sobre su liquidez.

**Mercados falsos y comprobaciones**
En Solana cualquiera puede crear un token, mercado o pool con un nombre parecido. Antes de publicar un enlace, la web comprueba:
• que se usa el mint SEON correcto,
• que los dos activos y la dirección del mercado coinciden,
• que el DEX y el tipo de mercado se identifican con claridad,
• que la liquidez y el volumen mostrados proceden de datos on-chain,
• que cualquier control o posibilidad de retirar liquidez se explica cuando pueda verificarse,
• que no hay señales evidentes de mint falso, ruta sospechosa o presentación engañosa.

Los usuarios deben comprobar siempre el mint y las direcciones. Una etiqueta de mercado verificado solo confirma identidad y configuración observables; no elimina riesgo de precio, slippage, contratos externos o pérdida.

**Por qué este modelo**
• No depende de que un CEX acepte listar SEON.
• No requiere custodiar fondos de usuarios.
• No necesita una venta inicial para crear holders.
• No confunde inventario del creador con liquidez comunitaria.
• Permite que la actividad real sea visible, incluso cuando sea cero.
• Reduce una función operativa y financiera que habría permanecido bajo control del mantenedor.

**Rol de la web**
La web no opera como exchange, no custodia fondos, no coloca órdenes y no fija precio. Su función es publicar el mint y las direcciones verificadas, explicar riesgos, enlazar interfaces externas y distinguir mercados correctos de rutas falsas o engañosas.`,
  },
  technical: {
    title: 'Especificaciones Técnicas',
    content: `**Programas**
• staking_program: staking, rewards, renovación, retirada, fee collection y cleanup.
• Distribución Genesis: scripts auditables que usan System Program, Associated Token Program y Token-2022; no requiere un programa Soleon adicional.

**Cuentas principales**
• reward_vault: reserva finita para staking.
• staking_vault: mantiene principal bloqueado.
• soleon_fee_vault: cuenta técnica para distribución de fees.
• genesis_distribution_wallet: mantiene los 4,400,000 SEON hasta completar las diez olas.
• developer_wallet: asignación personal pública de 44,444 SEON.
• maintenance_fee_receiver: Maintenance Wallet pública que recibe fees SOL de mantenimiento.

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
• Referencia inicial posible: Manifest order book SEON/USDC verificado, aunque comience vacío.
• Ninguna wallet controlada por Soleon coloca órdenes iniciales.
• No existe reserva de mercado, pool oficial, votación de pool ni compromiso de liquidez.
• Los pools AMM pueden ser creados por terceros y son independientes, no oficiales por defecto.
• La web solo enlaza mercados o pools después de comprobar que usan el mint SEON correcto.
• No hay custodia: cada usuario firma desde su wallet en interfaces DEX externas.

**Mantenimiento**
La web oficial es una capa de conveniencia. Soleon Maintainer mantiene dominios, RPC, documentación, informes de las olas, enlaces DEX, wallet adapters y releases, pero no puede cambiar las reglas on-chain cuando el protocolo quede inmutable. Esta función operativa se documenta como una dependencia humana explícita y no se confunde con autoridad sobre fondos de staking de usuarios.`,
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
Durante agosto, septiembre y octubre de 2026 se mantiene abierta la revisión pública del código de la web, del staking y de los scripts de distribución. Los reportes deben incluir:
• pasos para reproducir,
• impacto,
• wallet,
• evidencias,
• explicación clara del riesgo.

No existe reserva de revisión ni programa de pagos prometido por reportes. La revisión pública reduce riesgo, pero no garantiza ausencia total de errores.

**Autoridades temporales**
La upgrade authority del staking se conserva durante las diez olas para corregir únicamente problemas confirmados, reproducibles y documentados públicamente. No permite retirar principal de usuarios ni crear supply. Después de la Ola 10, la verificación acumulada y las correcciones necesarias, debe revocarse para dejar el programa inmutable.

La mint authority existe solo durante la creación y asignación inicial del supply completo; después se revoca. La freeze authority es nula. La autoridad de configuración de la transfer fee y la autoridad sobre fees retenidas quedan vinculadas a la PDA y a las reglas del programa según el diseño publicado.

**Estado final buscado**
• Mint authority: null.
• Freeze authority: null.
• Program upgrade authority: revocada.
• Transfer fee config authority: controlada solo por reglas del programa o revocada según diseño final.
• Withdraw withheld authority: PDA del programa para distribución fija.

En el estado final, el usuario debe poder verificar mint, program IDs, vaults, autoridades y reglas desde exploradores y código público.

**Alcance real de la descentralización**
La inmutabilidad del mint y del staking no convierte automáticamente en descentralizadas todas las capas del proyecto. La web, la documentación y la Maintenance Wallet siguen teniendo responsables operativos. Soleon publica estas dependencias, limita sus funciones y evita describir el sistema como totalmente descentralizado mientras existan. No reservar fondos para operar mercados elimina una función financiera controlada por el mantenedor, pero no elimina el mantenimiento humano de la interfaz. La meta es reducir el control discrecional sobre las reglas y los fondos del protocolo, no ocultar esas dependencias.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**10–23 de agosto de 2026: preparación y rehearsal**
• Cerrar scripts de mint, metadata, selección, distribución y verificación.
• Ejecutar el proceso completo en devnet y con dry-run.
• Publicar código de la web, del staking y de los scripts de Genesis.
• Recibir reportes reproducibles.
• Clasificar hallazgos.
• Corregir problemas confirmados.
• Confirmar wallets oficiales y exclusiones.
• Preparar el rehearsal final.

**24 de agosto de 2026: mint y asignación inicial**
• Crear el mint SEON Token-2022 y su metadata oficial.
• Crear y publicar las wallets y cuentas principales.
• Financiar reward_vault con 440,000,000 SEON.
• Financiar Genesis Distribution Wallet con 4,400,000 SEON.
• Transferir 44,444 SEON a Developer Wallet.
• Revocar mint authority después de verificar el supply completo y las asignaciones.
• Confirmar freeze authority nula.

**31 de agosto de 2026: staking, mercado verificable y Ola 1**
• Desplegar y abrir staking si el rehearsal final es correcto.
• Abrir staking_open y activar la primera transfer fee de 0.02% mediante acción permissionless.
• Permitir stake, claim, renovación, unstake y cleanup.
• Publicar la dirección verificada del mercado Manifest SEON/USDC si está disponible, indicando que puede comenzar vacío.
• No colocar órdenes iniciales desde wallets controladas por Soleon.
• Distribuir 10,000 SEON a cada una de las primeras 44 wallets.

**Olas semanales 2–10**
• Ola 2: 7 de septiembre de 2026.
• Ola 3: 14 de septiembre de 2026.
• Ola 4: 21 de septiembre de 2026.
• Ola 5: 28 de septiembre de 2026.
• Ola 6: 5 de octubre de 2026.
• Ola 7: 12 de octubre de 2026.
• Ola 8: 19 de octubre de 2026.
• Ola 9: 26 de octubre de 2026.
• Ola 10: 2 de noviembre de 2026.
• Cada ola distribuye 440,000 SEON entre 44 wallets y publica su informe verificable.

**Después de la Ola 10**
• Publicar la verificación acumulada de las 440 distribuciones.
• Cerrar las correcciones técnicas confirmadas durante la ventana de lanzamiento.
• Revocar la program upgrade authority y dejar staking inmutable.
• Mantener publicada la dirección correcta del mercado Manifest y sus datos on-chain, sin presentar ausencia de órdenes como un fallo técnico.
• Revisar y etiquetar de forma independiente cualquier pool comunitario que aparezca, sin convertirlo en oficial.
• No abrir una votación de pool ni anunciar una fecha o umbral de liquidez oficial.

**Operación continuada**
• Mantener documentación y enlaces.
• Seguir recolectando fees Token-2022 hacia fondo de recompensas y burn.
• Publicar balances y movimientos de las wallets operativas.
• No prometer liquidez, precio, volumen ni creación de un pool oficial.`,
  },
  conclusion: {
    title: 'Conclusión',
    content: `Soleon no intenta empezar con una gran venta ni con volumen artificial controlado por el creador. Empieza pequeño: un token fijo, una distribución directa y verificable, revisión pública, staking con presupuesto finito y un mercado DEX-first que puede comenzar vacío y solo adquirir actividad mediante participantes independientes.

**Lo que Soleon sí intenta hacer**
• Poner reglas claras on-chain.
• Hacer reproducible y visible la distribución inicial por olas.
• Separar interfaz web de autoridad del protocolo.
• Usar transfer fees para quemar parte del supply y rellenar rewards.
• Revocar la autoridad de actualización del staking cuando termine la ventana pública de lanzamiento.
• Identificar de forma clara las funciones de Soleon Maintainer y de las wallets operativas necesarias.

**Lo que Soleon no promete**
• No promete precio.
• No promete liquidez inmediata.
• No promete APR económico garantizado.
• No promete listing en CEX.
• No promete que la revisión pública encuentre todos los errores.

SEON puede no tener mercado o puede valer cero. El order book verificado puede comenzar y permanecer vacío; Soleon no coloca órdenes iniciales, no crea demanda y no garantiza una contraparte. Los pools que puedan crear terceros son independientes y no constituyen liquidez oficial prometida.

El proyecto solo puede ofrecer reglas públicas, documentación, código revisable y una estructura que reduzca dependencias centralizadas. La existencia de una web mantenida y una Maintenance Wallet impide afirmar una descentralización total de todas las capas. La decisión económica final pertenece a participantes independientes; la meta técnica es que las reglas centrales del token y del staking dejen de depender del mantenedor.`,
  },
};

const whitepaperContentEn = {
  introduction: {
    title: 'Introduction',
    content: `Soleon represents a Solana token launch model based on transparency, public distribution and verifiable on-chain rules. Its goal is not to promise returns, but to build a structure where anyone can review how the token starts, where the funds are, what can change and what should become immutable.

Crypto markets have seen too many launches with private presales, hidden wallets, fake pools, liquidity controlled by a few actors and promises that cannot be verified. Soleon starts from the need for a different model: small at first, public from day one and designed to reduce dependence on private decisions.

The updated operating schedule separates mint creation, distribution and staking opening. The Token-2022 SEON mint is planned for **August 24, 2026**, after the full rehearsal. Staking and the first Genesis distribution wave are planned for **August 31, 2026**. The ten weekly waves end on **November 2, 2026**, provided each phase passes its technical checks.

The current design avoids three common dependencies:
• No presale, ICO or temporary pretoken.
• No creator-controlled initial AMM pool.
• No promise of a CEX listing or official price.

Soleon starts with a clear philosophy:
• Transparency is fundamental: relevant funds should be public and verifiable.
• Initial distribution is not bought: it is sent directly to 440 independent wallets selected through public rules, a snapshot and verifiable randomness.
• Decentralization is a progressive technical target, not a slogan or a claim of total decentralization while temporary authorities and operational duties remain.
• The website helps use the protocol, but should not be the protocol authority.
• Markets should form in a DEX-first, public and verifiable way.
• Public review is part of launch, not a later decoration.

SEON is first distributed through a direct Genesis Airdrop: 4,400,000 SEON allocated in ten weekly waves of 44 wallets, with 10,000 SEON per wallet. There is no claim, eligibility signature, mandatory website connection or distribution fee. After the final rehearsal, staking opens with a fixed 7-day lock, proportional rewards and permissionless maintenance. Program upgrade authority remains only during the ten waves so confirmed and publicly documented bugs can be fixed; after final verification, the target is to revoke it and make staking immutable.`,
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

**Free direct initial distribution**
The first allocation is neither purchased nor claimed. The 4,400,000 Genesis SEON are sent directly to 440 independent wallets in ten weekly waves. Each wallet receives 10,000 SEON without connecting to the website, signing a message, paying a protocol fee or trusting an eligibility server.

**Public and reproducible selection**
Candidate wallets come from verifiable activity in known Solana ecosystem protocols. Before the first wave, the rules, snapshot slot, exclusions, data hashes and randomness method are published. The final list is closed before Wave 1, and every wave reports wallets, ATAs, transactions, errors and retries.

**Transparent funds and roles**
The initial allocation clearly separates the reward fund, Genesis Distribution Wallet and developer allocation. The Maintenance Wallet is an operational account funded in SOL by fees from specific actions, not an allocation of the SEON supply. Every address, balance and role should be trackable through explorers once it exists.

**Public review before and during launch**
The website, staking and distribution scripts are opened for review. There is no review reserve and no promised payout for reports. This does not guarantee that every issue is absent, but it avoids selling a false sense of security and requires rules, addresses and risks to be published.

**DEX-first market without official liquidity**
The first market that may be published is a verifiable SEON/USDC order book on Manifest. It may begin completely empty: Soleon reserves no tokens for market activity, places no initial orders through controlled wallets and promises no price, volume, depth or liquidity. All activity must come from independent participants.

**Defense against fakes**
The website should not link every market that appears. It should distinguish verified, community, high-risk and fake markets. A pool is not official just because it exists, and a link should not activate until the address is verifiable.

**Programmatic and progressive decentralization**
• Mint authority revoked after the full supply is created and allocated.
• No freeze authority.
• Transfer-fee configuration controlled by the program PDA and published rules.
• Immutable staking program after the ten waves, final verification and any required public fixes.
• Fee distribution fixed by code: 20% burn, 1 SEON to the caller and the rest to rewards.

**Staking with a verifiable annual budget**
Staking does not promise a fixed APR. Each year releases a maximum percentage of the uncommitted reward fund. Users share that budget proportionally to active principal.

**Immutability without hiding human operations**
Soleon distinguishes the protocol from its operational layers. Staking can become immutable and critical actions can be permissionless, while the website, documentation and Maintenance Wallet require human maintenance publicly identified as Soleon Maintainer. During this phase, Soleon therefore describes decentralization as progressive and verifiable, not total.`,
  },
  distribution: {
    title: 'Initial Distribution',
    content: `**Total supply: 444,444,444 SEON**

The complete supply is created once and split across three public allocations:
• 440,000,000 SEON → staking reward vault.
• 4,400,000 SEON → Genesis Distribution Wallet.
• 44,444 SEON → Developer Wallet.

**Genesis Airdrop**
The 4,400,000 Genesis SEON are distributed to 440 independent wallets:
• 10,000 SEON per wallet.
• 44 wallets per wave.
• 440,000 SEON per wave.
• Ten weekly waves from August 31 through November 2, 2026.

There is no Genesis contract, claim, server-side signature, mandatory website connection or distribution fee. The Genesis Distribution Wallet creates the recipient's Token-2022 ATA when required and executes a direct, on-chain verifiable transfer.

**Verifiable selection**
Before Wave 1, a set of 10,000 candidates is built from recent activity on Jupiter, Raydium, Orca, Meteora, Kamino, Marinade/Jito and Drift. Rules require real Solana history, activity across different days and months, recent interaction with known protocols and a snapshot balance between 0.05 and 500 SOL. Programs, PDAs, exchanges, obvious bots, Soleon-controlled wallets, duplicates and identifiable infrastructure addresses are excluded.

The snapshot slot, final program allowlist, input hashes, public seed derived from a future block and selection algorithm are published so selection of the 440 wallets can be reproduced. The full list is fixed before the first wave and deterministically split into ten groups of 44. Each weekly report shows every transfer result and supports idempotent retries without duplicate payments.

**Developer Wallet**
The Developer Wallet receives 44,444 SEON as the developer's public personal allocation. These tokens may be held, transferred, sold or staked as personally owned tokens. It is not used to place initial orders and is not presented as a source of protocol liquidity. Any later use is a personal action that remains public and verifiable on-chain, not a Genesis sale or official Soleon liquidity.`,
  },
  tokenomics: {
    title: 'Tokenomics',
    content: `**Token model**
• Network: Solana.
• Standard: Token-2022 with TransferFee extension.
• Decimals: 9.
• Fixed supply: 444,444,444 SEON.
• Mint authority: revoked after the complete supply is created and allocated.
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
• Direct Genesis distribution charges no protocol fee to recipients.
• Some staking actions charge 0.0005 SOL:
• staking claim_rewards.
• staking unstake_expired.

This fee goes to a public Maintenance Wallet separate from the Developer Wallet and Genesis Distribution Wallet. It may cover domain, RPC, website, reporting and other verifiable operating costs. It does not change supply, does not change APR, does not grant protocol control and is not charged on renew.`,
  },
  staking: {
    title: 'Staking System',
    content: `Staking is deployed and opened on **August 31, 2026**, together with Wave 1, provided the final rehearsal passes. Upgrade authority remains during the ten waves only to fix confirmed, reproducible and publicly documented bugs. After Wave 10, cumulative verification and any required fixes, the target is to revoke it and make the program immutable.

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
    title: 'DEX-first Markets and Independent Participation',
    content: `Soleon does not start with a presale or raised capital intended to sustain initial liquidity. It also reserves no SEON for market operations. Price, volume and depth can only exist when independent participants choose to place and execute orders at their own risk.

**Order book as the first verifiable market**
The first market the website may publish is an SEON/USDC order book on Manifest, provided its address, mints and configuration have been checked. An order book lets buyers and sellers publish price and amount. Execution takes place through the DEX, on-chain, without Soleon taking custody of third-party funds.

Publishing a verified address does not mean liquidity exists. The market may begin without bids, asks, trades or a price. That empty state is valid and is displayed as such: technically creating a market does not create economic demand.

**Independent price formation**
• Soleon does not set an initial price or market capitalization.
• Soleon-controlled wallets place no initial bids or asks.
• Volume is not fabricated through self-trading, related wallets or circular transactions.
• An isolated order or minimal trade does not demonstrate depth or sustainable valuation.
• Without an independent counterparty, real liquidity and volume are zero.
• Each participant chooses limits, amounts and risks through an external DEX interface.

A traded price appears only when two independent participants agree to exchange SEON and USDC. That price may move quickly, have a wide spread and be unable to absorb meaningful sales. Soleon does not intervene to support, direct or promise continuity for it.

**Developer Wallet and later activity**
The public developer allocation is 44,444 SEON. It is not used to seed launch orders and is not presented as protocol demand, market making or liquidity.

Like any holder, the developer may later hold, stake, transfer, buy or sell tokens by personal choice. Any action remains visible on-chain and carries ordinary market risk. It is not part of the Genesis Airdrop, does not alter its rules and does not turn a personal trade into an official Soleon sale.

**No promised official liquidity**
Soleon does not promise, fund, schedule or govern an official pool. It does not open a pool vote, request liquidity commitments or collect funds to create one. There is no date by which a pool must appear and no threshold that requires the protocol to organize it.

This avoids presenting maintainer-controlled assets as community demand, reduces centralized financial functions and keeps Genesis distribution, the developer allocation and technical maintenance separate.

**Third-party pools**
Any user or group may independently create a pool on Raydium, Orca, Meteora or another compatible DEX and provide personal liquidity. That action remains independent:
• it is not directed or guaranteed by Soleon,
• it does not become official merely by using the SEON name,
• it does not require other holders to participate,
• it promises no return or protection from impermanent loss,
• it grants no control over the token or staking.

The website may display a community pool after verifying its address and clearly identifying its independent nature. Publishing it as a reference does not imply economic backing, an audit of the DEX or a guarantee of liquidity.

**Fake markets and checks**
On Solana, anyone can create a token, market or pool with a similar name. Before publishing a link, the website checks:
• that it uses the correct SEON mint,
• that both assets and the market address match,
• that the DEX and market type are clearly identified,
• that displayed liquidity and volume come from on-chain data,
• that any control or ability to withdraw liquidity is explained where verifiable,
• that there are no evident signs of a fake mint, suspicious route or misleading presentation.

Users should always verify the mint and addresses. A verified-market label only confirms observable identity and configuration; it does not remove price, slippage, external-contract or loss risk.

**Why this model**
• It does not depend on a CEX agreeing to list SEON.
• It does not require custody of user funds.
• It does not need an initial sale to create holders.
• It does not confuse creator inventory with community liquidity.
• It lets real activity remain visible, including when it is zero.
• It removes an operational and financial role that would otherwise remain under maintainer control.

**Role of the website**
The website does not operate as an exchange, custody funds, place orders or set price. Its role is to publish the mint and verified addresses, explain risk, link external interfaces and distinguish correct markets from fake or misleading routes.`,
  },
  technical: {
    title: 'Technical Specifications',
    content: `**Programs**
• staking_program: staking, rewards, renew, unstake, fee collection and cleanup.
• Genesis distribution: auditable scripts using the System Program, Associated Token Program and Token-2022; no additional Soleon program is required.

**Main accounts**
• reward_vault: finite staking reserve.
• staking_vault: holds locked principal.
• soleon_fee_vault: technical account for fee distribution.
• genesis_distribution_wallet: holds 4,400,000 SEON until all ten waves are complete.
• developer_wallet: public personal allocation of 44,444 SEON.
• maintenance_fee_receiver: public Maintenance Wallet receiving SOL maintenance fees.

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
• Possible initial reference: a verified Manifest SEON/USDC order book, even if it begins empty.
• No Soleon-controlled wallet places initial orders.
• There is no market reserve, official pool, pool vote or liquidity commitment.
• AMM pools may be created by third parties and remain independent, not official by default.
• The website only links markets or pools after checking they use the correct SEON mint.
• No custody: each user signs from their own wallet using external DEX interfaces.

**Maintenance**
The official website is a convenience layer. Soleon Maintainer maintains domains, RPC, documentation, wave reports, DEX links, wallet adapters and releases, but cannot change on-chain rules once the protocol is immutable. This operational role is documented as an explicit human dependency and is not confused with authority over user staking principal.`,
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
During August, September and October 2026, the website, staking and distribution scripts remain open for public review. Reports must include:
• reproduction steps,
• impact,
• wallet,
• evidence,
• clear explanation of risk.

There is no review reserve and no promised payout program for reports. Public review reduces risk, but it does not guarantee every issue is absent.

**Temporary authorities**
Staking upgrade authority remains during the ten waves only to fix confirmed, reproducible and publicly documented issues. It cannot withdraw user principal or create supply. After Wave 10, cumulative verification and any required fixes, it must be revoked so the program becomes immutable.

Mint authority exists only while the complete supply is created and allocated, then it is revoked. Freeze authority is null. Transfer-fee configuration and withheld-fee authority are bound to the PDA and program rules according to the published design.

**Target final state**
• Mint authority: null.
• Freeze authority: null.
• Program upgrade authority: revoked.
• Transfer fee config authority: controlled only by program rules or revoked according to final design.
• Withdraw withheld authority: program PDA for fixed distribution.

In the final state, users should be able to verify mint, program IDs, vaults, authorities and rules from explorers and public code.

**Actual scope of decentralization**
Mint and staking immutability do not automatically decentralize every project layer. The website, documentation and Maintenance Wallet still have operational maintainers. Soleon publishes these dependencies, limits their roles and avoids describing the system as fully decentralized while they remain. Reserving no funds for market operations removes a maintainer-controlled financial role, but it does not remove human interface maintenance. The target is to reduce discretionary control over protocol rules and funds, not to hide those dependencies.`,
  },
  timeline: {
    title: 'Timeline',
    content: `**August 10–23, 2026: preparation and rehearsal**
• Finalize mint, metadata, selection, distribution and verification scripts.
• Execute the complete process on devnet and with dry-run.
• Publish website, staking and Genesis script source code.
• Receive reproducible reports.
• Classify findings.
• Fix confirmed issues.
• Confirm official wallets and exclusions.
• Prepare the final rehearsal.

**August 24, 2026: mint and initial allocation**
• Create the Token-2022 SEON mint and official metadata.
• Create and publish main wallets and accounts.
• Fund reward_vault with 440,000,000 SEON.
• Fund Genesis Distribution Wallet with 4,400,000 SEON.
• Transfer 44,444 SEON to Developer Wallet.
• Revoke mint authority after verifying complete supply and allocations.
• Confirm null freeze authority.

**August 31, 2026: staking, verifiable market and Wave 1**
• Deploy and open staking if the final rehearsal passes.
• Open staking_open and activate the first 0.02% transfer fee through a permissionless action.
• Enable stake, claim, renew, unstake and cleanup.
• Publish the verified Manifest SEON/USDC market address if available, stating that it may begin empty.
• Place no initial orders from Soleon-controlled wallets.
• Distribute 10,000 SEON to each of the first 44 wallets.

**Weekly Waves 2–10**
• Wave 2: September 7, 2026.
• Wave 3: September 14, 2026.
• Wave 4: September 21, 2026.
• Wave 5: September 28, 2026.
• Wave 6: October 5, 2026.
• Wave 7: October 12, 2026.
• Wave 8: October 19, 2026.
• Wave 9: October 26, 2026.
• Wave 10: November 2, 2026.
• Each wave distributes 440,000 SEON across 44 wallets and publishes its verifiable report.

**After Wave 10**
• Publish cumulative verification of all 440 distributions.
• Close confirmed technical fixes from the launch window.
• Revoke program upgrade authority and make staking immutable.
• Keep the correct Manifest market address and its on-chain data published, without presenting absence of orders as a technical failure.
• Independently review and label any community pool that appears, without making it official.
• Do not open a pool vote or announce a date or threshold for official liquidity.

**Continued operation**
• Maintain documentation and links.
• Continue collecting Token-2022 fees toward reward vault and burn.
• Publish balances and movements of operational wallets.
• Do not promise liquidity, price, volume or creation of an official pool.`,
  },
  conclusion: {
    title: 'Conclusion',
    content: `Soleon does not try to start with a large sale or artificial volume controlled by the creator. It starts small: a fixed token, a direct and verifiable initial distribution, public review, staking with a finite budget and a DEX-first market that may begin empty and can only gain activity through independent participants.

**What Soleon tries to do**
• Put clear rules on-chain.
• Make the wave-based initial distribution reproducible and visible.
• Separate website interface from protocol authority.
• Use transfer fees to burn part of supply and refill rewards.
• Revoke staking upgrade authority when the public launch window ends.
• Clearly identify the roles of Soleon Maintainer and required operational wallets.

**What Soleon does not promise**
• It does not promise price.
• It does not promise immediate liquidity.
• It does not promise guaranteed economic APR.
• It does not promise CEX listing.
• It does not promise public review will find every issue.

SEON may have no market or may be worth zero. The verified order book may begin and remain empty; Soleon places no initial orders, creates no demand and guarantees no counterparty. Pools that third parties may create are independent and do not constitute promised official liquidity.

The project can only offer public rules, documentation, reviewable code and a structure that reduces centralized dependencies. A maintained website and Maintenance Wallet mean total decentralization cannot be claimed across every layer. Final economic decisions belong to independent participants; the technical target is for the core token and staking rules to stop depending on the maintainer.`,
  },
};

export function WhitepaperContent() {
  const [activeSection, setActiveSection] = useState<string>('introduction');
  const t = useTranslations('whitepaper');
  const locale = useLocale();
  const isEn = locale === 'en';
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
                      Soleon Whitepaper v1.1 - Token-2022
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
