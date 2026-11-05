# Entorno oficial: Windows nativo

## Requisitos

- Windows 10/11 y PowerShell 5.1 o 7+.
- Git, Docker Desktop con Compose, Node.js 22.20.0 (`.node-version`) y pnpm 10.12.1 (`packageManager`).
- Oracle Database Free 23 para el servicio local; el driver activo es `node-oracledb` 7 Thin.

## Preparación

Desde la raíz del repositorio:

```powershell
Copy-Item .env.example .env
```

Revisa los nombres de variables documentados en `.env.example` y define credenciales locales propias en `.env`; no publiques el archivo ni sus valores. Instala dependencias y arranca Oracle:

```powershell
pnpm install --frozen-lockfile
docker compose up -d oracle
```

Oracle publica su listener local en `127.0.0.1:1887` (servicio `FREEPDB1`). El servicio `app` de Compose se conecta internamente a `oracle:1521`; no cambies ese destino interno.

Cuando el contenedor esté saludable, crea el esquema y los datos sandbox de demo:

```powershell
pnpm db:setup
```

## Ejecución

```powershell
pnpm dev
```

El cliente Svelte se sirve en `http://localhost:3000`; la API Express en `http://localhost:3001`. El modo local requiere Oracle activo y la configuración `DB_USER`, `DB_PASSWORD` y `DB_CONNECT_STRING`; `PORT` puede ajustar el puerto API.

## Pruebas y build

```powershell
pnpm types
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm test` ejecuta Vitest. La integración Oracle se omite si `DB_CONNECT_STRING` no está configurado y requiere esquema accesible. `pnpm test:e2e` inicia la UI y corre Cypress en navegador; revisar el spec para distinguir interceptores de API real. Las cotizaciones, fondos y comercios son exclusivamente sandbox.

Cypress E2E selecciona Edge en Windows (Chrome en Linux), sin Electron. La integración Oracle figura en CI con Oracle Free, pero en la última revisión local no se pudo ejecutar porque Docker daemon estaba apagado; iniciar Oracle localmente antes de usarla. Para validar el contenedor de producción: `docker compose up -d --build app`; Compose espera a que Oracle esté saludable y publica la web en `http://localhost:3000`.

## Estado y límites

La persistencia activa está en Oracle. Los archivos React, GraphQL, Amplify, Yarn y lowdb/JSON del producto anterior fueron retirados; no seguir instrucciones heredadas basadas en esas herramientas.

La automatización CI está en `.github/workflows/main.yml` y configura pnpm, Node, Oracle, migración/seed, tests y build. Esta guía no certifica que una ejecución local o CI haya pasado; registrar el resultado al ejecutar los comandos.
