# Superpay — producto y línea base técnica

## Línea base de negocio

Superpay ofrece pagos entre usuarios y a comercios, solicitudes de pago, división de gastos, pagos recurrentes, cotizaciones entre USD/COP/CRC, contactos, cuentas, notificaciones e historial. La [línea base de requisitos](../01_requisitos/catalogo.json) define alcance, reglas de negocio, criterios de aceptación y trazabilidad. Sus vistas ERS/CU/CP/RNF/matriz se generan con `pnpm docs:generate`.

La identidad visual y funcional se organiza alrededor de una aplicación web adaptable. La navegación de producto y sus flujos están en `web/src/App.svelte` y `web/src/lib/`.

## Stack y arquitectura activa

- Cliente: Svelte 5.57.1, TypeScript 5.9.3 y Vite 8.3.3.
- API: Express 4.22.3, TypeScript y Zod 4.6.7.
- Persistencia: Oracle Database Free 23 mediante `node-oracledb` 7.0.1 Thin y migraciones SQL en `database/migrations/`.
- Dominio: ledger de doble entrada, idempotencia, cálculo exacto de dinero, pagos, divisiones, notificaciones y política de recurrencia bajo `backend/domain/`.
- Ejecución y calidad: Node 22.20.0, pnpm 10.12.1, Docker Compose, Vitest, Cypress en Edge/Chrome y Node test runner.
- Servidor: `backend/server.ts` inicia Express y el worker; `backend/app.ts` compone middleware, rutas y build web.

La [arquitectura implementada](../04_arquitectura/arquitectura-objetivo.md) es la referencia para responsabilidades y dependencias. La [nota financiera cerrada](../04_arquitectura/alcance-financiero-cerrado.md) contiene el límite del flujo de fondos.

## Documentos por área

- [Reglas y requisitos](../01_requisitos/catalogo.json): fuente de RF, RNF, CU, CP y relaciones.
- [ERS](../01_requisitos/ers.md), [casos de uso](../01_requisitos/casos-uso.md), [RNF y evaluación SQuaRE](../01_requisitos/rnf-square.md), [casos de prueba](../02_pruebas/casos-prueba.md) y [matriz](../01_requisitos/matriz-trazabilidad.md): vistas generadas.
- [Ledger interno](../04_arquitectura/ledger-interno.md): contabilización, concurrencia y proyecciones.
- [Esquema Oracle](../04_arquitectura/esquema-oracle-propuesto.md): tablas, restricciones y migraciones activas.
- [Flujos financieros](../04_arquitectura/flujos-financieros.md): rutas y secuencias de las operaciones.
- [Inventario del frontend](../04_arquitectura/inventario-migracion-frontend.md): vistas y responsabilidades web.
- [Normas y estrategia de pruebas](../02_pruebas/normas-y-estrategia-pruebas.md): runners, niveles y criterios de evidencia.
- [Informe de verificación del 4 de noviembre](../02_pruebas/informe-verificacion-2026-11-04.md): resultados ligados a la huella de fuentes de esa ejecución.
- [Datos de usuarios de prueba](./usuarios-prueba.md): cuentas locales y procedimiento de preparación.
- [Informe de estado de casos de prueba](../02_pruebas/informe-estado-casos-prueba.md): registro histórico en Markdown.
- [Examinación estática del código y los módulos](../03_mantenimiento/informe-estado-repositorio-sistema-2026-11-05.md): estructura, límites y acoplamientos del runtime.
- [Auditoría de implementación](../03_mantenimiento/auditoria-brecha-arquitectura-objetivo.md): brechas y riesgos de mantenimiento.
- [Defectos históricos](../03_mantenimiento/defectos-reservados.md): evidencia del árbol heredado y su contraste con el runtime actual.
- [Entorno Windows](./entorno-windows.md): instalación y operación local.

## Reglas de evidencia

Separar requisitos, comportamiento implementado y resultados observados. Una ejecución aprobada debe quedar asociada a revisión, huella de fuentes, datos, comando, resultado esperado y observado y casos relacionados. El informe del 4 de noviembre registra pruebas funcionales y de seguridad, flujo de persistencia Oracle, build y smoke HTTP; no reemplaza mediciones de carga, ejecución prolongada, multi-réplica, recuperación de respaldos ni evaluación con usuarios finales.

Se conservan la licencia y atribución originales. Los defectos del backend heredado se mantienen como historia y no se reportan como defectos actuales sin evidencia.
