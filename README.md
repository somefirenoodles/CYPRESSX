# Superpay

Todo lo que quieras pagar.

Superpay ofrece una aplicación web de pagos con transferencias entre usuarios, solicitudes, división de gastos, pagos recurrentes, pagos a comercios e historial. Este repositorio contiene el producto web, su API, persistencia relacional y la estrategia de mantenimiento y calidad. La atribución y licencia MIT de Cypress Real World App se conserva en [`LICENSE`](./LICENSE).

## Stack vigente

| Área | Tecnología | Versión o referencia |
|---|---|---|
| Cliente | Svelte + TypeScript + Vite | Svelte 5.57.1, TypeScript 5.9.3, Vite 8.3.3 |
| API | Express + TypeScript + Zod | Express 4.22.3, Zod 4.6.7 |
| Datos | Oracle Database Free + node-oracledb Thin | Oracle 23, driver 7.0.1 |
| Validación | Vitest, Cypress, Node test runner | Suites y comandos en `package.json` |
| Entorno | Node.js, pnpm, Docker Compose | Node 22.20.0, pnpm 10.12.1 |

La estructura activa se organiza en `web/`, `backend/http/`, `backend/domain/`, `backend/db/` y `database/migrations/`. La arquitectura y los módulos se detallan en [`docs/04_arquitectura/arquitectura-objetivo.md`](./docs/04_arquitectura/arquitectura-objetivo.md). El alcance financiero cerrado se registra en una nota técnica única.

## Inicio local en Windows

1. Instala Node.js 22.20.0, pnpm 10.12.1 y Docker Desktop.
2. Crea `.env` a partir de `.env.example` y define credenciales locales propias.
3. Ejecuta:

```powershell
pnpm install --frozen-lockfile
docker compose up -d oracle
pnpm db:setup
pnpm dev
```

La interfaz inicia en `http://localhost:3000` y la API en `http://localhost:3001`. Crea una cuenta desde la pantalla de acceso.

Para iniciar el contenedor de la aplicación junto con Oracle:

```powershell
docker compose up -d --build app
```

## Comandos del repositorio

```powershell
pnpm types
pnpm test
pnpm build
pnpm test:e2e
```

La integración Oracle se omite si `DB_CONNECT_STRING` no está configurada. `pnpm test:oracle:isolated` crea una instancia desechable para migraciones, API y conciliación. `pnpm docs:check` revisa los documentos generados; `pnpm ledger:check` concilia la base configurada. Cypress ejecuta los flujos web con respuestas API interceptadas; la persistencia se valida por separado.

## Documentación

La [línea base de negocio y trazabilidad](./docs/01_requisitos/catalogo.json) es la fuente para ERS, CU, CP, RNF y matriz. La [arquitectura implementada](./docs/04_arquitectura/arquitectura-objetivo.md) describe stack y límites de módulos. El [índice del proyecto](./docs/00_proyecto/README.md) reúne reglas, pruebas, mantenimiento y entorno local.

El [flujo de contribución](./CONTRIBUTING.md) explica qué se versiona, cómo coordinar cambios de código con trazabilidad y dónde guardar informes locales.
