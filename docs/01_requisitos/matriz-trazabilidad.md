<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Matriz única de trazabilidad

Una fila por requisito canónico. RF-PROD y CU históricos se relacionan por equivalencias, sin duplicar trabajo. Presente en código no significa verificado. Los resultados por ejecución se publican como artefactos de CI.

| Requisito | CU | Criterios | CP | Implementación | Automatización |
| --- | --- | --- | --- | --- | --- |
| RF-AUT-01 — Autenticación segura | CU-AUT-01 | RF-AUT-01-A1, RF-AUT-01-A2, RF-AUT-01-A3 | CP-AUT-01, CP-AUT-02, CP-AUT-04, CP-WEB-01, CP-SEC-01, CP-SEC-02, CP-SEC-03, CP-SEC-04 | Presente en código | 6/8 CP con enlace |
| RF-AUT-02 — Registro de cuenta | CU-AUT-02 | RF-AUT-02-A1, RF-AUT-02-A2, RF-AUT-02-A3 | CP-AUT-03, CP-AUT-04, CP-SEC-05, CP-SEC-07 | Presente en código | 3/4 CP con enlace |
| RF-TX-01 — Realizar pago entre usuarios | CU-TX-01 | RF-TX-01-A1, RF-TX-01-A2, RF-TX-01-A3, RF-TX-01-A4, RF-TX-01-A5, RF-TX-01-A6 | CP-TX-01, CP-TX-02, CP-TX-17, CP-IDEM-04, CP-SEC-05, CP-SEC-06 | Presente en código | 4/6 CP con enlace |
| RF-TX-02 — Crear solicitud de pago | CU-TX-02 | RF-TX-02-A1, RF-TX-02-A2, RF-TX-02-A3, RF-TX-02-A4, RF-TX-02-A5 | CP-TX-03, CP-TX-04, CP-TX-17 | Presente en código | 1/3 CP con enlace |
| RF-TX-03 — Consultar solicitudes y estado | CU-TX-03 | RF-TX-03-A1, RF-TX-03-A2, RF-TX-03-A3 | CP-TX-05, CP-TX-06 | Presente en código | 0/2 CP con enlace |
| RF-TX-04 — Aceptar solicitud de pago | CU-TX-04 | RF-TX-04-A1, RF-TX-04-A2, RF-TX-04-A3, RF-TX-04-A4 | CP-TX-07, CP-TX-08, CP-TX-15, CP-TX-17 | Presente en código | 2/4 CP con enlace |
| RF-TX-05 — Rechazar solicitud de pago | CU-TX-05 | RF-TX-05-A1, RF-TX-05-A2, RF-TX-05-A3 | CP-TX-21, CP-TX-22, CP-TX-15 | Presente en código | 1/3 CP con enlace |
| RF-TX-06 — No repetir operaciones financieras | CU-TX-01, CU-TX-02, CU-TX-04, CU-TX-05 | RF-TX-06-A1, RF-TX-06-A2, RF-TX-06-A3, RF-TX-06-A4 | CP-TX-23, CP-TX-24, CP-TX-15, CP-IDEM-01, CP-IDEM-02, CP-IDEM-03, CP-IDEM-04 | Presente en código | 5/7 CP con enlace |
| RF-TX-07 — Dinero exacto | CU-TX-01, CU-GAS-01, CU-FX-01, CU-REC-01 | RF-TX-07-A1, RF-TX-07-A2, RF-TX-07-A3 | CP-TX-25, CP-TX-18, CP-TX-13, CP-TX-14, CP-SPLIT-01, CP-MON-01, CP-SEC-06 | Presente en código | 3/7 CP con enlace |
| RF-TX-08 — Autorización de operaciones | CU-TX-01, CU-TX-02, CU-TX-03, CU-TX-04, CU-TX-05, CU-CTA-01, CU-CON-01, CU-GAS-01, CU-NOT-01, CU-REC-01, CU-COM-01, CU-ING-01 | RF-TX-08-A1, RF-TX-08-A2, RF-TX-08-A3 | CP-TX-19, CP-TX-20, CP-TX-16 | Presente en código | 1/3 CP con enlace |
| RF-TX-09 — Historial personal de transacciones | CU-TX-03 | RF-TX-09-A1, RF-TX-09-A2, RF-TX-09-A3 | CP-TX-09, CP-TX-10, CP-WEB-04 | Presente en código | 2/3 CP con enlace |
| RF-TX-10 — Consulta de detalle y visibilidad | CU-TX-03 | RF-TX-10-A1, RF-TX-10-A2, RF-TX-10-A3 | CP-TX-09, CP-TX-11, CP-TX-12, CP-TX-16, CP-SEC-04 | Presente en código | 3/5 CP con enlace |
| RF-CTA-01 — Administración de cuentas vinculadas | CU-CTA-01 | RF-CTA-01-A1, RF-CTA-01-A2, RF-CTA-01-A3, RF-CTA-01-A4 | CP-CTA-01, CP-CTA-02, CP-WEB-05 | Presente en código | 2/3 CP con enlace |
| RF-CON-01 — Búsqueda y gestión de contactos | CU-CON-01 | RF-CON-01-A1, RF-CON-01-A2, RF-CON-01-A3 | CP-CON-01, CP-CON-02 | Presente en código | 1/2 CP con enlace |
| RF-GAS-01 — División de gastos | CU-GAS-01 | RF-GAS-01-A1, RF-GAS-01-A2, RF-GAS-01-A3, RF-GAS-01-A4, RF-GAS-01-A5 | CP-GAS-01, CP-GAS-02, CP-GAS-03, CP-GAS-06, CP-GAS-07, CP-GAS-04, CP-GAS-05, CP-SPLIT-01, CP-SPLIT-02, CP-SPLIT-03, CP-WEB-03 | Presente en código | 6/11 CP con enlace |
| RF-NOT-01 — Notificaciones de eventos | CU-NOT-01 | RF-NOT-01-A1, RF-NOT-01-A2, RF-NOT-01-A3 | CP-NOT-01, CP-NOT-02, CP-WEB-05 | Presente en código | 2/3 CP con enlace |
| RF-FX-01 — Cotización de divisas | CU-FX-01 | RF-FX-01-A1, RF-FX-01-A2, RF-FX-01-A3, RF-FX-01-A4 | CP-FX-01, CP-FX-02, CP-WEB-02 | Presente en código | 2/3 CP con enlace |
| RF-REC-01 — Recurrencias de pago | CU-REC-01 | RF-REC-01-A1, RF-REC-01-A2, RF-REC-01-A3, RF-REC-01-A4, RF-REC-01-A5, RF-REC-01-A6 | CP-REC-01, CP-REC-02, CP-REC-03, CP-CAL-01, CP-CAL-02, CP-CAL-03, CP-REC-04 | Presente en código | 4/7 CP con enlace |
| RF-COM-01 — Pago a comercio | CU-COM-01 | RF-COM-01-A1, RF-COM-01-A2, RF-COM-01-A3, RF-COM-01-A4 | CP-COM-01, CP-COM-02 | Presente en código | 0/2 CP con enlace |
| RF-SBX-01 — Operaciones de saldo | CU-SBX-01 | RF-SBX-01-A1, RF-SBX-01-A2, RF-SBX-01-A3, RF-SBX-01-A4 | CP-SBX-01, CP-SBX-02, CP-WEB-01 | Presente en código | 1/3 CP con enlace |
| RF-ING-01 — Recepción de ingreso externo | CU-ING-01 | RF-ING-01-A1, RF-ING-01-A2, RF-ING-01-A3 | CP-ING-01, CP-ING-02 | Presente en código | 1/2 CP con enlace |
| RNF-FUN-01 — Adecuación funcional | CU-TX-01, CU-TX-03 | RNF-FUN-01-A1, RNF-FUN-01-A2 | CP-RNF-01 | Parcial | 0/1 CP con enlace |
| RNF-PER-01 — Eficiencia de desempeño | CU-TX-04 | RNF-PER-01-A1, RNF-PER-01-A2 | CP-RNF-02 | Parcial | 0/1 CP con enlace |
| RNF-COM-01 — Compatibilidad | CU-TX-01, CU-AUT-01 | RNF-COM-01-A1, RNF-COM-01-A2 | CP-RNF-03 | Parcial | 0/1 CP con enlace |
| RNF-INT-01 — Capacidad de interacción | CU-TX-01, CU-GAS-01 | RNF-INT-01-A1, RNF-INT-01-A2 | CP-RNF-04 | Parcial | 0/1 CP con enlace |
| RNF-REL-01 — Fiabilidad | CU-TX-01, CU-TX-03 | RNF-REL-01-A1, RNF-REL-01-A2 | CP-RNF-05 | Parcial | 0/1 CP con enlace |
| RNF-SEC-01 — Seguridad | CU-AUT-01, CU-TX-05, CU-CTA-01, CU-NOT-01 | RNF-SEC-01-A1, RNF-SEC-01-A2 | CP-RNF-06 | Parcial | 0/1 CP con enlace |
| RNF-MAN-01 — Mantenibilidad | CU-TX-01 | RNF-MAN-01-A1, RNF-MAN-01-A2 | CP-RNF-07 | Parcial | 0/1 CP con enlace |
| RNF-FLE-01 — Flexibilidad | CU-AUT-01, CU-SBX-01 | RNF-FLE-01-A1, RNF-FLE-01-A2 | CP-RNF-08 | Parcial | 0/1 CP con enlace |
| RNF-SAF-01 — Seguridad operacional | CU-TX-01, CU-COM-01, CU-ING-01 | RNF-SAF-01-A1, RNF-SAF-01-A2 | CP-RNF-09 | Parcial | 0/1 CP con enlace |
| RNF-USO-01 — Calidad en uso: logro de tareas | CU-TX-01, CU-TX-02, CU-GAS-01 | RNF-USO-01-A1, RNF-USO-01-A2 | CP-RNF-10 | Parcial | 0/1 CP con enlace |
| RNF-SAT-01 — Calidad en uso: valoración del usuario | CU-TX-01, CU-GAS-01 | RNF-SAT-01-A1, RNF-SAT-01-A2 | CP-RNF-11 | Parcial | 0/1 CP con enlace |
| RF-LED-01 — Contabilizar sobre ledger autoritativo de doble entrada | CU-LED-01, CU-TX-01, CU-TX-03, CU-COM-01, CU-SBX-01, CU-ING-01 | RF-LED-01-A1, RF-LED-01-A2, RF-LED-01-A3, RF-LED-01-A4 | CP-TX-17, CP-LED-01, CP-LED-02, CP-LED-03, CP-SQL-01, CP-IDEM-04, CP-LED-04, CP-LED-05, CP-LED-06 | Presente en código | 9/9 CP con enlace |

## Equivalencias de producto

| ID | Requisitos canónicos |
| --- | --- |
| RF-PROD-01 — Autenticación y registro | RF-AUT-01, RF-AUT-02 |
| RF-PROD-02 — Saldo, historial y cuentas | RF-TX-09, RF-TX-10, RF-CTA-01 |
| RF-PROD-03 — Pago | RF-TX-01, RF-TX-06 |
| RF-PROD-04 — Divisas | RF-FX-01 |
| RF-PROD-05 — Solicitudes de pago | RF-TX-02, RF-TX-03, RF-TX-04, RF-TX-05 |
| RF-PROD-06 — División de gastos y contactos | RF-GAS-01, RF-CON-01 |
| RF-PROD-07 — Recurrencias | RF-REC-01 |
| RF-PROD-08 — Notificaciones | RF-NOT-01 |
| RF-PROD-09 — Oracle y dinero exacto | RF-TX-07, RF-TX-08, RF-LED-01 |
| RF-PROD-10 — Comercio y operaciones de saldo | RF-COM-01, RF-SBX-01, RF-ING-01 |

## IDs anteriores

| ID anterior | Destinos vigentes | Razón |
| --- | --- | --- |
| LM-CU-01 | CU-AUT-02, RF-AUT-02 | El registro legacy se conserva como caso de uso de registro con validación de confirmación y unicidad. |
| LM-CU-02 | CU-AUT-01, RF-AUT-01 | El login legacy se conserva como autenticación segura con sesión de servidor. |
| LM-CU-03 | CU-CTA-01, RF-CTA-01 | La gestión bancaria heredada se reemplaza por cuentas vinculadas administrables por usuario. |
| LM-CU-04 | CU-TX-01, RF-TX-01 | El pago legacy se conserva con dinero exacto, ledger y autorización. |
| LM-CU-05 | CU-TX-02, RF-TX-02 | La solicitud legacy se conserva como solicitud pendiente sin movimiento de saldo. |
| LM-CU-06 | CU-TX-04, CU-TX-05, RF-TX-04, RF-TX-05 | La resolución legacy se divide en aceptar y rechazar, con efectos financieros solo en la aceptación. |
| LM-CU-07 | CU-TX-03, RF-TX-03, RF-TX-09, RF-TX-10 | El historial legacy se conserva junto con consulta de estado y detalle, con filtrado por participación. |
| LM-CU-08 | Retirado | Retiro explícito: la red social legacy no forma parte del alcance. Solo se conserva búsqueda y gestión de contactos en RF-CON-01, sin grafo social ni muro. |
