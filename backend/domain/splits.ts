/**
 * Cálculo puro de divisiones de gastos.
 *
 * `calculateSplit` reparte un total en cuotas exactas sin tocar la base de
 * datos ni los saldos. La firma pública es:
 *
 * ```ts
 * calculateSplit({
 *   totalMinor: bigint,          // total en la unidad mínima de la moneda
 *   ownerId: number,             // organizador de la división
 *   participantIds: number[],    // participantes distintos del organizador
 *   includeOwner?: boolean,      // true: el organizador también asume cuota
 *   shares?: { userId: number; amountMinor: bigint }[],
 * }): { userId: number; amountMinor: bigint; isOwner: boolean }[]
 * ```
 *
 * Reglas:
 * - `participantIds` no puede contener al organizador ni usuarios repetidos.
 * - Sin `shares`, el reparto es equitativo. El residuo del reparto entero se
 *   asigna de a +1 a las primeras posiciones (10.00 entre 3 => 3.34, 3.33, 3.33).
 * - Con `shares`, cada usuario del reparto debe tener exactamente una cuota
 *   positiva y la suma debe coincidir exactamente con `totalMinor`.
 * - Cuando `includeOwner` es true el organizador ocupa la primera posición y
 *   también recibe cuota, pero la capa HTTP no le crea solicitud de pago.
 */

export interface SplitShareInput {
  readonly userId: number;
  readonly amountMinor: bigint;
}

export interface CalculateSplitInput {
  readonly totalMinor: bigint;
  readonly ownerId: number;
  readonly participantIds: readonly number[];
  readonly includeOwner?: boolean;
  readonly shares?: readonly SplitShareInput[];
}

export interface SplitAllocation {
  readonly userId: number;
  readonly amountMinor: bigint;
  readonly isOwner: boolean;
}

function splitByShares(
  ordered: readonly number[],
  ownerId: number,
  totalMinor: bigint,
  shares: readonly SplitShareInput[]
): SplitAllocation[] {
  const amounts = new Map<number, bigint>();
  for (const share of shares) {
    if (!Number.isInteger(share.userId) || share.userId <= 0) {
      throw new Error("Hay una cuota con un usuario inválido.");
    }
    if (amounts.has(share.userId)) {
      throw new Error("Cada usuario debe tener exactamente una cuota.");
    }
    if (typeof share.amountMinor !== "bigint" || share.amountMinor <= 0n) {
      throw new Error("Cada cuota debe ser un monto positivo.");
    }
    amounts.set(share.userId, share.amountMinor);
  }

  if (amounts.size !== ordered.length) {
    throw new Error("Las cuotas deben cubrir exactamente a todos los participantes.");
  }

  let sum = 0n;
  for (const userId of ordered) {
    const amount = amounts.get(userId);
    if (amount === undefined) {
      throw new Error("Falta la cuota de uno de los participantes.");
    }
    sum += amount;
  }
  if (sum !== totalMinor) {
    throw new Error("La suma de las cuotas debe coincidir con el total.");
  }

  return ordered.map((userId) => ({
    userId,
    amountMinor: amounts.get(userId) as bigint,
    isOwner: userId === ownerId,
  }));
}

export function calculateSplit(input: CalculateSplitInput): SplitAllocation[] {
  const { totalMinor, ownerId, participantIds, includeOwner = false, shares } = input;

  if (typeof totalMinor !== "bigint" || totalMinor <= 0n) {
    throw new Error("El total debe ser un monto positivo.");
  }
  if (!Number.isInteger(ownerId) || ownerId <= 0) {
    throw new Error("El organizador no es válido.");
  }
  if (participantIds.length === 0) {
    throw new Error("Debes indicar al menos un participante.");
  }

  const seen = new Set<number>();
  for (const participantId of participantIds) {
    if (!Number.isInteger(participantId) || participantId <= 0) {
      throw new Error("Hay un participante inválido.");
    }
    if (participantId === ownerId) {
      throw new Error("El organizador no debe incluirse en participantIds; usa includeOwner.");
    }
    if (seen.has(participantId)) {
      throw new Error("Los participantes deben ser usuarios únicos.");
    }
    seen.add(participantId);
  }

  const ordered = includeOwner ? [ownerId, ...participantIds] : [...participantIds];

  if (shares && shares.length > 0) {
    return splitByShares(ordered, ownerId, totalMinor, shares);
  }

  const count = BigInt(ordered.length);
  if (totalMinor < count) throw new Error("El total no permite una cuota positiva para cada participante.");
  const base = totalMinor / count;
  const remainder = Number(totalMinor % count);

  return ordered.map((userId, index) => ({
    userId,
    amountMinor: base + (index < remainder ? 1n : 0n),
    isOwner: userId === ownerId,
  }));
}
