# Superpay — línea base académica

## Identidad del proyecto

**Superpay** es la adaptación académica de Cypress Real World App utilizada como objeto de estudio para actividades de pruebas, mantenimiento y aseguramiento de la calidad de software.

El repositorio conserva el código y la licencia del proyecto original. El rebrand tiene alcance académico y documental; no pretende eliminar la atribución de Cypress ni modificar innecesariamente identificadores internos del código.

## Entorno oficial

El entorno oficial de trabajo para esta línea base es **Windows nativo**.

- Sistema operativo: Windows 10/11 de 64 bits.
- Terminal recomendada: PowerShell.
- Node.js: versión indicada por `.node-version`.
- Gestor de paquetes: Yarn Classic 1.22.22.
- Frontend local: puerto 3000.
- API local: puerto 3001.
- Persistencia: archivos JSON administrados con lowdb.

La guía de preparación se encuentra en [`entorno-windows.md`](./entorno-windows.md).

## Alcance documental — iteración 1

Esta primera capa documental cubre únicamente el núcleo transaccional:

1. Envío de pagos.
2. Creación de solicitudes de pago.
3. Resolución de solicitudes de pago.
4. Actualización de saldos asociada a esas operaciones.
5. Notificaciones de pago directamente relacionadas con los flujos anteriores.

Se excluyen temporalmente de esta iteración:

- registro e inicio de sesión;
- administración de cuentas bancarias;
- contactos;
- feeds e historial de transacciones;
- comentarios y reacciones;
- proveedores externos de autenticación;
- cobertura completa de REST y GraphQL;
- requisitos no funcionales globales.

Las exclusiones no eliminan esos módulos del proyecto. Solo posponen su documentación detallada para una capa posterior.

## Principio de preservación de defectos

Los defectos funcionales seleccionados para prácticas de mantenimiento deben conservarse hasta que una actividad explícita requiera corregirlos.

La preparación técnica puede modificar infraestructura, documentación, compatibilidad con Windows, referencias operativas y elementos de identidad. No debe alterar silenciosamente la conducta funcional reservada para estudio.

## Convención de idioma

La documentación académica y los artefactos de calidad se redactan en español.

Los identificadores internos del código pueden permanecer en inglés cuando su traducción implique cambios sin valor funcional. Por ejemplo, `RequestService`, nombres de modelos o rutas existentes no necesitan renombrarse para que los requisitos y casos de uso documenten el concepto como **solicitud de pago**.
