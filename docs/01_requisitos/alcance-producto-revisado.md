<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# Alcance de producto consolidado

La línea base vigente se mantiene en [la ERS](ers.md), los [CU canónicos](casos-uso.md) y la [matriz única](matriz-trazabilidad.md). Editar `catalogo.json` y ejecutar `pnpm docs:generate`; esta vista no tiene un proceso independiente de aprobación o formato.

Definir la línea base verificable de requisitos funcionales, casos de uso y casos de prueba del sandbox Superpay, separando el comportamiento esperado del estado real de implementación y conservando la trazabilidad con el legado.

## Incluye

- Registro e inicio de sesión local con sesión asociada al usuario.
- Pago entre usuarios, solicitudes de pago, aceptación, rechazo, consulta e historial.
- Dinero exacto en unidades menores con dos decimales para USD, COP y CRC.
- División de gastos, recurrencias, notificaciones, cotización FX y comercios simulados.
- Operaciones de sandbox: recargas y recepción externa simulada.
- Persistencia Oracle, transacciones y libro mayor (ledger) del camino activo backend/http.
- Patrones de idempotencia, reintento y gestión de clientes tomados de documentación pública, sin integración real.
- Evaluación dinámica de RNF con SQuaRE como guía, métricas locales y evidencia separada de automatización, agentes y usuarios finales.

## Fuera de alcance

- Movimiento de dinero real, conexión bancaria, adquirencia real o verificación externa de titularidad.
- Reversos, contracargos y recuperación de fondos fuera de los RF existentes; quedan como decisión pendiente.
- Cypress Cloud, Percy, proveedores externos de autenticación y dependencias obligatorias no locales.
- Aplicaciones React/Electron y rutas legacy como parte del runtime activo.
- Aprobación formal, conformidad o resultados de pruebas no ejecutadas.
- Certificación ISO y afirmaciones de cumplimiento financiero o aptitud para operar dinero real.

## Equivalencias de producto

- **RF-PROD-01 — Autenticación y registro:** RF-AUT-01, RF-AUT-02.
- **RF-PROD-02 — Saldo, historial y cuentas:** RF-TX-09, RF-TX-10, RF-CTA-01.
- **RF-PROD-03 — Pago:** RF-TX-01, RF-TX-06.
- **RF-PROD-04 — Divisas:** RF-FX-01.
- **RF-PROD-05 — Solicitudes de pago:** RF-TX-02, RF-TX-03, RF-TX-04, RF-TX-05.
- **RF-PROD-06 — División de gastos y contactos:** RF-GAS-01, RF-CON-01.
- **RF-PROD-07 — Recurrencias:** RF-REC-01.
- **RF-PROD-08 — Notificaciones:** RF-NOT-01.
- **RF-PROD-09 — Oracle y dinero exacto:** RF-TX-07, RF-TX-08, RF-LED-01.
- **RF-PROD-10 — Comercio y sandbox:** RF-COM-01, RF-SBX-01, RF-ING-01.
