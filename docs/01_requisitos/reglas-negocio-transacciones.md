# Reglas de negocio — núcleo transaccional

## RN-TX-01. Separación entre pago y solicitud

Una transacción de tipo **pago** aplica efectos financieros al crearse. Una transacción de tipo **solicitud** no aplica efectos financieros hasta que el receptor la acepte.

## RN-TX-02. El rechazo no mueve dinero

Rechazar una solicitud pendiente solo cambia su estado. No debe debitar ni acreditar saldo alguno.

## RN-TX-03. Resolución única

Una solicitud solo puede pasar de pendiente a un estado final una vez. Cualquier intento posterior debe ser rechazado o tratado de forma idempotente sin repetir efectos.

## RN-TX-04. Correspondencia de actores

En una solicitud de pago:

- `senderId` identifica al solicitante;
- `receiverId` identifica al usuario que debe aceptar o rechazar;
- al aceptar, el receptor paga al solicitante.

## RN-TX-05. Atomicidad lógica

Una operación que modifique transacción, saldos y notificaciones debe terminar en un estado coherente. No debe dejar saldos modificados si la resolución no queda registrada correctamente.

## RN-TX-06. Precisión monetaria

El sistema utiliza una unidad monetaria interna consistente. La conversión entre entrada del usuario y persistencia debe realizarse una sola vez y sin pérdida de centavos.

## RN-TX-07. Autorización en servidor

La autorización de una operación financiera debe verificarse en backend. Ocultar botones en frontend no constituye control de acceso suficiente.

## RN-TX-08. Notificaciones sin duplicación

Una resolución válida puede generar la notificación definida por el sistema. Reintentos inválidos o resoluciones repetidas no deben generar notificaciones financieras duplicadas.

## RN-TX-09. Evidencia reproducible

Para considerar demostrado un incumplimiento debe existir una secuencia reproducible que identifique:

- estado inicial de datos;
- actor;
- operación ejecutada;
- resultado esperado;
- resultado observado;
- commit evaluado.

## Relación con la implementación actual

Estas reglas representan el comportamiento esperado del objeto de estudio. Algunas contradicen deliberadamente defectos presentes en la implementación actual. Esa divergencia es necesaria para poder construir casos de prueba, registrar defectos y realizar mantenimiento correctivo posteriormente.
