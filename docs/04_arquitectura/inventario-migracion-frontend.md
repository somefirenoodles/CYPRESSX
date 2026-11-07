# Inventario del frontend activo

**Estado:** inventario estático del cliente web actual; no acredita paridad completa con todos los requisitos.

## UI y flujos activos

Vite monta `web/src/main.ts`; `web/src/App.svelte` contiene navegación interna, vistas y estados de acceso. La vista cambia por el estado `page`; no hay una URL independiente para cada pantalla.

| Vista | Comportamiento |
|---|---|
| Acceso/registro | Inicio de sesión, registro local y cierre de sesión mediante API. |
| Resumen/actividad | Saldos, operaciones recientes e historial del dashboard. |
| Enviar pago | Formulario P2P y revisión previa cuando cambia la moneda de destino. |
| Solicitudes | Creación, listado y resolución de solicitudes entrantes. |
| División | Reparto con participantes, montos y solicitudes individuales. |
| Recurrentes | Crear, listar, pausar, reactivar, modificar y cancelar programaciones. |
| Pago a comercio | Seleccionar comercio, revisar importe y moneda y confirmar el pago. |
| Herramientas de cuenta | Contactos, cuentas, notificaciones y recepción de fondos. |

`AccountTools.svelte` agrupa herramientas de cuenta; `History.svelte` presenta filtros, paginación y detalle; `SplitForm.svelte` implementa vista previa, reparto personalizado e inclusión del organizador.

## Stack y pruebas activas

- `vite.config.ts` fija la raíz `web/` y el plugin Svelte; `web/src/app.css` contiene los estilos.
- `web/src/lib/api.ts` concentra llamadas `/api`.
- Vitest incluye `web/src/**/*.test.ts`, con funciones de dominio e integración API/Oracle condicionada a `DB_CONNECT_STRING`.
- Cypress E2E usa `cypress.config.ts` y `cypress/e2e/`; los flujos de navegador interceptan `/api`.
- No hay Cypress Component Testing configurado.

## Límites del inventario

La SPA React/TSX y sus pruebas, las rutas GraphQL y el backend lowdb/JSON se retiraron del camino actual. El frontend está en `web/`, API en `backend/` y esquema en `database/`. La matriz vigente y la evidencia por ejecución definen el estado de criterios.
