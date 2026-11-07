# Superpay

Todo lo que quieras pagar.

El repositorio conserva la licencia MIT y atribución de Cypress Real World App en [`LICENSE`](./LICENSE).

## Stack activo

- Svelte 5 + TypeScript + Vite 8 (`web/`), en `http://localhost:3000`.
- API modular Express + TypeScript (`backend/`), en `http://localhost:3001`.
- Oracle Database Free 23 local y `node-oracledb` 7 Thin; ledger y balances en unidades menores enteras.
- Sesiones opacas persistidas en Oracle; cotizaciones FX con tasas fijas de fixture de demostración.
- Vitest para unitarias/integración Oracle y Cypress para E2E web.
- Dockerfile multi-stage y servicio Compose `app`: en producción Express sirve el build Svelte; `tsx` se conserva como dependencia de runtime. Cypress E2E usa Edge en Windows o Chrome en Linux, sin Electron.
- Node.js 22.20.0 y pnpm 10.12.1. La SPA React, lowdb, GraphQL, Amplify y proveedores de autenticación antiguos fueron retirados del árbol de trabajo.

## Inicio local (Windows / PowerShell)

1. Instala Node.js 22.20.0, pnpm 10.12.1 y Docker Desktop.
2. Crea `.env` a partir de `.env.example` y define credenciales locales propias. No uses valores productivos.
3. Ejecuta:

```powershell
pnpm install --frozen-lockfile
docker compose up -d oracle
pnpm db:setup
pnpm dev
```

La UI inicia en `http://localhost:3000`; la API en `http://localhost:3001`. Registra una cuenta de prueba desde la pantalla. El alta crea fondos ficticios iniciales en sandbox.

Para ejecutar la imagen de producción local con Compose (app en `http://localhost:3000`, Oracle como dependencia):

```powershell
docker compose up -d --build app
```

## Verificación

```powershell
pnpm types
pnpm test
pnpm build
pnpm test:e2e
```

La integración Oracle se omite si no está configurada. `pnpm test:oracle:isolated` crea un Oracle desechable y ejecuta migraciones, pruebas y conciliación sin reutilizar la base de trabajo. `pnpm docs:check` valida ERS/CU/RNF/trazabilidad y `pnpm ledger:check` concilia el entorno configurado. Los cinco escenarios Cypress usan respuestas API interceptadas; la integración de persistencia se prueba por separado.

## Documentación del proyecto

La [ERS](docs/01_requisitos/ers.md), los [CU](docs/01_requisitos/casos-uso.md) y la [matriz única](docs/01_requisitos/matriz-trazabilidad.md) se generan desde un catálogo. Consulta la decisión del [ledger interno autoritativo](docs/04_arquitectura/ledger-interno.md).

La guía reproducible está en [`docs/00_proyecto/entorno-windows.md`](./docs/00_proyecto/entorno-windows.md). La arquitectura, requisitos, invariantes, brechas y estrategia de prueba se navegan desde [`docs/00_proyecto/README.md`](./docs/00_proyecto/README.md).
