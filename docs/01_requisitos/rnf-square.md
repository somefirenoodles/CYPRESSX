<!-- Generado por pnpm docs:generate desde catalogo.json. No editar manualmente. -->
# RNF y evaluación SQuaRE

Guía de evaluación del proyecto; no busca certificación. Los umbrales son decisiones locales, no valores impuestos por ISO. ISO/IEC 25010:2023 orienta calidad del producto, 25019:2023 calidad en uso y 25040:2024 el marco de evaluación.

Las mediciones se versionan: cambiar contexto, muestra, umbral o implementación obliga a reevaluar. Se conserva por separado evidencia de pruebas, revisión de agentes y observación de usuarios finales. Una evaluación de agente nunca se contabiliza como usuario final.

## RNF-FUN-01 — Adecuación funcional

El sistema se evaluará respecto a porcentaje de criterios funcionales verificados, en el contexto matriz-funcional-v1, con umbral local >= 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-TX-03.

- **RNF-FUN-01-A1:** Porcentaje de criterios funcionales verificados: >= 100 %; muestra mínima 1.
- **RNF-FUN-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** No se ha completado la ejecución de todos los criterios funcionales.

## RNF-PER-01 — Eficiencia de desempeño

El sistema se evaluará respecto a latencia p95 de consultas privadas, en el contexto oracle-local-20-concurrentes-v1, con umbral local <= 500 ms.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-04.

- **RNF-PER-01-A1:** Latencia p95 de consultas privadas: <= 500 ms; muestra mínima 100.
- **RNF-PER-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Falta ejecutar el ensayo de carga en el contexto declarado.

## RNF-COM-01 — Compatibilidad

El sistema se evaluará respecto a recorridos críticos aprobados en navegadores objetivo, en el contexto edge-chrome-escritorio-v1, con umbral local >= 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-AUT-01.

- **RNF-COM-01-A1:** Recorridos críticos aprobados en navegadores objetivo: >= 100 %; muestra mínima 2.
- **RNF-COM-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Falta evidencia de ambos navegadores en su entorno objetivo.

## RNF-INT-01 — Capacidad de interacción

El sistema se evaluará respecto a tareas completadas con teclado sin ayuda, en el contexto teclado-escritorio-usuarios-v1, con umbral local >= 90 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-GAS-01.

- **RNF-INT-01-A1:** Tareas completadas con teclado sin ayuda: >= 90 %; muestra mínima 10.
- **RNF-INT-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente estudio de usuarios finales con navegación por teclado.

## RNF-REL-01 — Fiabilidad

El sistema se evaluará respecto a ensayos de rollback e idempotencia sin efectos parciales, en el contexto oracle-fallos-concurrencia-v1, con umbral local >= 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-TX-03.

- **RNF-REL-01-A1:** Ensayos de rollback e idempotencia sin efectos parciales: >= 100 %; muestra mínima 10.
- **RNF-REL-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente campaña Oracle de fallo parcial y concurrencia.

## RNF-SEC-01 — Seguridad

El sistema se evaluará respecto a accesos indebidos que exponen datos o modifican estado, en el contexto api-tres-actores-v1, con umbral local == 0 incidentes.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-AUT-01, CU-TX-05, CU-CTA-01, CU-NOT-01.

- **RNF-SEC-01-A1:** Accesos indebidos que exponen datos o modifican estado: == 0 incidentes; muestra mínima 12.
- **RNF-SEC-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente ejecución de matriz completa de acceso cruzado.

## RNF-MAN-01 — Mantenibilidad

El sistema se evaluará respecto a integridad de referencias y documentos generados, en el contexto catalogo-ci-v1, con umbral local == 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01.

- **RNF-MAN-01-A1:** Integridad de referencias y documentos generados: == 100 %; muestra mínima 1.
- **RNF-MAN-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** El control está implementado; pendiente evidencia por revisión.

## RNF-FLE-01 — Flexibilidad

El sistema se evaluará respecto a instalaciones reproducibles aprobadas en entornos objetivo, en el contexto windows-linux-contenedor-v1, con umbral local >= 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-AUT-01, CU-SBX-01.

- **RNF-FLE-01-A1:** Instalaciones reproducibles aprobadas en entornos objetivo: >= 100 %; muestra mínima 2.
- **RNF-FLE-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente comprobar ambos entornos reproducibles.

## RNF-SAF-01 — Seguridad operacional

El sistema se evaluará respecto a flujos financieros que identifican correctamente el sandbox, en el contexto advertencias-sandbox-v1, con umbral local == 100 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-COM-01, CU-ING-01.

- **RNF-SAF-01-A1:** Flujos financieros que identifican correctamente el sandbox: == 100 %; muestra mínima 7.
- **RNF-SAF-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** La UI actual tiene advertencias incompletas; falta revisión de todos los recorridos.

## RNF-USO-01 — Calidad en uso: logro de tareas

El sistema se evaluará respecto a tareas completadas correctamente sin asistencia, en el contexto usuarios-primer-uso-v1, con umbral local >= 90 %.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-TX-02, CU-GAS-01.

- **RNF-USO-01-A1:** Tareas completadas correctamente sin asistencia: >= 90 %; muestra mínima 10.
- **RNF-USO-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente evaluación real de usuarios finales.

## RNF-SAT-01 — Calidad en uso: valoración del usuario

El sistema se evaluará respecto a valoración media tras completar tareas, en el contexto usuarios-primer-uso-v1, con umbral local >= 4 puntos/5.

**Prioridad:** alta. **Implementación:** Parcial. **CU:** CU-TX-01, CU-GAS-01.

- **RNF-SAT-01-A1:** Valoración media tras completar tareas: >= 4 puntos/5; muestra mínima 10.
- **RNF-SAT-01-A2:** La evaluación identifica contexto, revisión/huella de fuentes, fecha, método, responsable y artefacto; evidencia omitida, obsoleta o insuficiente nunca se marca aprobada.

**Archivos:** `scripts/traceability.mjs`, `scripts/evidence.mjs`.

**Brechas:** Pendiente encuesta de participantes reales.

## Plan de medición

### RNF-FUN-01 — Adecuación funcional

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Porcentaje de criterios funcionales verificados. **Umbral local:** >= 100 %; n >= 1.

**Método:** Calcular sobre todos los AC funcionales: requiere pruebas ejecutadas y ausencia de brechas funcionales; omitidas cuentan pendientes.. **Contexto:** matriz-funcional-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-PER-01 — Eficiencia de desempeño

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Latencia p95 de consultas privadas. **Umbral local:** <= 500 ms; n >= 100.

**Método:** Medir al menos 100 consultas con 20 clientes concurrentes tras calentamiento, Oracle local y dataset de 1000 operaciones; informar hardware y distribución.. **Contexto:** oracle-local-20-concurrentes-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-COM-01 — Compatibilidad

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Recorridos críticos aprobados en navegadores objetivo. **Umbral local:** >= 100 %; n >= 2.

**Método:** Ejecutar los mismos recorridos en Edge/Windows y Chrome/Linux; adjuntar resultados por navegador. Una sola plataforma no representa ambas.. **Contexto:** edge-chrome-escritorio-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-INT-01 — Capacidad de interacción

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Tareas completadas con teclado sin ayuda. **Umbral local:** >= 90 %; n >= 10.

**Método:** Usuarios finales completan pago, solicitud y división con teclado; registrar intentos, aciertos y barreras sin datos personales.. **Contexto:** teclado-escritorio-usuarios-v1. **Responsable:** Equipo de evaluación y usuarios finales. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-REL-01 — Fiabilidad

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Ensayos de rollback e idempotencia sin efectos parciales. **Umbral local:** >= 100 %; n >= 10.

**Método:** Ejecutar fallos entre escrituras y solicitudes concurrentes en Oracle real, comparando saldos, ledger, notificaciones y claves antes/después.. **Contexto:** oracle-fallos-concurrencia-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-SEC-01 — Seguridad

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Accesos indebidos que exponen datos o modifican estado. **Umbral local:** == 0 incidentes; n >= 12.

**Método:** Probar visitante, propietario y tercero sobre lectura/mutación de pagos, solicitudes, bancos y notificaciones; contar incidentes reproducibles.. **Contexto:** api-tres-actores-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-MAN-01 — Mantenibilidad

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Integridad de referencias y documentos generados. **Umbral local:** == 100 %; n >= 1.

**Método:** Ejecutar validación de IDs/referencias/criterios/CP, detección de archivos ausentes y comparación exacta de vistas generadas en toda PR.. **Contexto:** catalogo-ci-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-FLE-01 — Flexibilidad

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Instalaciones reproducibles aprobadas en entornos objetivo. **Umbral local:** >= 100 %; n >= 2.

**Método:** Preparar instalación desde lockfile y migraciones en Windows nativo y contenedor Linux; comprobar arranque, salud Oracle y build.. **Contexto:** windows-linux-contenedor-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-SAF-01 — Seguridad operacional

**Modelo:** ISO/IEC 25010:2023. **Métrica:** Flujos financieros que identifican correctamente el sandbox. **Umbral local:** == 100 %; n >= 7.

**Método:** Revisar acceso, resumen, P2P, FX, división, comercio y recepción; verificar avisos visibles y respuestas API con evidencia de UI y revisión de agente identificada.. **Contexto:** advertencias-sandbox-v1. **Responsable:** Equipo de implementación y calidad. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-USO-01 — Calidad en uso: logro de tareas

**Modelo:** ISO/IEC 25019:2023. **Métrica:** Tareas completadas correctamente sin asistencia. **Umbral local:** >= 90 %; n >= 10.

**Método:** Al menos 10 usuarios finales de prueba realizan pago, solicitud y división con datos ficticios; informar tareas, aciertos y tiempo, sin usar agentes como participantes.. **Contexto:** usuarios-primer-uso-v1. **Responsable:** Equipo de evaluación y usuarios finales. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..

### RNF-SAT-01 — Calidad en uso: valoración del usuario

**Modelo:** ISO/IEC 25019:2023. **Métrica:** Valoración media tras completar tareas. **Umbral local:** >= 4 puntos/5; n >= 10.

**Método:** Recoger una respuesta de 1 a 5 por participante tras las mismas tareas; conservar comentarios anónimos y tamaño de muestra. Métrica local, no escala normativa ISO.. **Contexto:** usuarios-primer-uso-v1. **Responsable:** Equipo de evaluación y usuarios finales. **Reevaluar:** Cada cambio de fuentes, contexto, umbral o muestra; conservar resultados históricos y marcar obsoletos..
