import { expect, it } from 'vitest';
import { nextFutureOccurrence, nextOccurrence, occurrenceKey, retryDelay } from '../../../backend/domain/recurrence-policy';

it('[CP-CAL-01] conserva el día ancla UTC al pasar por febrero y un año bisiesto', () => {
  const january = new Date('2026-01-31T15:30:00.000Z');
  const february = nextOccurrence(january, 'monthly', 31);
  expect(february.toISOString()).toBe('2026-02-28T15:30:00.000Z');
  expect(nextOccurrence(february, 'monthly', 31).toISOString()).toBe('2026-03-31T15:30:00.000Z');
  expect(nextOccurrence(new Date('2028-01-31T00:00:00Z'), 'monthly', 31).toISOString()).toBe('2028-02-29T00:00:00.000Z');
  expect(nextOccurrence(january, 'quarterly', 31).toISOString()).toBe('2026-04-30T15:30:00.000Z');
});
it('[CP-CAL-02] limita los reintentos y conserva la identidad de la ocurrencia', () => {
  expect([0, 1, 2, 3, -1].map(retryDelay)).toEqual([3_600_000, 86_400_000, 259_200_000, null, null]);
  const nominal = new Date('2026-11-04T15:00:00Z');
  expect(occurrenceKey(1, nominal)).toBe(occurrenceKey(1, new Date(nominal)));
  expect(occurrenceKey(1, nominal)).not.toBe(occurrenceKey(2, nominal));
});
it('[CP-CAL-03] salta ciclos perdidos sin acumular cobros', () => {
  expect(nextFutureOccurrence(new Date('2026-01-31T15:30:00Z'), new Date('2026-04-02T00:00:00Z'), 'monthly', 31).toISOString()).toBe('2026-04-30T15:30:00.000Z');
  expect(nextOccurrence(new Date('2026-03-01T05:00:00Z'), 'weekly', 1).toISOString()).toBe('2026-03-08T05:00:00.000Z');
});
