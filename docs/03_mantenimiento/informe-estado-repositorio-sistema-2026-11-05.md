# Examinación estática del código y los módulos de Superpay

**Grupo:** #7
**Integrantes:** Michael Chen, Gabriel Gonzalez y Andres Wu
**Fecha de corte:** 5 de noviembre de 2026
**Revisión:** rama `codex/sandbox-ledger-verification`, commit `7c8d961` (`2026-11-05`)
**Alcance:** lectura estática del código fuente, configuración, migraciones y documentación de arquitectura. No se ejecutaron pruebas ni se evaluó el estado de los contenedores o servicios.

El commit más reciente inspeccionado consolida la aplicación Svelte, la API Express, Oracle y el ledger. El código tiene capas reconocibles, pero varias rutas HTTP combinan validación, autorización, SQL, transacciones, reglas de dominio y construcción de respuestas. `backend/domain/` concentra políticas compartidas, aunque algunos módulos dependen directamente de conexiones Oracle. Esta examinación describe módulos y acoplamientos estáticos; no certifica comportamiento de ejecución.

## 1. Estado del árbol de código

El agente dejó el commit `7c8d961` completo y el árbol limpio al terminar. El cambio reemplaza el runtime React/TSX, GraphQL, Amplify, Yarn y lowdb por Svelte, API TypeScript y Oracle. La revisión actual añade modificaciones locales de interfaz y documentación aún no comprometidas. No se infiere autoría adicional ni se descartan archivos.

## 2. Mapa de módulos

| Módulo | Responsabilidad que se observa | Dependencias / límite actual |
|---|---|---|
| `web/src/` | Interfaz Svelte, composición de pantallas y cliente HTTP en `lib/api.ts` | Consume `/api` directamente. Los tipos de respuesta se apoyan bastante en `any`, lo que reduce el chequeo estático del contrato entre cliente y servidor. |
| `backend/app.ts` | Construye Express, middleware de seguridad, sesión, montaje de rutas y fallback SPA | Conoce todos los routers y el pool Oracle para health check; también concentra manejo global de errores y publicación del build. |
| `backend/server.ts` | Arranque del servidor, conexión inicial a Oracle, worker y cierre | Coordina ciclo de vida del worker y pool; el arranque del worker comparte proceso con el servidor HTTP. |
| `backend/http/auth.ts` | Cookie de sesión, hash de token, carga de usuario y guard `requireUser` | Middleware consulta Oracle por solicitud autenticada; la autenticación está vinculada directamente al repositorio Oracle. |
| `backend/http/routes.ts` | Autenticación, dashboard, FX, pagos, solicitudes y algunos flujos de dinero | Archivo extenso; mezcla esquemas Zod, SQL, transacciones, reglas, notificaciones, ledger y traducción HTTP de errores. |
| `backend/http/customer-routes.ts` | Historial, detalle, usuarios, contactos, cuentas bancarias y notificaciones | Incluye SQL de lectura complejo, validación, mapeo de respuesta y reglas de propiedad de recursos en el router. |
| `backend/http/money-workflow-routes.ts` | Flujos de dinero adicionales, entre ellos división y recepción | La superficie de flujos crece en módulos HTTP; revisar si la política de dinero se mantiene uniforme con el router principal. |
| `backend/http/recurrence-routes.ts` | Crear, listar y actualizar recurrencias | Endpoints orquestan persistencia y reglas de frecuencia/consentimiento con el worker del dominio. |
| `backend/domain/` | Dinero, pagos, ledger, idempotencia, divisiones, notificaciones y política de recurrencia | Reglas reutilizables, pero algunos módulos aceptan `Connection` de Oracle; el dominio conoce detalles de persistencia. |
| `backend/db/` | Pool Oracle, transacciones, migración, seed, conciliación | Es la frontera de infraestructura; el helper `withTransaction` controla commit/rollback, pero el SQL también aparece en rutas y dominio. |
| `database/migrations/` | Evolución del esquema Oracle en seis migraciones | Fuente de estructura persistente; cambios relacionados con ledger y estados de operaciones deben mantenerse coordinados con los módulos TypeScript. |
| `scripts/` | Generación de trazabilidad, evidencia y validaciones especializadas | Parte de los scripts pertenece al proceso documental/QA, no al runtime de producto; sus contratos deben seguir el catálogo fuente. |

## 3. Flujo entre capas

El cliente llama rutas `/api` con `fetch` y cookies de sesión. Express ejecuta `sessionMiddleware`, monta routers y estos validan payloads con Zod. Las rutas leen/escriben Oracle mediante `withConnection` o `withTransaction`; varios flujos llaman funciones de `domain/` y construyen directamente el JSON de salida. En producción, la misma aplicación Express sirve el build estático de Vite.

El flujo de dinero más claro es: endpoint → transacción Oracle → política de idempotencia/creación de operación → contabilización con `postJournal` → notificación persistida → commit → respuesta. La atomicidad de SQL se mantiene corta y no abarca interacción del usuario ni llamadas de red. Esa separación reduce exposición a transacciones largas, pero no constituye una integración externa de pago.

### Límites bien definidos en el código

- Montaje de la aplicación separado del `listen`, mediante `createApp()` y `server.ts`.
- Esquemas de entrada con Zod y conversión de errores a respuestas HTTP.
- Dinero representado en unidades menores con `bigint`; existe un módulo dedicado para formato y validación de divisas.
- Lógica de diario separada en `domain/ledger.ts`, con balanceo por moneda, hash de intención, bloqueo ordenado de cuentas y proyección de saldos.
- Política temporal pura de recurrencias separada del worker que consulta y actualiza Oracle.
- Migraciones SQL versionadas en orden, en lugar de inicialización implícita de tablas desde rutas.

## 4. Acoplamientos y deuda de modularidad

### Rutas con demasiadas responsabilidades

`backend/http/routes.ts` y `customer-routes.ts` hacen más que traducir HTTP. En las rutas se ven consultas SQL, control de transacciones, validación de dominio, política de autorización y mapeo de entidades. Cambiar el contrato HTTP o el esquema Oracle puede requerir editar varios handlers; también dificulta probar casos de uso sin Express y Oracle. Este es el principal foco de acoplamiento observable.

### Dominio dependiente de Oracle

`ledger.ts`, `idempotency.ts`, `payments.ts` y notificaciones reciben conexiones Oracle o ejecutan SQL dentro de operaciones de dominio. Esto mantiene explícita la transacción y evita capas abstractas sin uso, pero significa que el dominio no es intercambiable ni ejecutable de forma aislada sin una conexión compatible. No hace falta introducir microservicios: un primer límite útil sería separar funciones de caso de uso del transporte HTTP y mantener las interfaces de persistencia pequeñas y concretas.

### Contratos de API débiles en el cliente

En `web/src/lib/api.ts`, las funciones de sesión, dashboard y varias respuestas retornan `any`. La validación del servidor protege entradas, pero el frontend no recibe comprobación estática consistente del esquema de respuesta. Los cambios de nombres o campos pueden compilar en cliente y servidor sin alertar sobre una discrepancia semántica. Un contrato TypeScript compartido o tipos explícitos por endpoint reducirían ese riesgo sin cambiar el stack.

### Duplicación de política y errores

Los routers tienen helpers propios de parsing, validación de parámetros y traducción de errores Oracle; las respuestas genéricas no parecen centralizadas en todos los módulos. Reglas como formato de error, conflictos por unique constraints y propiedad del recurso pueden variar si se implementan con distintos helpers. Conviene inventariar esas variantes antes de consolidar, no hacer una extracción global sin comparar contratos actuales.

### Ciclo de vida de recurrencias

El worker vive en el proceso del servidor y usa un `setInterval`; en una sola instancia eso simplifica operación local. A nivel de módulo, el booleano `running` impide pasadas concurrentes solo dentro de ese proceso. Aunque el query de fila usa `FOR UPDATE SKIP LOCKED`, el diseño no define elección de líder ni política de múltiples workers a escala de varias instancias. Es una limitación arquitectónica documentable, no una falla observada en ejecución.

## 5. Módulo financiero: responsabilidades y revisión estática

El ledger centraliza una invariante valiosa: cada asiento debe cuadrar por moneda. Los montos se representan como enteros menores, la cuenta de sistema se explicita para contrapartidas, las cuentas tocadas se bloquean en orden estable y los balances guardados se actualizan como proyección. La unicidad por operación y el hash del asiento permiten tratar reintentos coherentes como replay y rechazar payloads conflictivos.

Aspectos que merecen revisión de código enfocada, antes de ampliar funciones:

- `reconcileLedger()` agrupa entradas por `operation_id` y moneda, mientras las reglas de posting validan balance por asiento y moneda. Verificar que el esquema garantice una relación inequívoca entre una operación y un único asiento publicado, o alinear la consulta de conciliación con `journal_id`.
- Se encontraron textos de alcance de implementación en la UI y mensajes de API. En esta revisión se retiraron del cliente y de los mensajes expuestos; el límite financiero quedó concentrado en la nota técnica cerrada.
- El cálculo de balance lee la suma histórica del ledger para las cuentas bloqueadas en cada posting. La corrección es clara desde el código; el costo de consulta no puede juzgarse sin planes/mediciones y queda fuera de esta revisión estática.
- FX y contrapartidas operan con tasas/entidades internas; `postJournal` no se comunica con proveedor de FX, adquirente o red bancaria. El módulo representa contabilidad interna del producto, no liquidación externa.
- La frontera de atomicidad depende de que los llamadores invoquen estas funciones dentro de la transacción externa. La documentación/comentario lo indica; conviene mantener esa precondición en tipos/API para evitar nuevos llamadores fuera del contexto correcto.

## 6. Web y presentación

La app cliente está concentrada principalmente en `App.svelte` y componentes de `web/src/lib/` como `AccountTools.svelte`, `History.svelte` y `SplitForm.svelte`. El cliente API ofrece una única entrada `api`, que centraliza rutas y serialización, lo cual es un límite útil. Sin embargo, varios métodos y tipos están escritos en el mismo archivo y las respuestas usan `any`; un crecimiento de funcionalidades puede hacer que el contrato y las interacciones de pantalla sean difíciles de rastrear.

La interfaz reunía etiquetas técnicas junto a pagos, saldo, cuentas y recepción. Se retiraron las advertencias visibles y se ajustaron los mensajes que la API devolvía a los usuarios. La nota cerrada de alcance financiero queda como única descripción técnica de ese límite; los identificadores internos de persistencia y rutas no cambian.

## 7. Persistencia y esquema

Oracle se accede mediante `node-oracledb` Thin, un pool singleton y helpers `withConnection`/`withTransaction`. La configuración queda en variables de entorno y el módulo cierra conexiones en el ciclo de apagado. Las consultas usan binds para valores; hay SQL parametrizado junto con consultas de lectura declaradas localmente en routers y dominio.

Las seis migraciones reflejan crecimiento por etapas: esquema inicial, idempotencia, flujos de cliente, recepción, ciclo de recurrencia y ledger autoritativo. Al modificar una regla persistida, se deben revisar en conjunto constraints, índices, triggers, migrador, consultas TypeScript, seed y conciliación. El esquema Oracle es parte del contrato del dominio y no un detalle sustituible sin impacto.

## 8. Herramientas y consistencia del repositorio

El stack vigente se declara ahora en `README.md` y `docs/00_proyecto/README.md`, con Svelte 5.57.1, TypeScript 5.9.3, Vite 8.3.3, Express 4.22.3, Zod 4.6.7, Oracle 23, `node-oracledb` 7.0.1, Node 22.20.0 y pnpm 10.12.1. `docs/04_arquitectura/arquitectura-objetivo.md` fue sincronizado con esas versiones y describe los módulos del runtime. El catálogo `docs/01_requisitos/catalogo.json` sigue como fuente de ERS, CU, CP, RNF y matriz.

## 9. Prioridades de mantenimiento basadas en el código

| Prioridad | Trabajo | Motivo y límite sugerido |
|---|---|---|
| 1 | Mantener el copy de interfaz sin etiquetas de implementación | Se ajustaron las pantallas y mensajes de API en esta revisión; queda pendiente validarlo con los criterios del producto. |
| 2 | Mantener alineados los documentos de producto y stack | README, índice técnico y ficha de arquitectura fueron sincronizados con el stack vigente. |
| 3 | Reducir `any` del cliente API y describir los DTO principales | Mejora el contrato web/API sin alterar rutas ni persistencia. |
| 4 | Dividir responsabilidades de rutas por caso de uso | Empezar por un flujo pequeño, conservando endpoint, respuesta y límites transaccionales. Evitar una reescritura de todos los routers a la vez. |
| 5 | Revisar invariantes/conciliación del ledger | Comparar esquema, claves y agrupaciones por operación/asiento; requiere revisión específica y validación Oracle posterior, no cambio casual. |
| 6 | Documentar el modelo operativo del worker | Aclarar alcance de una instancia y condiciones para ejecutar varias; no añadir colas o servicios mientras no exista requerimiento probado. |

## 10. Alcance de la evidencia

El informe local del 4 de noviembre registra 48/48 Vitest (23 unitarias y 25 integraciones Oracle/Supertest), 5/5 Cypress con API interceptada, 9/9 pruebas Node/tooling, tipos y build aprobados, migraciones y conciliación Oracle y cinco comprobaciones HTTP sobre imagen con Oracle desechable. La huella de fuentes de ese informe (`a80dbdc5223ffefd37db404259d4423429de3954419a7353da5b18e7cc9a9777`) coincide con la del commit inspeccionado `7c8d961`, por lo que los resultados de código del día anterior corresponden a estas fuentes. El informe original registra que la ejecución inició en `afd5da9` con árbol sucio; el commit posterior consolidó esas mismas fuentes. Los cambios locales de copy, contrato HTTP y documentación realizados durante esta revisión son posteriores a esa huella y no están cubiertos por aquella campaña.

Esa campaña ya cubre varios límites de seguridad y consistencia que esta examinación estática no volvió a ejecutar. No demuestra cobertura integral de todos los endpoints, criterios, recorridos visuales integrados, carga, recuperación de respaldos, ejecución multi-réplica ni experiencia con usuarios. No se ejecutaron pruebas ni builds durante la presente revisión. Los acoplamientos y riesgos descritos se derivan de la distribución de código inspeccionada; no se reportan como fallos reproducidos.

## Archivos revisados

- `package.json`, `tsconfig.json`, `vite.config.ts`, `docker-compose.yml`, `Dockerfile`.
- `backend/app.ts`, `backend/server.ts`, `backend/http/auth.ts`, `backend/http/routes.ts`, `backend/http/customer-routes.ts`, `backend/http/money-workflow-routes.ts`, `backend/http/recurrence-routes.ts`.
- `backend/domain/ledger.ts`, `payments.ts`, `money.ts`, `idempotency.ts`, `notifications.ts`, `splits.ts`, `recurrence-policy.ts`, `recurrence-worker.ts`.
- `backend/db/oracle.ts`, `backend/db/migrate.ts`, `database/migrations/001` a `006`.
- `web/src/App.svelte`, `web/src/lib/api.ts`, componentes de `web/src/lib/`.
- `docs/01_requisitos/catalogo.json`, `docs/04_arquitectura/arquitectura-objetivo.md`, `docs/04_arquitectura/ledger-interno.md`, `docs/04_arquitectura/flujos-financieros.md`, `docs/04_arquitectura/alcance-financiero-cerrado.md`.
- Evidencia previa: `docs/02_pruebas/informe-verificacion-2026-11-04.md` y `reports/run.json`.
