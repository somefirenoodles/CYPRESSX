# Defectos funcionales reservados

**Actualización del camino activo (2026-11-04):** se añadieron regresiones Oracle y de UI para los requisitos relacionados. La clasificación histórica de estos defectos se conserva. La evidencia actual por revisión/huella está en los artefactos de ejecución y en la matriz única; las observaciones iniciales de abajo corresponden a la revisión previa.

## Propósito y estado

Este registro conserva candidatos y defectos para actividades de pruebas y mantenimiento. Los hallazgos DF-001/002 se refieren a la implementación React/lowdb/JSON heredada, que ya no forma parte del camino activo configurado. La API Oracle actual contiene guardas estáticas relacionadas; no se ejecutaron pruebas dinámicas en esta revisión. Se conserva la clasificación original hasta que la tarea explícita de reproducción o regresión aporte evidencia.

## DF-001. Rechazar una solicitud modifica saldos

**Estado:** reservado para reproducción.
**Área:** resolución de solicitudes.
**Requisito afectado:** RF-TX-05. **Regla:** RN-TX-02.
**Evidencia histórica:** `backend/database.ts`, función `updateTransactionById` de la implementación heredada. Aplicaba débito/crédito a solicitudes sin distinguir rechazo de aceptación.
**Camino activo:** `backend/http/routes.ts` valida actor y estado pendiente; al rechazar solo actualiza el estado. Es una inspección estática, no una reproducción ni una prueba de regresión.
**Resultado esperado:** rechazar cambia el estado sin asientos ni cambios de saldo.

## DF-002. Resolver varias veces una solicitud repite efectos financieros

**Estado:** reservado para reproducción.
**Área:** idempotencia y estados.
**Requisitos afectados:** RF-TX-04, RF-TX-06. **Reglas:** RN-TX-03, RN-TX-08.
**Evidencia histórica:** `backend/database.ts`, `updateTransactionById` no exigía explícitamente estado `pending` antes de los efectos financieros.
**Camino activo:** la ruta Oracle exige solicitud pendiente y resolución por el pagador; esa guarda se observó estáticamente. Repetición/concurrencia necesita prueba Oracle.
**Resultado esperado:** una solicitud resuelta no vuelve a producir débito/crédito.

## DF-003. Riesgo de precisión monetaria en conversiones

**Estado:** candidato; requiere reproducción.
**Área:** montos. **Requisito:** RF-TX-07.
**Evidencia:** el flujo web convierte el importe de entrada a `Number` antes de enviarlo; el dominio de servidor usa `bigint` en unidades menores. Hay riesgo en el límite de interfaz, todavía no reproducido.
**Resultado esperado:** valor introducido, persistido, debitado/acreditado y mostrado coincide según la escala aprobada.
**Camino actual:** la UI transporta importes como cadenas y el ledger usa enteros. Las suites de dinero, el recorrido FX en Cypress y las regresiones Oracle verifican este camino. Esto documenta la mitigación actual sin reclasificar el candidato histórico.
**Restricción:** no reclasificar sin entradas límite y evidencia repetible.

## DF-004. Autorización de resolución requiere verificación dinámica

**Estado:** candidato; requiere análisis dinámico.
**Área:** autorización. **Requisito:** RF-TX-08.
**Evidencia histórica:** se planteó para las rutas heredadas REST/GraphQL. GraphQL y esas rutas no forman parte del runtime activo.
**Camino activo:** la resolución Oracle comprueba estáticamente que el actor sea el pagador. No se ejecutaron pruebas de acceso cruzado.
**Resultado esperado:** un tercero no puede resolver ni leer operaciones ajenas; la autorización se verifica en servidor.

## Regla de trabajo

La clasificación **reservado** o **candidato** solo cambia en la tarea explícita correspondiente, con:

1. commit exacto y versión del runtime;
2. estado inicial y datos sintéticos;
3. actor/rol de prueba (sin guardar credenciales);
4. pasos reproducibles;
5. resultado esperado y observado;
6. evidencia y estado de ejecución;
7. prueba automatizada que reproduzca la desviación y, para una corrección, prueba de regresión.

La inspección de código o un criterio escrito no demuestra que el caso se haya ejecutado. Consulte la [auditoría del runtime](./auditoria-brecha-arquitectura-objetivo.md) y la [estrategia de pruebas](../02_pruebas/normas-y-estrategia-pruebas.md).
