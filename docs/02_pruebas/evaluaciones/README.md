# Evaluaciones dinámicas de RNF

Los planes y umbrales se editan en `docs/01_requisitos/catalogo.json`, colección `quality`. Son decisiones del proyecto basadas en SQuaRE; no representan certificación ni umbrales exigidos por ISO.

Para incorporar una evaluación real, crear aquí un archivo JSON con una lista de mediciones. El esquema de cada medición es:

```json
{
  "id": "EVAL-USO-001",
  "requirementId": "RNF-USO-01",
  "sourceDigest": "huella SHA-256 de reports/run.json de la versión evaluada",
  "contextId": "usuarios-primer-uso-v1",
  "evaluatorKind": "user",
  "evaluator": "equipo-evaluador-con-identificador-no-personal",
  "measuredAt": "fecha ISO 8601 de la observación real",
  "value": 0,
  "unit": "%",
  "sampleSize": 1,
  "evidencePath": "docs/02_pruebas/evaluaciones/artefacto-anonimo.md",
  "observations": "Describir procedimiento, contexto y resultados reales; este ejemplo no es una evaluación."
}
```

El archivo debe ser un array, incluso con una sola medición. Los datos del bloque anterior son marcadores de formato y no se evalúan. No guardar contraseñas, cookies, números bancarios ni datos personales. `evidencePath` debe existir dentro del proyecto y contener información suficiente para revisar el cálculo y el método.

`evaluatorKind` distingue `automation`, `agent` y `user`. Los planes que exigen usuarios finales rechazan evaluaciones de agentes como sustituto. Para muestras agregadas informar número real de observaciones, denominador y método en el artefacto; no duplicar sesiones o participantes entre mediciones. Las muestras y umbrales mínimos se validan automáticamente.

La huella de evaluación representa fuentes de producto, pruebas y catálogo; añadir un artefacto de evaluación no cambia esa huella. Cambiar código, pruebas, contexto o umbral obliga a reevaluar. Los resultados antiguos se conservan como `stale`; falta de evidencia produce `not_evaluated` y muestra insuficiente produce `insufficient_evidence`.

Ejecutar `pnpm evidence:start`, las suites aplicables y `pnpm evidence:finish`. GitHub Actions publica el informe de cada revisión. Una medición fallida hace fallar la consolidación; una pendiente permanece visible, sin convertirse en una aprobación.
