# Defectos funcionales reservados

## Propósito

Este registro identifica comportamientos que deben conservarse temporalmente para actividades académicas de pruebas y mantenimiento. Su existencia documentada no implica aceptación funcional.

## DF-001. Rechazar una solicitud modifica saldos

**Estado:** reservado para reproducción.

**Área:** resolución de solicitudes.

**Requisito afectado:** RF-TX-05.

**Regla afectada:** RN-TX-02.

**Evidencia estática inicial:** `backend/database.ts`, función `updateTransactionById`.

La función aplica débito al receptor y crédito al solicitante siempre que `isRequestTransaction(transaction)` sea verdadero, antes de asignar las ediciones recibidas. La condición no distingue si la edición representa aceptación o rechazo.

**Resultado esperado:** rechazar solo cambia el estado de la solicitud.

**Resultado observado por inspección:** el camino de actualización puede aplicar efectos financieros a una solicitud aunque la operación solicitada sea rechazo.

**Restricción:** no corregir durante P0 ni durante la preparación documental.

## DF-002. Una solicitud puede repetir efectos financieros al actualizarse varias veces

**Estado:** reservado para reproducción.

**Área:** idempotencia y estados.

**Requisitos afectados:** RF-TX-04, RF-TX-06.

**Reglas afectadas:** RN-TX-03, RN-TX-08.

**Evidencia estática inicial:** `backend/database.ts`, función `updateTransactionById`.

La función obtiene la transacción actual y ejecuta los efectos financieros si la transacción sigue siendo identificada como solicitud. No existe en esa función una guarda explícita que exija `requestStatus === pending` antes de modificar saldos y crear la notificación.

**Resultado esperado:** una solicitud resuelta no vuelve a producir débitos, créditos ni notificaciones financieras.

**Restricción:** no corregir hasta disponer de caso de prueba reproducible y evidencia de regresión.

## DF-003. Riesgo de precisión monetaria en conversiones

**Estado:** candidato; requiere reproducción.

**Área:** montos.

**Requisito afectado:** RF-TX-07.

**Evidencia estática inicial:** `createTransaction` convierte la entrada mediante `transactionDetails.amount * 100`.

La multiplicación de números JavaScript de punto flotante debe verificarse con entradas decimales límite antes de declarar un defecto confirmado.

**Restricción:** no modificar la representación monetaria hasta completar la reproducción.

## DF-004. Autorización de resolución requiere verificación específica

**Estado:** candidato; requiere análisis dinámico.

**Área:** autorización.

**Requisito afectado:** RF-TX-08.

Debe comprobarse mediante REST y GraphQL si un usuario no autorizado puede actualizar una transacción o resolver una solicitud perteneciente a otros usuarios.

No se declara confirmado en esta fase porque este documento no sustituye una prueba de autorización ejecutada.

## Regla de trabajo

Para pasar un defecto de **candidato** o **reservado** a **reproducido** deben registrarse:

1. commit exacto;
2. datos iniciales;
3. actor y credenciales de prueba;
4. pasos o comando;
5. resultado esperado;
6. resultado observado;
7. evidencia;
8. prueba automatizada que falle por la desviación esperada.

Una corrección posterior debe añadir una prueba de regresión y actualizar la trazabilidad.
