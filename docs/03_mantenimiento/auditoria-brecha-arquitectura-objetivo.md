# Auditoría estática inicial — registro histórico

Esta auditoría conserva la inspección previa a ERS-001 y al cierre de brechas de noviembre de 2026. Sus hallazgos no describen por sí solos el runtime posterior. El estado vigente está en la [matriz única](../01_requisitos/matriz-trazabilidad.md), la [arquitectura actual](../04_arquitectura/arquitectura-objetivo.md) y el [ledger interno](../04_arquitectura/ledger-interno.md). No se reclasifican aquí los defectos históricos.

**Estado:** revisión estática de la rama actual; no certifica seguridad, rendimiento ni comportamiento en ejecución.
**Alcance:** aplicación web operable en sandbox, con frontend sin React/Electron, API modular y persistencia Oracle. No se evalúan pagos de dinero real.
**Método:** inspección de código y configuración. No se leyeron archivos `.env` ni se ejecutaron pruebas en esta revisión.

## Estado observado

El camino activo usa Svelte 5, TypeScript, Vite 8 y pnpm para la web; Express y TypeScript para la API; Oracle Database Free con `node-oracledb` 7 Thin; sesiones opacas persistidas en Oracle; Vitest y Cypress. Compose configura Oracle local. Las tasas son fixtures fijas de demostración y el libro solo mueve saldos sandbox.

La aplicación contempla autenticación, saldos, P2P, solicitudes, divisiones, operaciones recurrentes, comercios y consulta de movimientos. Esta lista describe rutas y pantallas existentes; no demuestra que cada criterio de producto esté cubierto o que las pruebas hayan pasado. El código React y lowdb/JSON anterior fue eliminado del checkout y permanece solo en el historial Git; no describe el runtime configurado.

## Brechas y límites por verificar

| Área | Hallazgo estático | Consecuencia / verificación pendiente |
|---|---|---|
| Ingreso de fondos | El top-up acredita saldo ficticio; no hay proveedor externo. La recepción visible es crédito P2P local. | No equivale a recibir fondos externos en Panamá. |
| FX | Cotizaciones de fixture con tasas fijas USD/COP/CRC y expiración; sin fuente de mercado. | Ningún importe representa un precio de mercado. |
| Notificaciones | No se identificó ruta ni bandeja durable de eventos financieros; hay avisos locales de interfaz. | RF-PROD-08/CU-NOT deben seguir como brecha hasta implementar y verificar persistencia/entrega. |
| División | El endpoint crea solicitudes iguales, excluye al organizador y asigna residuos de unidad menor a los primeros participantes; no presenta desglose previo ni clave idempotente propia. | Aprobar política, vista previa, reintentos y pruebas de fallo parcial. |
| Recurrencia | Worker local cada 30 s; frecuencias weekly/monthly/quarterly. Saldo insuficiente deja ejecución `failed` y avanza la programación. | Acordar y probar reglas de fallos/reintentos/calendario y operación multiinstancia. |
| Idempotencia/concurrencia | Pagos y top-ups tienen clave idempotente; las solicitudes/divisiones no ofrecen la misma clave propia. Una colisión simultánea de primer uso puede terminar en conflicto único. | Ejecutar casos Oracle concurrentes y decidir contrato de respuesta/reintento. |
| Perfil/cuentas/contactos | La interfaz/rutas activas revisadas no aportan gestión de perfil, cuentas externas ni altas/bajas de contactos. | Mantenerlas como alcance pendiente o legado; no atribuir al runtime actual. |
| Ledger/rollback | Operaciones activas usan transacción Oracle, bloqueo de cuentas, balances y asientos; inspección estática no prueba atomicidad bajo todos los fallos. | Ejecutar pruebas de integración Oracle de rollback y concurrencia. |
| Oracle/entorno | Driver Thin y Compose están configurados; la integración requiere `DB_CONNECT_STRING`. | La configuración de un entorno no demuestra disponibilidad ni despliegue productivo. |

## Defectos reservados y evidencia

El registro [DF-001..DF-004](./defectos-reservados.md) conserva su clasificación académica. DF-001/002 se documentaron en el backend legado, excluido del camino activo; la inspección estática de la resolución Oracle actual separa rechazo de aceptación y verifica estado pendiente. DF-004 también tiene una guarda de pagador en la ruta actual. Ninguno de esos hallazgos se reclasifica aquí: hacen falta casos dinámicos para determinar reproducción o regresión. DF-003 sigue siendo candidato porque la interfaz convierte importes a `Number` antes de enviar, aunque el dominio de servidor opere en unidades menores enteras.

## Referencias y tareas

- [Alcance revisado](../01_requisitos/alcance-producto-revisado.md), [requisitos de ampliación](../01_requisitos/requisitos-ampliacion.md) y [casos de uso](../01_requisitos/casos-uso-ampliacion.md): criterios de producto; sus textos no son por sí solos evidencia de cumplimiento.
- [Arquitectura implementada](../04_arquitectura/arquitectura-objetivo.md), [esquema Oracle activo](../04_arquitectura/esquema-oracle-propuesto.md), [operaciones sandbox](../04_arquitectura/contrato-adaptador-sandbox.md) e [inventario frontend](../04_arquitectura/inventario-migracion-frontend.md): descripción estática del runtime.
- [Invariantes financieros](../01_requisitos/invariantes-financieros-sandbox.md) y [estrategia de pruebas](../02_pruebas/normas-y-estrategia-pruebas.md): propiedades y validación pendientes.

Los entregables documentales ARQ-01, DAT-01, PAG-01, DAT-02, WEB-01 y QA-01 están registrados en el backlog como documentación completada; la arquitectura y flujos correspondientes ya aparecen en el código actual. Ese estado no significa que haya migración de datos, pagos reales, cumplimiento formal ni ejecución satisfactoria de suites. Las comprobaciones de CI, integración Oracle y Cypress deben registrarse con evidencia de ejecución por separado.
