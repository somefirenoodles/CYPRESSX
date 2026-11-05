# Superpay — producto y línea base técnica

## Línea base vigente

La [ERS](../01_requisitos/ers.md), los [CU](../01_requisitos/casos-uso.md), los [RNF SQuaRE](../01_requisitos/rnf-square.md) y la [matriz única](../01_requisitos/matriz-trazabilidad.md) se generan desde `catalogo.json`. El [ledger interno](../04_arquitectura/ledger-interno.md) registra la decisión de concurrencia y contabilización.

## Propósito e identidad

**Superpay** es la adaptación académica de Cypress Real World App para prácticas de pruebas, mantenimiento y aseguramiento de calidad. El producto objetivo es una aplicación web completa y operable en sandbox, no una miniapp. El sandbox simula saldos, pagos, FX y comercios: no mueve dinero real ni usa cotizaciones de mercado. Se conserva la atribución y licencia MIT originales.

## Estado técnico del repo

El runtime activo ya es:

- Cliente Svelte 5 + TypeScript + Vite 8 en `web/`.
- API modular Express + TypeScript en `backend/`.
- Oracle Database Free con `node-oracledb` 7 Thin; schema SQL versionado en `database/migrations/`.
- Ledger y balances expresados en unidades menores enteras (dos decimales para USD/COP/CRC en el código actual).
- Sesiones opacas con hash persistido en Oracle.
- Cotizaciones calculadas con tasas fijas de fixture, marcadas como demostración; no son cotizaciones de mercado.
- Vitest y Cypress E2E; pnpm 10.12.1, Node.js 22.20.0 y Docker Compose para Oracle local.
- `Dockerfile` multi-stage y servicio Compose `app`: el modo producción sirve el build Svelte desde Express. `tsx` es dependencia de runtime; E2E usa Edge/Chrome, sin Electron.

Los árboles React/TSX, lowdb/JSON, GraphQL y configuraciones de Amplify/Yarn heredadas fueron eliminados durante la migración; no forman parte del árbol actual. El cliente activo está bajo `web/`, con persistencia Oracle.

El sistema opera con fondos ficticios. Incluye contactos, cuentas bancarias ficticias enmascaradas, notificaciones durables, detalle e historial privado, divisiones con revisión y recurrencias con consentimiento/reintentos. La recepción externa es simulada y correlacionada por referencia, sin un proveedor conectado.

## Producto, arquitectura y prueba

- [Alcance de producto revisado](../01_requisitos/alcance-producto-revisado.md): corredores, sandbox y reglas funcionales. Los requisitos describen aceptación, no por sí solos prueba dinámica.
- [Arquitectura implementada](../04_arquitectura/arquitectura-objetivo.md): stack y límites observados en código.
- [Esquema Oracle](../04_arquitectura/esquema-oracle-propuesto.md): actualizado contra la migración SQL activa; señala limitaciones conocidas.
- [Contratos/operaciones sandbox](../04_arquitectura/contrato-adaptador-sandbox.md): conducta local implementada y límites; no hay conexión de proveedor de pagos externo.
- [Invariantes financieros](../01_requisitos/invariantes-financieros-sandbox.md): estados, balances, ledger, atomicidad, concurrencia y brechas.
- [Auditoría de implementación](../03_mantenimiento/auditoria-brecha-arquitectura-objetivo.md): verificación estática del runtime y gaps no resolubles por inspección.
- [Inventario frontend](../04_arquitectura/inventario-migracion-frontend.md): identifica el cliente activo Svelte y resume la limpieza del frontend legacy.
- [Normas y estrategia de pruebas](../02_pruebas/normas-y-estrategia-pruebas.md): stack ejecutable, rutas de test y límites de evidencia.
- [Requisitos y reglas transaccionales](../01_requisitos/requisitos-transacciones.md), [reglas de negocio](../01_requisitos/reglas-negocio-transacciones.md), [casos de uso](../01_requisitos/casos-uso-transacciones.md), y [ampliación](../01_requisitos/requisitos-ampliacion.md) / [casos de uso ampliados](../01_requisitos/casos-uso-ampliacion.md).
- [Defectos históricos](../03_mantenimiento/defectos-reservados.md): estado de DF heredados y diferencia con las rutas nuevas.
- [Entorno Windows](./entorno-windows.md): preparación local con pnpm, Docker Compose y Oracle.

La integración Oracle está condicionada a `DB_CONNECT_STRING`; CI prepara Oracle Free. `pnpm test:oracle:isolated` valida migraciones, API y conciliación en una instancia desechable sin leer `.env` ni reutilizar la base de trabajo. Las ejecuciones observadas se publican en artefactos por revisión y huella de fuentes.

## Alcance académico y trazabilidad

Los cambios deben separar especificación de implementación y de resultados de prueba. Solo afirmar pruebas aprobadas con evidencia de ejecución (commit, entorno, datos, comando, resultado esperado/observado y CP asociado). Conservar IDs estables y proteger datos de prueba sensibles.

La atribución a Cypress Real World App y la licencia MIT permanecen vigentes. Los defectos identificados en el backend heredado se documentan históricamente; no deben describirse como fallas del runtime activo sin verificación.
