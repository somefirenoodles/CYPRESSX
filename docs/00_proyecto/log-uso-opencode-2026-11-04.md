# INF-USO-01 — Uso de OpenCode y tokens

**Fecha:** 4 de noviembre de 2026. **Zona:** America/Bogota.

Alcance: etapa de implementación entre 12:31:46 y 14:59:58. Se excluyen esta auditoría y el trabajo posterior. Datos extraídos de registros locales de este chat y de sesiones OpenCode del proyecto; no se exportan prompts, credenciales ni datos de otras conversaciones.

## Delegación

- 18 llamadas secuenciales a `opencode/deepseek-v4.1-flash-free`.
- Resultado reportado: 7 completas, 3 parciales, 3 bloqueadas por pasos y 5 timeouts. Una salida completa tampoco implica aceptación: Codex revisó y corrigió propuestas y ejecutó las pruebas.
- Se iniciaron tres subagentes Codex antes de la corrección del usuario y luego se interrumpieron. No se retomaron.

| Hora local | Contrato | Resultado reportado |
| --- | --- | --- |
| 12:39:58 | ers-catalog-01 | blocked |
| 12:41:38 | ers-catalog-01-retry | timeout |
| 12:45:59 | backend-idempotency-01 | partial |
| 12:49:26 | backend-idempotency-01-finish | partial |
| 12:52:37 | backend-customer-flows-01 | timeout |
| 12:56:57 | backend-split-inbound-01 | timeout |
| 13:02:33 | recurrence-lifecycle-01 | partial |
| 13:06:11 | recurrence-router-fix-01 | complete |
| 13:10:53 | web-account-tools-01 | complete |
| 13:14:02 | web-history-split-01 | blocked |
| 13:17:01 | web-history-01-retry | complete |
| 13:17:41 | web-split-01 | complete |
| 13:19:30 | web-app-wiring-01 | timeout |
| 13:25:59 | oracle-regressions-01 | blocked |
| 13:35:11 | oracle-regressions-01-retry | timeout |
| 13:43:32 | web-e2e-01 | complete |
| 13:48:38 | ledger-adr-01 | complete |
| 14:05:10 | architecture-record-02 | complete |

## Contadores observados

| Métrica | OpenCode | Codex principal |
| --- | ---: | ---: |
| Entrada no caché / entrada adicional | 717.468 | 238.137 |
| Lectura de caché | 3.464.448 | 32.945.152 |
| Salida reportada | 117.373 | 158.778 |
| Razonamiento reportado | 181.117 | 77.854 |

Codex principal: entrada total 33.183.289; total de entrada + salida 33.342.067. Se usaron los contadores de 2026-11-04T17:16:47.962Z a 2026-11-04T19:33:18.768Z; son los snapshots disponibles que aproximan el tramo, no una factura exacta por tarea.

Los subagentes iniciales registran, por separado, 1.285.445 de entrada (1.243.520 en caché) y 1.490 de salida.

Los campos de ambos sistemas tienen convenciones distintas y no se suman como una factura común. En Codex, el razonamiento es un desglose de salida, no un importe adicional. OpenCode registra razonamiento y caché en campos separados; aquí se conservan sus contadores sin convertirlos a cuota o facturación.

El costo registrado localmente por OpenCode es 0; eso no demuestra consumo cero de la cuota Codex. La orquestación, las lecturas de resultados, la integración y las validaciones siguieron usando Codex. Los procesos interrumpidos pueden tener contadores incompletos.

## Cuota y evaluación del manejo

- Snapshot de cuenta durante la auditoría: 59% usado de la ventana de 5 horas y 33% semanal. Son límites compartidos; no equivalen al consumo atribuible a esta sesión.
- Hubo retrabajo: 11 de 18 llamadas no terminaron completas según su resultado reportado. Los límites de pasos y los timeouts causaron nuevas llamadas y correcciones.
- Se acotaron encargos, se redujeron lecturas exploratorias, se pidieron escrituras tempranas y se recortaron resultados devueltos al orquestador. Aun así, el contexto principal siguió creciendo: no corresponde afirmar un ahorro neto de cuota sin una comparación medida.
- Para la siguiente etapa: contratos de un resultado/archivo, una llamada a la vez y reporte breve; reutilizar evidencia vigente antes de repetir suites. No lanzar subagentes Codex para sustituir OpenCode.

[Datos estructurados](log-uso-opencode-2026-11-04.json). [Referencia oficial sobre contadores de tokens](https://developers.openai.com/api/docs/guides/token-counting).

## Continuidad posterior al corte

Para preparar la siguiente etapa se realizó una delegación adicional, `verification-stage-01`, reportada completa y revisada por Codex. Se corrigieron referencias de CP de esa propuesta. Esta llamada posterior no forma parte de los 18 encargos ni de los contadores del tramo auditado. La evidencia de implementación se reutilizó tras comprobar que la huella actual coincide; no se repitieron las suites completas.
