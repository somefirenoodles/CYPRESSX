import { describe, expect, it } from 'vitest';
import { calculateSplit } from '../../../backend/domain/splits';

describe('Reparto monetario exacto', () => {
  const input = { ownerId: 1, participantIds: [2, 3, 4], totalMinor: 1000n };
  it('[CP-SPLIT-01] reparte residuos sin perder centavos y conserva orden', () => {
    const shares = calculateSplit(input);
    expect(shares.map((share) => share.amountMinor)).toEqual([334n, 333n, 333n]);
    expect(shares.reduce((sum, share) => sum + share.amountMinor, 0n)).toBe(1000n);
  });
  it('[CP-SPLIT-02] incluye al organizador con cuota propia', () => {
    const shares = calculateSplit({ ...input, participantIds: [2], includeOwner: true });
    expect(shares).toEqual([{ userId: 1, amountMinor: 500n, isOwner: true }, { userId: 2, amountMinor: 500n, isOwner: false }]);
  });
  it('[CP-SPLIT-03] valida cuotas personalizadas, duplicados y cuotas de cero', () => {
    expect(calculateSplit({ ...input, participantIds: [2, 3], shares: [{ userId: 2, amountMinor: 100n }, { userId: 3, amountMinor: 900n }] }).map((share) => share.amountMinor)).toEqual([100n, 900n]);
    expect(() => calculateSplit({ ...input, participantIds: [2, 2] })).toThrow();
    expect(() => calculateSplit({ ...input, participantIds: [1] })).toThrow();
    expect(() => calculateSplit({ ...input, totalMinor: 1n })).toThrow();
    expect(() => calculateSplit({ ...input, participantIds: [2], shares: [{ userId: 2, amountMinor: 999n }] })).toThrow();
    expect(() => calculateSplit({ ...input, participantIds: [2], shares: [{ userId: 2, amountMinor: 0n }] })).toThrow();
  });
});
