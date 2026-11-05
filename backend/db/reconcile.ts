import 'dotenv/config';
import { closePool, withConnection } from './oracle';
import { reconcileLedger } from '../domain/ledger';

withConnection(reconcileLedger).then((result) => {
  console.log(JSON.stringify(result));
  if (Object.values(result).some((value) => value !== true)) process.exitCode = 1;
}).catch(() => {
  console.error('No se pudo conciliar el ledger en el entorno configurado.');
  process.exitCode = 1;
}).finally(closePool);
