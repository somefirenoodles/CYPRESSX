import "dotenv/config";
import { closePool, withConnection } from "./oracle";

const merchants = [
  { name: "Café Istmo", category: "Restaurantes", currency: "USD", country: "PA" },
  { name: "Pacific Market", category: "Compras", currency: "USD", country: "US" },
  { name: "Mercado Andino", category: "Compras", currency: "COP", country: "CO" },
  { name: "Pura Vida Shop", category: "Compras", currency: "CRC", country: "CR" },
];

async function main() {
  await withConnection(async (connection) => {
    for (const merchant of merchants) {
      await connection.execute(
        `MERGE INTO cx_merchants target
         USING (SELECT :name name, :category category, :currency currency, :country country FROM dual) source
         ON (target.name = source.name)
         WHEN MATCHED THEN UPDATE SET target.category = source.category, target.currency = source.currency, target.country_code = source.country, target.active = 'Y'
         WHEN NOT MATCHED THEN INSERT (name, category, currency, country_code, active)
         VALUES (source.name, source.category, source.currency, source.country, 'Y')`,
        merchant,
        { autoCommit: false }
      );
    }
    await connection.commit();
  });
  console.log("Comercios cargados.");
}

main().catch((error) => {
  console.error("No se pudieron cargar los datos.", error);
  process.exitCode = 1;
}).finally(closePool);
