# Inventario del frontend activo y limpieza del árbol heredado

**Estado:** la migración del camino activo a Svelte está implementada y las fuentes obsoletas React/lowdb/GraphQL se eliminaron. Este inventario no certifica paridad completa con requisitos.

## UI y flujos activos

Vite monta `web/src/main.ts`; `web/src/App.svelte` contiene la aplicación, navegación interna y estados de acceso. La vista cambia por estado `page` local; no hay sistema de rutas URL para cada pantalla.

| Vista | Comportamiento visible |
|---|---|
| Acceso/registro | Login y registro local vía API; logout y cookie de sesión. Sin proveedores externos. |
| Resumen/actividad | Muestra balance sandbox, operaciones recientes e historial devuelto por dashboard. |
| Enviar pago | Formulario P2P; FX fixture cuando moneda de destino difiere. |
| Solicitudes | Crear, listar recibidas/enviadas y aceptar/rechazar las entrantes pendientes. |
| División | Crear reparto sandbox con participantes por ID; endpoint crea solicitudes individuales. |
| Recurrentes | Crear, listar, pausar, activar y cancelar instrucciones; worker ejecuta vencimientos sandbox. |
| Pago a comercio | Lista comercios demo; cotiza FX fixture si hace falta y envía pago sandbox. |

`AccountTools.svelte` añade contactos, cuentas ficticias enmascaradas, notificaciones y recepción simulada; `History.svelte` incorpora filtros, paginación y detalle privado; `SplitForm.svelte` implementa revisión exacta, reparto personalizado e inclusión del organizador. No hay recepción de un proveedor real ni administración de perfil/recuperación de acceso.

## Stack y pruebas activas

- `vite.config.ts` fija raíz `web/` y plugin Svelte. `web/src/app.css` define estilos del cliente.
- `web/src/lib/api.ts` concentra llamadas `/api`; `web/src/lib/money.test.ts` valida precisión/fx de fixture y `oracle.integration.test.ts` contiene prueba API/Oracle condicional a `DB_CONNECT_STRING`.
- Cypress E2E está configurado en `cypress.config.ts` para `cypress/e2e/**/*.cy.ts`; hoy hay `cypress/e2e/payments.cy.ts`. El spec intercepta `/api`, por lo que no sustituye la prueba Oracle real.
- Vitest incluye `web/src/**/*.test.ts` en Vite. No hay Cypress Component Testing configurado en el camino activo.

## Limpieza de fuentes legacy

La migración retiró la SPA React/TSX y sus pruebas, rutas GraphQL y backend lowdb/JSON, configuración Amplify, Yarn y parches/dependencias asociados. El frontend activo vive en `web/`, el servidor API en `backend/` y el esquema Oracle en `database/`. No se conservan las antiguas suites como pruebas activas.

## Criterio para hablar de paridad

La presencia de un formulario no acredita todos los criterios. El estado vigente se consulta en la [matriz única](../01_requisitos/matriz-trazabilidad.md) y los artefactos por revisión. Las pruebas Cypress con API interceptada y las pruebas Oracle reales se publican por separado.
