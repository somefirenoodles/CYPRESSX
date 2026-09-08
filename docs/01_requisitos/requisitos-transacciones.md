# Requisitos funcionales — núcleo transaccional

## Alcance

Esta especificación cubre la primera capa documental de Superpay. Los requisitos se derivan del comportamiento observable, los modelos y la implementación actual del flujo de transacciones.

## Requisitos

### RF-TX-01. Crear un pago

El sistema debe permitir que un usuario autenticado cree un pago dirigido a otro usuario válido, indicando monto, descripción y nivel de privacidad aplicable.

Criterios verificables:

- el receptor debe existir;
- el monto debe ser válido;
- la transacción debe registrarse una sola vez;
- el pago completado debe modificar los saldos correspondientes;
- el receptor debe recibir la notificación de pago definida por el sistema.

### RF-TX-02. Crear una solicitud de pago

El sistema debe permitir que un usuario autenticado cree una solicitud de pago dirigida a otro usuario válido.

Criterios verificables:

- la solicitud debe registrarse con estado pendiente;
- crear la solicitud no debe transferir dinero;
- el receptor debe recibir una notificación de solicitud;
- el monto almacenado debe conservar exactamente el valor monetario representado por la entrada válida.

### RF-TX-03. Consultar una solicitud pendiente

El usuario receptor debe poder consultar una solicitud de pago dirigida a su cuenta y conocer como mínimo emisor, receptor, monto, descripción y estado.

### RF-TX-04. Aceptar una solicitud de pago

El receptor de una solicitud pendiente debe poder aceptarla.

Criterios verificables:

- solo una solicitud pendiente puede aceptarse;
- la aceptación debe aplicar los efectos financieros exactamente una vez;
- la solicitud debe quedar en estado final compatible con aceptación/completado;
- el solicitante debe recibir la notificación correspondiente.

### RF-TX-05. Rechazar una solicitud de pago

El receptor de una solicitud pendiente debe poder rechazarla.

Criterios verificables:

- rechazar no debe transferir dinero;
- los saldos de emisor y receptor deben permanecer iguales a los valores previos al rechazo;
- la solicitud debe quedar en un estado final de rechazo;
- una solicitud rechazada no debe volver a producir efectos financieros.

### RF-TX-06. Impedir resolución repetida

Una solicitud que ya alcanzó un estado final no debe poder resolverse nuevamente.

Criterios verificables:

- una segunda aceptación no debe repetir débitos o créditos;
- un rechazo posterior a una aceptación no debe modificar saldos;
- una aceptación posterior a un rechazo no debe modificar saldos;
- las notificaciones asociadas a la resolución no deben duplicarse por reintentos inválidos.

### RF-TX-07. Mantener consistencia monetaria

El sistema debe conservar la precisión monetaria definida por su modelo interno en creación, almacenamiento, cálculo y presentación de transacciones.

Criterios verificables:

- los montos decimales válidos no deben perder centavos;
- débito y crédito deben utilizar la misma unidad monetaria;
- el valor mostrado al usuario debe corresponder con el valor persistido.

### RF-TX-08. Restringir operaciones al actor autorizado

Las operaciones de resolución de una solicitud deben estar disponibles únicamente para el usuario autorizado según la relación de la transacción.

Criterios verificables:

- un tercero no participante no debe poder resolver la solicitud;
- el emisor no debe poder ejecutar acciones reservadas al receptor cuando el flujo así lo define;
- la validación debe existir en la capa de servidor y no depender exclusivamente de la interfaz.

## Estado de esta iteración

Estos requisitos describen el comportamiento esperado para diseñar pruebas y mantenimiento. No significan que la implementación actual los cumpla.

Los incumplimientos ya conocidos se registran en `docs/03_mantenimiento/defectos-reservados.md` y se conservan deliberadamente hasta la fase de mantenimiento correspondiente.
