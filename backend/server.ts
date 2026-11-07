import "dotenv/config";
import { app } from "./app";
import { closePool, withConnection } from "./db/oracle";
import { startRecurrenceWorker } from "./domain/recurrence-worker";

const port = Number(process.env.PORT ?? 3001);

async function start() {
  await withConnection((connection) => connection.execute("SELECT 1 FROM dual"));
  const stopRecurrenceWorker = startRecurrenceWorker();
  const server = app.listen(port, () => console.log(`Superpay API escuchando en http://localhost:${port}`));
  const shutdown = () => {
    stopRecurrenceWorker();
    server.close(async () => {
    await closePool();
    process.exit(0);
    });
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

start().catch(async (error) => {
  console.error("No fue posible iniciar Superpay. Comprueba la conexión con Oracle.", error);
  await closePool();
  process.exitCode = 1;
});
