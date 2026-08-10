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
• La distribución inicial no se compra: se envía directamente a 400 wallets independientes seleccionadas mediante reglas públicas, snapshot y aleatoriedad verificable.
• La descentralización es un objetivo técnico progresivo, no un eslogan ni una afirmación de descentralización total mientras existan autoridades temporales y tareas operativas.
• La web ayuda a usar el protocolo, pero no debe ser la autoridad del protocolo.
• Los mercados deben formarse de manera DEX-first, pública y verificable.
• La revisión pública es parte del lanzamiento, no un adorno posterior.

SEON se distribuye primero mediante un Genesis Airdrop directo: 4,000,000 SEON repartidos en diez olas semanales de 40 wallets, con 10,000 SEON por wallet. No hay claim, firma de elegibilidad, conexión obligatoria a la web ni fee de distribución. Después del ensayo final se abre staking con lock fijo de 7 días, rewards proporcionales y mantenimiento permissionless. La autoridad de actualización del programa se conserva únicamente durante las diez olas para corregir errores confirmados y documentados públicamente; después de la verificación final, el objetivo es revocarla y dejar el staking inmutable.`,
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
El primer reparto no se compra ni se reclama. Los 4,000,000 SEON de Genesis se envían directamente a 400 wallets independientes en diez olas semanales. Cada wallet recibe 10,000 SEON sin conectar su wallet a la web, firmar un mensaje, pagar una fee de protocolo ni confiar en un servidor de elegibilidad.

**Selección pública y reproducible**
Las wallets candidatas proceden de actividad verificable en protocolos conocidos del ecosistema Solana. Antes de la primera ola se publican las reglas, el slot del snapshot, las exclusiones, los hashes de los datos y el método de aleatoriedad. La lista final queda cerrada antes de Wave 1 y cada ola publica wallets, ATAs, transacciones, errores y reintentos.

**Transparencia de fondos y funciones**
La asignación inicial separa claramente el fondo de recompensas, la Genesis Distribution Wallet, la Market / Liquidity Wallet temporal y la asignación del desarrollador. También se publica la Maintenance Wallet. Cada dirección, balance y función debe poder seguirse en exploradores cuando exista.

**Revisión pública antes y durante el lanzamiento**
El código de la web, del staking y de los scripts de distribución se abre a revisión. No existe reserva de revisión ni pago prometido por reportes. Esto no garantiza ausencia total de errores, pero evita vender una falsa sensación de seguridad y obliga a publicar reglas, direcciones y riesgos.

**Mercado DEX-first con liquidez inicial limitada y visible**
El primer mercado previsto es un order book SEON/USDC verificable en Manifest. La Market / Liquidity Wallet puede aportar órdenes reales con hasta 400,000 SEON y 200 USDC. Sus órdenes, inventario y reglas se hacen públicos; no se usa para fabricar volumen, demanda o precio.

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
Soleon distingue el protocolo de sus capas operativas. El staking puede quedar inmutable y las acciones críticas pueden ser permissionless, mientras que la web, la documentación, la Maintenance Wallet y la Market / Liquidity Wallet temporal requieren mantenimiento humano identificable públicamente como Soleon Maintainer. Por ello, durante esta fase se habla de descentralización progresiva y verificable, no de descentralización total.`,
  },
  distribution: {
    title: 'Distribución Inicial',
    content: `**Supply total: 444,444,444 SEON**

El supply completo se crea una sola vez y se separa en cuatro asignaciones públicas:
• 440,000,000 SEON → fondo de recompensas de staking.
• 4,000,000 SEON → Genesis Distribution Wallet.
• 400,000 SEON → Market / Liquidity Wallet temporal.
• 44,444 SEON → Developer Wallet.

**Genesis Airdrop**
Los 4,000,000 SEON de Genesis se reparten entre 400 wallets independientes:
• 10,000 SEON por wallet.
• 40 wallets por ola.
• 400,000 SEON por ola.
• Diez olas semanales desde el 31 de agosto hasta el 2 de noviembre de 2026.

No existe contrato Genesis, claim, firma server-side, conexión obligatoria a la web ni fee de distribución. La Genesis Distribution Wallet crea el ATA Token-2022 del destinatario cuando sea necesario y realiza una transferencia directa comprobable on-chain.

**Selección verificable**
Antes de Wave 1 se construye un conjunto de 10,000 candidatos procedentes de actividad reciente en Jupiter, Raydium, Orca, Meteora, Kamino, Marinade/Jito y Drift. Las reglas exigen historial Solana real, actividad en diferentes días y meses, interacción reciente con protocolos conocidos y un balance de snapshot entre 0.05 y 500 SOL. Se excluyen programas, PDAs, exchanges, bots evidentes, wallets controladas por Soleon, duplicados y direcciones de infraestructura identificables.

El slot del snapshot, la allowlist definitiva de programas, los hashes de entrada, la semilla pública derivada de un bloque futuro y el algoritmo de selección se publican para que la elección de las 400 wallets pueda reproducirse. La lista completa se fija antes de la primera ola y se divide determinísticamente en diez grupos de 40. Cada informe semanal muestra el resultado de cada transferencia y permite reintentos idempotentes sin duplicar pagos.

**Wallets operativas iniciales**
La Developer Wallet recibe 44,444 SEON como asignación personal pública del desarrollador. Puede mantenerlos, transferirlos, venderlos o ponerlos en staking como tokens propios.

La Market / Liquidity Wallet recibe 400,000 SEON y puede recibir hasta 200 USDC aportados por el mantenedor para formar un libro inicial pequeño y transparente. Es una wallet temporal, separada de Genesis y excluida de la selección de destinatarios. Su uso se limita a liquidez real y a una posible transición posterior hacia un pool SEON/USDC si la actividad independiente demuestra que es viable.`,
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

Esta fee va a una Maintenance Wallet pública y separada de la Developer Wallet y de la Market / Liquidity Wallet. Puede cubrir dominio, RPC, web, informes y otros costes operativos verificables. No cambia supply, no cambia APR, no concede control sobre el protocolo y no se cobra en renovación.`,
  },
  staking: {
    title: 'Sistema de Staking',
    content: `Staking se despliega y abre el **31 de agosto de 2026**, junto con Wave 1, siempre que el rehearsal final sea correcto. La upgrade authority se conserva durante las diez olas únicamente para corregir bugs confirmados, reproducibles y documentados públicamente. Después de Wave 10, de la verificación acumulada y de cualquier corrección necesaria, el objetivo es revocarla y dejar el programa inmutable.

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
    content: `Soleon no nace con una preventa ni con capital recaudado para sostener una gran liquidez inicial. El mercado debe descubrir el precio mediante intercambios reales. Para facilitar ese arranque sin fingir adopción, existe una Market / Liquidity Wallet temporal, pública y separada del fondo Genesis, de la Developer Wallet y de la Maintenance Wallet.

**Order book como primer mercado**
El primer objetivo es un mercado SEON/USDC tipo order book en Manifest, si su dirección y configuración quedan publicadas y verificadas. Un order book funciona de forma parecida a un exchange tradicional: compradores y vendedores colocan órdenes con precio y cantidad. La ejecución es DEX, on-chain y sin custodia de Soleon sobre los fondos de terceros.

**Inventario inicial limitado**
La Market / Liquidity Wallet recibe 400,000 SEON y puede recibir hasta 200 USDC aportados por el mantenedor. Estos activos no representan demanda comunitaria. Solo sirven para publicar pequeñas órdenes reales a ambos lados del libro y aceptar el riesgo económico de que terceros independientes las ejecuten.

**Reglas públicas de actuación**
• Todas las órdenes deben ser reales y ejecutables por cualquier tercero.
• Nunca se cruzan órdenes entre wallets controladas por Soleon.
• No se fabrica volumen, demanda, profundidad, actividad ni precio.
• Si no existe contraparte independiente, el volumen real es cero.
• No se anuncia un precio oficial ni una capitalización derivada de operaciones mínimas.
• Los balances, órdenes y operaciones de la wallet pueden revisarse públicamente.
• Los cambios de cotización siguen reglas publicadas de inventario, spread, profundidad, frecuencia y exposición máxima; no persiguen sostener un precio concreto.

Si nadie compra o vende, las órdenes pueden mantenerse sin cambios o retirarse conforme a esas reglas públicas. Si aparecen operaciones independientes y el precio se mueve, la wallet puede recolocar órdenes alrededor del mercado observado dentro de sus límites, sin intentar revertir la dirección elegida por los participantes.

**Por qué DEX-first**
• No requiere que un CEX acepte listar SEON.
• No obliga al protocolo a custodiar fondos de usuarios.
• Permite que el precio se forme por órdenes visibles.
• Distingue claramente la liquidez aportada por el mantenedor de la actividad orgánica.
• Encaja mejor con un token que busca reglas públicas e inmutabilidad.

**Evaluación de un pool futuro**
Después de Wave 10 se evalúa si existe actividad independiente, un precio suficientemente observado y condiciones razonables para crear un pool SEON/USDC. El pool no está garantizado ni se crea solo para aparentar liquidez. La comunidad decide mediante una votación pública si debe abrirse y con qué propuesta exacta.

**Precio implícito y activos emparejados**
En un pool de producto constante, el precio inicial implícito se obtiene dividiendo los USDC aportados entre los SEON aportados:

precio inicial de SEON = USDC aportados / SEON aportados

Por ejemplo, 300,000 SEON y 300 USDC implican un precio inicial de 0.001 USDC por SEON. Esa proporción no demuestra que el mercado pueda absorber operaciones relevantes: el mismo pool tendría solo unos 600 USDC de valor nominal combinado al precio inicial y sería muy débil frente a órdenes grandes.

No se depositan automáticamente todos los activos disponibles. Si Manifest muestra un precio de referencia de 0.01 USDC y la Market / Liquidity Wallet tiene 400,000 SEON y 200 USDC, la combinación directa de todo el inventario implicaría 0.0005 USDC por SEON y abriría una diferencia inmediata frente al order book. Sin vender previamente, una combinación alineada con 0.01 sería como máximo 20,000 SEON y 200 USDC, dejando el resto fuera del pool. La propuesta debe mostrar esta limitación con claridad para que los usuarios puedan decidir si la liquidez es demasiado pequeña.

**Referencia de mercado y propuesta exacta**
La propuesta del pool publica antes del voto:
• slot y hora de referencia,
• balances exactos de la Market / Liquidity Wallet,
• SEON y USDC que se aportarían,
• precio inicial implícito,
• VWAP de 14 días de operaciones reales en Manifest, junto con volumen, spread y profundidad observados,
• diferencia entre el precio propuesto y el precio de referencia,
• estimación de slippage y activos que permanecerían fuera del pool,
• mecanismo de bloqueo de la posición LP y tratamiento exacto de cualquier derecho a fees.

Las autooperaciones y transferencias entre wallets controladas por Soleon no cuentan para formar la referencia. Si no existe suficiente actividad para obtener una referencia defendible, la propuesta debe indicarlo expresamente y no puede presentar un precio aislado como precio de mercado.

**Reequilibrio previo separado**
Vender SEON antes del pool puede mejorar el equilibrio entre ambos activos, pero la transparencia por sí sola no convierte cualquier venta en una actuación adecuada. No se permite una venta grande, discrecional y ejecutada justo antes de la apertura. Si se considera necesario reequilibrar la wallet, se publica primero una propuesta separada con cantidad máxima, ventana temporal, precios límite, slippage máximo y reglas de ejecución. Solo se usan órdenes reales contra terceros independientes; nunca self-trading ni volumen fabricado.

Tras ese proceso se publica su informe y se somete a voto una nueva propuesta final con las cantidades efectivamente disponibles. Como ejemplo matemático, vender 200,000 SEON a un precio medio exacto de 0.01 dejaría 200,000 SEON y 2,200 USDC, lo que implica 0.011, no 0.01. Ignorando fees y slippage, vender 190,000 dejaría 210,000 SEON y 2,100 USDC, pero ese resultado solo sería real si existiera demanda independiente suficiente para ejecutar toda la venta a ese precio.

**Votación comunitaria del pool**
• 2 de noviembre de 2026: publicar Wave 10, el informe acumulado y la primera propuesta de pool.
• 3 de noviembre de 2026 a las 12:00 UTC: tomar el snapshot y abrir la votación.
• 17 de noviembre de 2026 a las 12:00 UTC: cerrar la votación después de 14 días.
• 17–20 de noviembre: publicar el recuento reproducible y admitir comprobaciones o impugnaciones técnicas.
• Si se aprueba la propuesta final, ejecutar el pool en un máximo de 7 días después de validar el resultado.
• Si no se aprueba o no alcanza quorum, no se crea el pool. Una propuesta nueva, con datos y snapshot nuevos, no puede abrirse antes de 30 días.

El snapshot usa el primer slot finalizado de Solana igual o posterior a la hora publicada. Cuenta el balance líquido elegible y el principal en staking atribuible a cada wallet; excluye Developer Wallet, Market / Liquidity Wallet, Maintenance Wallet, Genesis Distribution Wallet, vaults y cualquier otra cuenta oficial. El dataset, su hash y las reglas de cálculo se publican para reproducción independiente.

El voto se registra con una transacción memo que identifica la propuesta y YES, NO o ABSTAIN. Votar no requiere transferir SEON ni entregar custodia; solo pagar la fee normal de red. Cuenta el último voto válido de cada wallet antes del cierre y 1 SEON elegible equivale a 1 voto. La aprobación requiere simultáneamente:
• participación mínima de 1,000,000 SEON,
• al menos 66.67% de YES entre YES + NO,
• al menos 50 wallets votantes distintas,
• al menos 25 wallets receptoras originales de Genesis con balance elegible.

ABSTAIN cuenta para quorum, pero no para el porcentaje YES/NO. El votante también puede declarar de forma opcional y no vinculante cuánta liquidez consideraría aportar. Esa declaración no bloquea fondos ni obliga a participar. La web debe explicar que aportar liquidez conlleva slippage, impermanent loss y riesgo de pérdida; no es un requisito para votar ni una promesa de rentabilidad.

**Bloqueo permanente y fees**
El diseño previsto exige que la posición LP quede quemada o bloqueada permanentemente para que la liquidez aportada no pueda retirarse discrecionalmente. La propuesta debe identificar el mecanismo concreto y explicar si existe una clave o NFT con derecho a reclamar fees. Si esos derechos no pueden eliminarse técnicamente, su control y destino deben votarse y publicarse de antemano; nunca se presentan como rentabilidad garantizada ni como fees inexistentes.

**Pools comunitarios y mercados falsos**
La comunidad puede crear otros pools en Raydium, Orca, Meteora u otros DEX compatibles. No serán oficiales por defecto. La web podrá mostrarlos si se revisa:
• que usan el mint SEON correcto,
• que el DEX y el par son claros,
• que la liquidez es visible,
• que se indica si el LP está bloqueado, quemado, en multisig o libremente retirable,
• que no hay señales de mint falso, ruta sospechosa o liquidez engañosa.

**Rol de la web**
La web no opera como exchange, no fija precio y no custodia fondos de usuarios. Su función es publicar direcciones, explicar riesgos, enlazar mercados verificados y ayudar a distinguir entre liquidez útil, liquidez débil y pools fake.`,
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
• genesis_distribution_wallet: mantiene los 4,000,000 SEON hasta completar las diez olas.
• market_liquidity_wallet: inventario temporal de 400,000 SEON y hasta 200 USDC para mercado real.
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
• Objetivo inicial: Manifest order book SEON/USDC.
• Market / Liquidity Wallet temporal: órdenes reales bajo reglas públicas y sin self-trading.
• Pool futuro: opcional después de 2–3 meses, solo si la actividad y el precio observado lo hacen viable.
• Otros pools AMM: comunitarios, no oficiales por defecto.
• La web solo enlaza mercados/pools después de revisar que usan el mint SEON correcto.
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
La upgrade authority del staking se conserva durante las diez olas para corregir únicamente problemas confirmados, reproducibles y documentados públicamente. No permite retirar principal de usuarios ni crear supply. Después de Wave 10, la verificación acumulada y las correcciones necesarias, debe revocarse para dejar el programa inmutable.

La mint authority existe solo durante la creación y asignación inicial del supply completo; después se revoca. La freeze authority es nula. La autoridad de configuración de la transfer fee y la autoridad sobre fees retenidas quedan vinculadas a la PDA y a las reglas del programa según el diseño publicado.

**Estado final buscado**
• Mint authority: null.
• Freeze authority: null.
• Program upgrade authority: revocada.
• Transfer fee config authority: controlada solo por reglas del programa o revocada según diseño final.
• Withdraw withheld authority: PDA del programa para distribución fija.

En el estado final, el usuario debe poder verificar mint, program IDs, vaults, autoridades y reglas desde exploradores y código público.

**Alcance real de la descentralización**
La inmutabilidad del mint y del staking no convierte automáticamente en descentralizadas todas las capas del proyecto. La web, la documentación, la Maintenance Wallet y la Market / Liquidity Wallet temporal siguen teniendo responsables operativos. Soleon publica estas dependencias, limita sus funciones y evita describir el sistema como totalmente descentralizado mientras existan. La meta es reducir el control discrecional sobre las reglas y los fondos del protocolo, no ocultar la existencia de mantenimiento humano.`,
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
• Financiar Genesis Distribution Wallet con 4,000,000 SEON.
• Financiar Market / Liquidity Wallet con 400,000 SEON.
• Transferir 44,444 SEON a Developer Wallet.
• Revocar mint authority después de verificar el supply completo y las asignaciones.
• Confirmar freeze authority nula.

**31 de agosto de 2026: staking, mercado y Wave 1**
• Desplegar y abrir staking si el rehearsal final es correcto.
• Abrir staking_open y activar la primera transfer fee de 0.02% mediante acción permissionless.
• Permitir stake, claim, renovación, unstake y cleanup.
• Publicar el mercado Manifest SEON/USDC y la política de la Market / Liquidity Wallet.
• Distribuir 10,000 SEON a cada una de las primeras 40 wallets.

**Olas semanales 2–10**
• Wave 2: 7 de septiembre de 2026.
• Wave 3: 14 de septiembre de 2026.
• Wave 4: 21 de septiembre de 2026.
• Wave 5: 28 de septiembre de 2026.
• Wave 6: 5 de octubre de 2026.
• Wave 7: 12 de octubre de 2026.
• Wave 8: 19 de octubre de 2026.
• Wave 9: 26 de octubre de 2026.
• Wave 10: 2 de noviembre de 2026.
• Cada ola distribuye 400,000 SEON entre 40 wallets y publica su informe verificable.

**Después de Wave 10**
• Publicar la verificación acumulada de las 400 distribuciones.
• Cerrar las correcciones técnicas confirmadas durante la ventana de lanzamiento.
• Revocar la program upgrade authority y dejar staking inmutable.
• 2 de noviembre: publicar la primera propuesta de pool con cantidades, precio implícito, referencia Manifest, profundidad, slippage y mecanismo de bloqueo.
• 3 de noviembre a las 12:00 UTC: fijar el snapshot y abrir la votación durante 14 días.
• 17 de noviembre a las 12:00 UTC: cerrar la votación y publicar un recuento reproducible.
• Si se cumplen quorum, mayoría y amplitud mínima, ejecutar la propuesta final en un máximo de 7 días tras la validación.
• Si no se cumplen, no crear el pool y esperar al menos 30 días antes de una propuesta nueva.

**Operación continuada**
• Mantener documentación y enlaces.
• Seguir recolectando fees Token-2022 hacia fondo de recompensas y burn.
• Publicar balances y movimientos de las wallets operativas.
• No prometer liquidez, precio, volumen ni fecha de pool si las condiciones no son suficientes.`,
  },
  conclusion: {
    title: 'Conclusión',
    content: `Soleon no intenta empezar con una gran venta ni con volumen artificial controlado por el creador. Empieza pequeño: un token fijo, una distribución directa y verificable, revisión pública, staking con presupuesto finito y un mercado DEX-first con inventario inicial limitado y visible.

**Lo que Soleon sí intenta hacer**
• Poner reglas claras on-chain.
• Hacer reproducible y visible la distribución inicial por olas.
• Separar interfaz web de autoridad del protocolo.
• Usar transfer fees para quemar parte del supply y rellenar rewards.
• Revocar la autoridad de actualización del staking cuando termine la ventana pública de lanzamiento.
• Identificar de forma clara las funciones temporales de Soleon Maintainer y de las wallets operativas.

**Lo que Soleon no promete**
• No promete precio.
• No promete liquidez inmediata.
• No promete APR económico garantizado.
• No promete listing en CEX.
• No promete que la revisión pública encuentre todos los errores.

SEON puede no tener mercado o puede valer cero. La Market / Liquidity Wallet puede facilitar órdenes reales, pero no puede crear demanda orgánica ni garantizar que exista una contraparte. Un pool futuro solo se considerará si la actividad independiente y el precio observado lo hacen viable.

El proyecto solo puede ofrecer reglas públicas, documentación, código revisable y una estructura que reduzca dependencias centralizadas. La existencia de una web mantenida, una Maintenance Wallet y una wallet temporal de mercado impide afirmar una descentralización total durante el lanzamiento. La decisión económica final la toman el mercado y la comunidad; la meta técnica es que las reglas centrales del token y del staking dejen de depender del mantenedor.`,
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
• Initial distribution is not bought: it is sent directly to 400 independent wallets selected through public rules, a snapshot and verifiable randomness.
• Decentralization is a progressive technical target, not a slogan or a claim of total decentralization while temporary authorities and operational duties remain.
• The website helps use the protocol, but should not be the protocol authority.
• Markets should form in a DEX-first, public and verifiable way.
• Public review is part of launch, not a later decoration.

SEON is first distributed through a direct Genesis Airdrop: 4,000,000 SEON allocated in ten weekly waves of 40 wallets, with 10,000 SEON per wallet. There is no claim, eligibility signature, mandatory website connection or distribution fee. After the final rehearsal, staking opens with a fixed 7-day lock, proportional rewards and permissionless maintenance. Program upgrade authority remains only during the ten waves so confirmed and publicly documented bugs can be fixed; after final verification, the target is to revoke it and make staking immutable.`,
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
The first allocation is neither purchased nor claimed. The 4,000,000 Genesis SEON are sent directly to 400 independent wallets in ten weekly waves. Each wallet receives 10,000 SEON without connecting to the website, signing a message, paying a protocol fee or trusting an eligibility server.

**Public and reproducible selection**
Candidate wallets come from verifiable activity in known Solana ecosystem protocols. Before the first wave, the rules, snapshot slot, exclusions, data hashes and randomness method are published. The final list is closed before Wave 1, and every wave reports wallets, ATAs, transactions, errors and retries.

**Transparent funds and roles**
The initial allocation clearly separates the reward fund, Genesis Distribution Wallet, temporary Market / Liquidity Wallet and developer allocation. The Maintenance Wallet is also published. Every address, balance and role should be trackable through explorers once it exists.

**Public review before and during launch**
The website, staking and distribution scripts are opened for review. There is no review reserve and no promised payout for reports. This does not guarantee that every issue is absent, but it avoids selling a false sense of security and requires rules, addresses and risks to be published.

**DEX-first market with limited visible initial liquidity**
The first market target is a verifiable SEON/USDC order book on Manifest. The Market / Liquidity Wallet may place real orders with up to 400,000 SEON and 200 USDC. Its orders, inventory and rules are public; it is not used to fabricate volume, demand or price.

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
Soleon distinguishes the protocol from its operational layers. Staking can become immutable and critical actions can be permissionless, while the website, documentation, Maintenance Wallet and temporary Market / Liquidity Wallet require human maintenance publicly identified as Soleon Maintainer. During this phase, Soleon therefore describes decentralization as progressive and verifiable, not total.`,
  },
  distribution: {
    title: 'Initial Distribution',
    content: `**Total supply: 444,444,444 SEON**

The complete supply is created once and split across four public allocations:
• 440,000,000 SEON → staking reward vault.
• 4,000,000 SEON → Genesis Distribution Wallet.
• 400,000 SEON → temporary Market / Liquidity Wallet.
• 44,444 SEON → Developer Wallet.

**Genesis Airdrop**
The 4,000,000 Genesis SEON are distributed to 400 independent wallets:
• 10,000 SEON per wallet.
• 40 wallets per wave.
• 400,000 SEON per wave.
• Ten weekly waves from August 31 through November 2, 2026.

There is no Genesis contract, claim, server-side signature, mandatory website connection or distribution fee. The Genesis Distribution Wallet creates the recipient's Token-2022 ATA when required and executes a direct, on-chain verifiable transfer.

**Verifiable selection**
Before Wave 1, a set of 10,000 candidates is built from recent activity on Jupiter, Raydium, Orca, Meteora, Kamino, Marinade/Jito and Drift. Rules require real Solana history, activity across different days and months, recent interaction with known protocols and a snapshot balance between 0.05 and 500 SOL. Programs, PDAs, exchanges, obvious bots, Soleon-controlled wallets, duplicates and identifiable infrastructure addresses are excluded.

The snapshot slot, final program allowlist, input hashes, public seed derived from a future block and selection algorithm are published so selection of the 400 wallets can be reproduced. The full list is fixed before the first wave and deterministically split into ten groups of 40. Each weekly report shows every transfer result and supports idempotent retries without duplicate payments.

**Initial operational wallets**
The Developer Wallet receives 44,444 SEON as the developer's public personal allocation. These tokens may be held, transferred, sold or staked as personally owned tokens.

The Market / Liquidity Wallet receives 400,000 SEON and may receive up to 200 USDC contributed by the maintainer to form a small, transparent initial order book. It is temporary, separate from Genesis and excluded from recipient selection. Its role is limited to real liquidity and a possible later transition to an SEON/USDC pool if independent activity demonstrates viability.`,
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

This fee goes to a public Maintenance Wallet separate from the Developer Wallet and Market / Liquidity Wallet. It may cover domain, RPC, website, reporting and other verifiable operating costs. It does not change supply, does not change APR, does not grant protocol control and is not charged on renew.`,
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
    title: 'DEX-first Markets and Community Liquidity',
    content: `Soleon does not start with a presale or raised capital to sustain large initial liquidity. The market must discover price through real trades. To facilitate that start without pretending adoption, Soleon uses a temporary and public Market / Liquidity Wallet, separate from the Genesis fund, Developer Wallet and Maintenance Wallet.

**Order book as the first market**
The first target is an SEON/USDC order-book market on Manifest, provided its address and configuration are published and verified. An order book works similarly to a traditional exchange: buyers and sellers place orders with price and amount. Execution is DEX, on-chain and does not give Soleon custody over third-party funds.

**Limited initial inventory**
The Market / Liquidity Wallet receives 400,000 SEON and may receive up to 200 USDC contributed by the maintainer. These assets do not represent community demand. They only support small, real orders on both sides of the book while accepting the economic risk that independent third parties execute them.

**Public operating rules**
• Every order must be real and executable by any third party.
• Orders are never crossed between Soleon-controlled wallets.
• Volume, demand, depth, activity and price are never fabricated.
• Without an independent counterparty, real volume is zero.
• No official price or market capitalization is announced from minimal trades.
• Wallet balances, orders and trades remain publicly reviewable.
• Quote changes follow published inventory, spread, depth, frequency and maximum-exposure rules; they do not attempt to defend a specific price.

If nobody buys or sells, orders may remain unchanged or be withdrawn according to those public rules. If independent trades appear and price moves, the wallet may reposition orders around the observed market within its limits, without trying to reverse the direction chosen by participants.

**Why DEX-first**
• It does not require a CEX to agree to list SEON.
• It does not require the protocol to custody user funds.
• It lets price form from visible orders.
• It clearly distinguishes maintainer-provided liquidity from organic activity.
• It better fits a token that seeks public rules and immutability.

**Future pool evaluation**
After Wave 10, Soleon evaluates whether independent activity, a sufficiently observed price and reasonable conditions exist for an SEON/USDC pool. The pool is not guaranteed and is not created merely to imply liquidity. The community decides through a public vote whether it should open and under which exact proposal.

**Implied price and matched assets**
In a constant-product pool, the initial implied price is calculated by dividing contributed USDC by contributed SEON:

initial SEON price = contributed USDC / contributed SEON

For example, 300,000 SEON and 300 USDC imply an initial price of 0.001 USDC per SEON. That ratio does not prove the market can absorb meaningful trades: the same pool would have only about 600 USDC in combined nominal value at its initial price and would be very weak against large orders.

Available assets are not deposited automatically in full. If Manifest shows a 0.01 USDC reference price while the Market / Liquidity Wallet holds 400,000 SEON and 200 USDC, contributing all inventory directly would imply 0.0005 USDC per SEON and create an immediate difference from the order book. Without a prior sale, a combination aligned with 0.01 would be at most 20,000 SEON and 200 USDC, leaving the remainder outside the pool. The proposal must make this limitation clear so users can decide whether the liquidity is too small.

**Market reference and exact proposal**
Before voting, the pool proposal publishes:
• reference slot and time,
• exact Market / Liquidity Wallet balances,
• SEON and USDC proposed for contribution,
• initial implied price,
• 14-day VWAP of genuine Manifest trades, together with observed volume, spread and depth,
• difference between proposed and reference prices,
• estimated slippage and assets that would remain outside the pool,
• LP position lock mechanism and exact treatment of any fee rights.

Self-trades and transfers between Soleon-controlled wallets do not form part of the reference. If there is not enough activity to obtain a defensible reference, the proposal must say so explicitly and cannot present an isolated trade as a market price.

**Separate pre-pool rebalancing**
Selling SEON before the pool may improve the balance between both assets, but transparency alone does not make every sale appropriate. A large discretionary sale immediately before pool creation is not allowed. If wallet rebalancing is considered necessary, a separate proposal first publishes the maximum amount, execution window, limit prices, maximum slippage and execution rules. Only genuine orders against independent third parties are used; never self-trading or fabricated volume.

After that process, its report is published and a new final proposal with the assets actually available is submitted to a vote. As a mathematical example, selling 200,000 SEON at an exact average price of 0.01 would leave 200,000 SEON and 2,200 USDC, implying 0.011 rather than 0.01. Ignoring fees and slippage, selling 190,000 would leave 210,000 SEON and 2,100 USDC, but that outcome is real only if enough independent demand exists to execute the entire sale at that price.

**Community pool vote**
• November 2, 2026: publish Wave 10, the cumulative report and the first pool proposal.
• November 3, 2026 at 12:00 UTC: take the snapshot and open voting.
• November 17, 2026 at 12:00 UTC: close voting after 14 days.
• November 17–20: publish the reproducible count and accept technical checks or challenges.
• If the final proposal passes, execute the pool within 7 days after validating the result.
• If it fails or does not reach quorum, no pool is created. A new proposal with new data and snapshot cannot open for at least 30 days.

The snapshot uses the first finalized Solana slot at or after the published time. It counts eligible liquid balance and staked principal attributable to each wallet; it excludes the Developer Wallet, Market / Liquidity Wallet, Maintenance Wallet, Genesis Distribution Wallet, vaults and every other official account. The dataset, its hash and calculation rules are published for independent reproduction.

The vote is recorded through a memo transaction identifying the proposal and YES, NO or ABSTAIN. Voting does not require transferring SEON or surrendering custody; only the normal network fee is paid. Each wallet's last valid vote before closing counts, and 1 eligible SEON equals 1 vote. Approval simultaneously requires:
• at least 1,000,000 participating SEON,
• at least 66.67% YES among YES + NO,
• at least 50 distinct voting wallets,
• at least 25 original Genesis recipient wallets with eligible balance.

ABSTAIN counts toward quorum but not the YES/NO percentage. A voter may also provide an optional, non-binding indication of how much liquidity they might contribute. This indication does not lock funds or create an obligation. The website must explain that providing liquidity involves slippage, impermanent loss and risk of loss; it is neither required to vote nor a promise of returns.

**Permanent lock and fees**
The intended design requires the LP position to be burned or permanently locked so contributed liquidity cannot be withdrawn at discretion. The proposal must identify the exact mechanism and explain whether a key or NFT retains fee-claim rights. If those rights cannot technically be eliminated, their control and destination must be voted on and published in advance; they are never presented as guaranteed returns or as nonexistent fees.

**Community pools and fake markets**
The community may create other pools on Raydium, Orca, Meteora or compatible DEXs. Those pools are not official by default. The website may display them if it reviews:
• they use the correct SEON mint,
• the DEX and pair are clear,
• liquidity is visible,
• it states whether LP is locked, burned, multisig-controlled or freely removable,
• there are no signs of a fake mint, suspicious route or misleading liquidity.

**Role of the website**
The website does not operate as an exchange, set price or custody user funds. Its role is to publish addresses, explain risks, link verified markets and help distinguish useful liquidity, weak liquidity and fake pools.`,
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
• genesis_distribution_wallet: holds 4,000,000 SEON until all ten waves are complete.
• market_liquidity_wallet: temporary 400,000 SEON inventory and up to 200 USDC for real market activity.
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
• Initial target: Manifest SEON/USDC order book.
• Temporary Market / Liquidity Wallet: real orders under public rules and no self-trading.
• Future pool: optional after 2–3 months, only if activity and observed price make it viable.
• Other AMM pools: community-created, not official by default.
• The website only links markets/pools after checking they use the correct SEON mint.
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
Mint and staking immutability do not automatically decentralize every project layer. The website, documentation, Maintenance Wallet and temporary Market / Liquidity Wallet still have operational maintainers. Soleon publishes these dependencies, limits their roles and avoids describing the system as fully decentralized while they remain. The target is to reduce discretionary control over protocol rules and funds, not to hide the existence of human maintenance.`,
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
• Fund Genesis Distribution Wallet with 4,000,000 SEON.
• Fund Market / Liquidity Wallet with 400,000 SEON.
• Transfer 44,444 SEON to Developer Wallet.
• Revoke mint authority after verifying complete supply and allocations.
• Confirm null freeze authority.

**August 31, 2026: staking, market and Wave 1**
• Deploy and open staking if the final rehearsal passes.
• Open staking_open and activate the first 0.02% transfer fee through a permissionless action.
• Enable stake, claim, renew, unstake and cleanup.
• Publish the Manifest SEON/USDC market and Market / Liquidity Wallet policy.
• Distribute 10,000 SEON to each of the first 40 wallets.

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
• Each wave distributes 400,000 SEON across 40 wallets and publishes its verifiable report.

**After Wave 10**
• Publish cumulative verification of all 400 distributions.
• Close confirmed technical fixes from the launch window.
• Revoke program upgrade authority and make staking immutable.
• November 2: publish the first pool proposal with amounts, implied price, Manifest reference, depth, slippage and lock mechanism.
• November 3 at 12:00 UTC: fix the snapshot and open the 14-day vote.
• November 17 at 12:00 UTC: close voting and publish a reproducible count.
• If quorum, approval and breadth requirements pass, execute the final proposal within 7 days after validation.
• Otherwise, do not create the pool and wait at least 30 days before a new proposal.

**Continued operation**
• Maintain documentation and links.
• Continue collecting Token-2022 fees toward reward vault and burn.
• Publish balances and movements of operational wallets.
• Do not promise liquidity, price, volume or a pool date if conditions are insufficient.`,
  },
  conclusion: {
    title: 'Conclusion',
    content: `Soleon does not try to start with a large sale or artificial volume controlled by the creator. It starts small: a fixed token, a direct and verifiable initial distribution, public review, staking with a finite budget and a DEX-first market with limited, visible initial inventory.

**What Soleon tries to do**
• Put clear rules on-chain.
• Make the wave-based initial distribution reproducible and visible.
• Separate website interface from protocol authority.
• Use transfer fees to burn part of supply and refill rewards.
• Revoke staking upgrade authority when the public launch window ends.
• Clearly identify the temporary roles of Soleon Maintainer and operational wallets.

**What Soleon does not promise**
• It does not promise price.
• It does not promise immediate liquidity.
• It does not promise guaranteed economic APR.
• It does not promise CEX listing.
• It does not promise public review will find every issue.

SEON may have no market or may be worth zero. The Market / Liquidity Wallet may facilitate real orders, but it cannot create organic demand or guarantee a counterparty. A future pool is only considered if independent activity and observed price make it viable.

The project can only offer public rules, documentation, reviewable code and a structure that reduces centralized dependencies. A maintained website, Maintenance Wallet and temporary market wallet mean total decentralization cannot be claimed during launch. The final economic decision belongs to the market and community; the technical target is for the core token and staking rules to stop depending on the maintainer.`,
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
