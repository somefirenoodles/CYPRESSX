import { describe, expect, it } from 'vitest';
import { canonicalJson, hashIdempotencyPayload, isValidIdempotencyKey } from '../../../backend/domain/idempotency';

describe('Contrato de idempotencia', () => {
  it('[CP-IDEM-01] conserva la intención al cambiar el orden de claves', () => {
    expect(hashIdempotencyPayload({ amount: '10.01', recipient: 3, metadata: { a: 1, b: 2 } }))
      .toBe(hashIdempotencyPayload({ metadata: { b: 2, a: 1 }, recipient: 3, amount: '10.01' }));
  });
  it('[CP-IDEM-02] distingue importes, destinatarios, monedas y orden de participantes', () => {
    const original = { amount: '10.01', recipient: 3, currency: 'USD', participants: [2, 3] };
    const hash = hashIdempotencyPayload(original);
    for (const change of [{ amount: '10.02' }, { recipient: 4 }, { currency: 'COP' }, { participants: [3, 2] }]) {
      expect(hashIdempotencyPayload({ ...original, ...change })).not.toBe(hash);
    }
  });
  it('[CP-IDEM-03] rechaza claves inválidas y payloads no serializables', () => {
    for (const key of ['', 'short', 'x'.repeat(81), 'clave inválida', ':1234567']) expect(isValidIdempotencyKey(key)).toBe(false);
    expect(isValidIdempotencyKey('recurrence:12:2026-11-04T15:00:00.000Z')).toBe(true);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => canonicalJson(circular)).toThrow('circular');
    expect(() => canonicalJson({ amount: Infinity })).toThrow('no finito');
  });
});
