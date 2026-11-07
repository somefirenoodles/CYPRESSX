import "dotenv/config";
import { join } from "node:path";
import express from "express";
import helmet from "helmet";
import { sessionMiddleware } from "./http/auth";
import routes from "./http/routes";
import customerRoutes from "./http/customer-routes";
import moneyWorkflowRoutes from "./http/money-workflow-routes";
import recurrenceRoutes from "./http/recurrence-routes";
import { withConnection } from "./db/oracle";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(express.json({ limit: "32kb" }));
  app.use(sessionMiddleware);

  app.get("/api/health", async (_request, response) => {
    try {
      await withConnection((connection) => connection.execute("SELECT 1 FROM dual"));
      response.json({ status: "ok", database: "oracle" });
    } catch (error) {
      console.error("Oracle health check failed", error);
      response.status(503).json({ status: "unavailable", database: "oracle" });
    }
  });

  app.use("/api", customerRoutes);
  app.use("/api", moneyWorkflowRoutes);
  app.use("/api", recurrenceRoutes);
  app.use("/api", routes);
  app.use("/api", (_request, response) => response.status(404).json({ message: "Ruta API no encontrada." }));

  if (process.env.NODE_ENV === "production") {
    const buildPath = join(process.cwd(), "build");
    app.use(express.static(buildPath, { index: false, maxAge: "1h" }));
    app.get("*", (_request, response) => response.sendFile(join(buildPath, "index.html")));
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const parserType = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
    if (parserType === 'entity.parse.failed') {
      response.status(400).json({ message: 'El cuerpo JSON no es válido.' });
      return;
    }
    if (parserType === 'entity.too.large') {
      response.status(413).json({ message: 'El cuerpo de la solicitud supera el límite permitido.' });
      return;
    }
    console.error("Unhandled API error", error);
    response.status(500).json({ message: "Error interno del servicio." });
  });

  return app;
}

export const app = createApp();
export default app;
