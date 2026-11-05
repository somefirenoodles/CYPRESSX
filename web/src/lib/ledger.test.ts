import { expect, it } from 'vitest';
import { journalHash, validateJournal, type LedgerEntry } from '../../../backend/domain/ledger';
import { splitMigration } from '../../../backend/db/sql-script';

const pair: LedgerEntry[] = [
  { accountId: 1, currency: 'USD', amountMinor: -100n, type: 'debit' },
  { accountId: 2, currency: 'USD', amountMinor: 100n, type: 'credit' },
];
it('[CP-LED-01] exige doble partida balanceada por moneda', () => {
  expect(() => validateJournal(pair)).not.toThrow();
  expect(() => validateJournal(pair.slice(0, 1))).toThrow();
  expect(() => validateJournal([pair[0], { ...pair[1], amountMinor: 99n }])).toThrow('cuadrar');
  expect(() => validateJournal([pair[0], { ...pair[1], currency: 'COP' }])).toThrow('cuadrar');
  expect(() => validateJournal([{ ...pair[0], amountMinor: 0n }, pair[1]])).toThrow();
});
it('[CP-LED-02] identifica contrapartidas y conserva el hash al reordenar partidas', () => {
  expect(journalHash(pair)).toBe(journalHash([...pair].reverse()));
  expect(journalHash(pair)).not.toBe(journalHash(pair.map((entry) => ({ ...entry, amountMinor: entry.amountMinor * 2n }))));
  expect(() => validateJournal([{ ...pair[0], accountId: null }, pair[1]])).toThrow('contrapartida');
  expect(() => validateJournal([{ ...pair[0], accountId: null, systemAccount: 'system:fx:COP' }, pair[1]])).toThrow();
});
it('[CP-LED-03] mantiene FX balanceado con cuentas puente separadas por moneda', () => {
  expect(() => validateJournal([
    pair[0], { accountId: null, systemAccount: 'system:fx:USD', currency: 'USD', amountMinor: 100n, type: 'fx_clearing' },
    { accountId: null, systemAccount: 'system:fx:COP', currency: 'COP', amountMinor: -410000n, type: 'fx_clearing' },
    { accountId: 2, currency: 'COP', amountMinor: 410000n, type: 'credit' },
  ])).not.toThrow();
});
it('[CP-SQL-01] separa SQL y triggers sin romper literales ni comentarios', () => {
  const script = "-- comentario con ;\nINSERT INTO t VALUES ('a;''b');\nCREATE OR REPLACE TRIGGER guard\nBEFORE DELETE ON t\nBEGIN\n RAISE_APPLICATION_ERROR(-20001, 'inmutable;');\nEND;\n/\nSELECT 1 FROM dual;";
  const parts = splitMigration(script);
  expect(parts).toHaveLength(3);
  expect(parts[0]).toContain("'a;''b'");
  expect(parts[1]).toContain('END;');
  expect(parts[2]).toBe('SELECT 1 FROM dual');
  expect(() => splitMigration('CREATE TRIGGER t BEFORE DELETE ON x BEGIN NULL; END;')).toThrow();
});
