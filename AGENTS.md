# AGENTS.md — Superpay

## Propósito

Este repositorio es un objeto de estudio académico de pruebas, mantenimiento y aseguramiento de calidad. Priorizar reproducibilidad, trazabilidad y conservación controlada del historial de defectos. Distinguir siempre el camino activo `web/` + `backend/http/` del código legado conservado en `src/` y rutas antiguas del backend.

## Entorno y stack activos

- Windows nativo y PowerShell como referencia local.
- Node.js según `.node-version` (22.20.0) y pnpm 10.12.1 (`packageManager`).
- Frontend activo: Svelte 5 + Vite 8 bajo `web/`, puerto 3000.
- API activa: Express + TypeScript bajo `backend/`, puerto 3001.
- Oracle Database Free local mediante Docker Compose; driver `node-oracledb` 7 en Thin mode.
- Pruebas: Vitest (`pnpm test`) y Cypress E2E (`pnpm test:e2e`).
- `Dockerfile` multi-stage y servicio Compose `app`: build Svelte servido por Express; `tsx` es dependencia de runtime. Cypress E2E corre en Edge/Chrome, no Electron.

No leer `.env` ni imprimir valores de configuración. Para desarrollo se usa `.env.example` como plantilla local, sin copiar sus valores a documentos o respuestas. No asumir que los archivos legacy React/lowdb/GraphQL son parte del runtime activo.

## Alcance de producto y sandbox

El objetivo académico es una aplicación web completa y operable en sandbox, no una miniapp. Los pagos, FX, saldos y comercios son demostrativos; no se mueve dinero real ni se debe insinuar que una integración de mercado o bancaria está conectada. Mantener React y Electron fuera del cliente activo.

Consultar `docs/00_proyecto/README.md` y los requisitos antes de ampliar o restringir alcance. La primera capa de mantenimiento sigue centrada en pagos, solicitudes, resolución, saldos y efectos directamente relacionados; las funciones adicionales tienen requisitos y estados propios.

## Defectos y evidencia

`docs/03_mantenimiento/defectos-reservados.md` conserva evidencia del backend heredado. Antes de afirmar que un DF sigue activo, contrastarlo con el runtime nuevo. No cambiar la clasificación histórica sin evidencia/revisión. No corregir funcionalidad sin tarea explícita, criterio reproducible y regresión. La implementación nueva puede mitigar una desviación del camino legacy; documentarlo sin declarar prueba dinámica que no se ejecutó.

## Reglas de cambio

1. No mezclar saneamiento técnico con correcciones funcionales reservadas.
2. Toda corrección funcional debe incluir prueba de regresión apropiada.
3. Evitar refactorización general; hacer solo cambios justificados por una necesidad de prueba o mantenimiento.
4. Mantener licencia y atribución del proyecto original.
5. No añadir dependencias externas obligatorias si una alternativa local es suficiente.
6. No hacer Cypress Cloud, Percy ni proveedores externos de autenticación requisitos del camino local mínimo.
7. Toda documentación nueva usa IDs estables para requisitos, casos de uso, casos de prueba y defectos.

## Verificación

Para cambios de código/infraestructura, usar según aplique:

```powershell
pnpm types
pnpm test
pnpm build
```

Para pruebas Oracle locales, iniciar `docker compose up -d oracle`, preparar el esquema con `pnpm db:setup` y confirmar que el entorno apunta a la instancia sandbox; la integración se omite si `DB_CONNECT_STRING` no existe. CI configura Oracle Free. Si Docker daemon no está disponible, registrar la limitación y no atribuir resultado a esa integración. Para el contenedor de producción local, `docker compose up -d --build app` construye/arranca app y Oracle. Para cambios web/API cubiertos por E2E, ejecutar `pnpm test:e2e`, que usa Edge en Windows o Chrome en Linux. No afirmar resultados sin ejecutar los comandos.

## Evidencia de calidad

Registrar commit, entorno, datos iniciales, comando/pasos, resultado esperado y observado, artefacto de evidencia y relación con requisito/CU/CP/defecto. Usar datos sintéticos; no registrar contraseñas, tokens ni datos personales.

## Idioma

La documentación académica, evidencias, requisitos, pruebas e informes se redactan en español. Los identificadores existentes del código pueden permanecer en inglés.

## Fuente única y coordinación de trabajo

- La ERS vigente se edita en `docs/01_requisitos/catalogo.json`. ERS, CU, CP, RNF, equivalencias y matriz son vistas generadas; no editar su formato manualmente ni mantener matrices alternativas.
- Antes de crear un RF/CU/CP, consultar sus IDs y criterios existentes. Reutilizar un CP cuando cubre el mismo escenario; conservar el significado de IDs históricos. Las capas documental y de implementación pueden avanzar en paralelo con archivos de escritura delimitados.
- Usar OpenCode mediante la habilidad `opencode-delegation` para tareas acotadas; una solicitud a la vez, contexto mínimo, escritura temprana y revisión final por Codex. No crear subagentes de Codex salvo autorización específica del usuario para ese mecanismo.
- Ejecutar `pnpm docs:generate` después de cambiar el catálogo y `pnpm docs:check` antes de entregar. El mismo job de GitHub Actions revisa documentación e implementación, sin excepciones por autor/agente ni PR solo documental.
- Cada criterio tiene al menos un CP diseñado; una referencia de archivo no demuestra cobertura. Vincular automatización a runner, archivo y título real, sin duplicar bindings. Registrar brechas funcionales aunque el documento esté completo.
- La evidencia se inicia con `pnpm evidence:start`, sigue con `pnpm test:report` y las suites aplicables, y se consolida con `pnpm evidence:finish`. Si cambian las fuentes, repetir la ejecución; omisiones y resultados antiguos no son aprobaciones.
- RNF: SQuaRE es guía de evaluación, sin objetivo de certificación. Los umbrales son locales. Evidencia automatizada, revisión de agentes y observación de usuarios finales se identifican por separado; no inventar participantes ni convertir agentes en usuarios.
- Conservar informes y defectos históricos con su fecha y evidencia. La matriz generada vigente y los artefactos de cada ejecución determinan el estado actual.
