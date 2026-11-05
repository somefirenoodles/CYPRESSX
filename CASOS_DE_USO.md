<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Casos de uso de Superpay

Consultar los [CU canónicos](docs/01_requisitos/casos-uso.md), la [ERS](docs/01_requisitos/ers.md) y la [matriz única](docs/01_requisitos/matriz-trazabilidad.md).

Los IDs del catálogo original se conservan como equivalencias o retiros explícitos; los árboles React/lowdb fueron retirados del runtime.

| ID anterior | ID vigente | Motivo |
| --- | --- | --- |
| LM-CU-01 | CU-AUT-02, RF-AUT-02 | El registro legacy se conserva como caso de uso de registro con validación de confirmación y unicidad. |
| LM-CU-02 | CU-AUT-01, RF-AUT-01 | El login legacy se conserva como autenticación segura con sesión de servidor. |
| LM-CU-03 | CU-CTA-01, RF-CTA-01 | La gestión bancaria legacy se reinterpreta como cuentas ficticias de sandbox, sin conectividad real. |
| LM-CU-04 | CU-TX-01, RF-TX-01 | El pago legacy se conserva con dinero exacto, ledger y autorización. |
| LM-CU-05 | CU-TX-02, RF-TX-02 | La solicitud legacy se conserva como solicitud pendiente sin movimiento de saldo. |
| LM-CU-06 | CU-TX-04, CU-TX-05, RF-TX-04, RF-TX-05 | La resolución legacy se divide en aceptar y rechazar, con efectos financieros solo en la aceptación. |
| LM-CU-07 | CU-TX-03, RF-TX-03, RF-TX-09, RF-TX-10 | El historial legacy se conserva junto con consulta de estado y detalle, con filtrado por participación. |
| LM-CU-08 | Retirado | Retiro explícito: la red social legacy no forma parte del alcance. Solo se conserva búsqueda y gestión de contactos en RF-CON-01, sin grafo social ni muro. |
