# Uso de delegación durante las pruebas — 2026-11-04

Suplemento de la etapa de pruebas; no modifica los contadores del log anterior.

| Encargo OpenCode | Resultado del trabajador | Revisión final |
| --- | --- | --- |
| security-regressions-02 | partial | Revisado e integrado por Codex |
| security-catalog-03 | complete | Revisado e integrado por Codex |
| money-scenarios-04 | complete | Revisado e integrado por Codex |
| verification-report-05 | complete | Revisado e integrado por Codex |
| e2e-port-06 | complete | Puerto efímero y strictPort; regresión con 3000 ocupado |

Cinco llamadas OpenCode, una propuesta Qwen local y ningún subagente Codex nuevo. La primera llamada dejó ocho pruebas sin ejecutar; el orquestador corrigió una aserción de cookie y amplió controles de autorización antes de validarlas.

| Contador OpenCode | Valor |
| --- | ---: |
| tokens_input | 144,121 |
| tokens_output | 22,075 |
| tokens_reasoning | 22,901 |
| tokens_cache_read | 1,571,840 |
| tokens_cache_write | 0 |
| cost | 0 |

Qwen: 428 tokens de entrada evaluados y 44 de salida; 37,638 segundos. Su respuesta confirmó coherencia sin detallar todas las cifras solicitadas; el cálculo final se comprobó directamente.

La llamada OpenCode y la propuesta Qwen se ejecutaron en paralelo mediante herramientas independientes; Docker, auditorías y pruebas también se ejecutaron en procesos independientes cuando no compartían dependencias. Las llamadas al mismo trabajador OpenCode se serializaron conforme al flujo definido.

El coste local registrado por OpenCode es 0. Esto no demuestra consumo cero de cuota Codex: la orquestación, edición de correcciones y validación final usaron el modelo principal. No se midió su consumo en este suplemento ni se convirtió el coste local en porcentaje de cuota.

[Contadores y sesiones de origen](log-uso-pruebas-2026-11-04.json).
