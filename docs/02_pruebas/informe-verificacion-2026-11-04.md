# Informe de verificación — 2026-11-04 (Colombia)

## Resumen

Verificación local del sandbox Superpay sobre el camino activo `web/` + `backend/http/`. Se ejecutaron 48 pruebas Vitest (23 unitarias + 25 Oracle/Supertest), todas aprobadas y sin omitidas; 5 pruebas Cypress en Edge con API interceptada; 9 pruebas Node/Tooling; `types` y `build` aprobados (116 módulos). Resultado: sandbox probado, liberación remota pendiente.

## Pruebas ejecutadas

| Suite | Resultado |
| --- | --- |
| Vitest unitarias | 23/23 aprobadas |
| Vitest Oracle/Supertest | 25/25 aprobadas |
| Cypress (Edge, API interceptada) | 5/5 aprobadas |
| Node/Tooling | 9/9 aprobadas |
| `types` / `build` | aprobados (116 módulos) |
| Workflow Actions, `actionlint` 1.7.12 | aprobado, sin errores; sin ShellCheck/Pyflakes |

Se añadieron 10 pruebas: 8 de integración de seguridad (CP-SEC-01..07 + CP-TX-16) y 2 de escenarios monetarios (CP-FX-02, CP-TX-15).

## Base de datos y reconciliación

Oracle Free 23.26.3 desplegado como entorno desechable con fixtures sintéticas: esquema 001 con saldo USD 123.45 preservado, migraciones 002..006 y seed. Reconciliación con `balanced`, `projectionsMatch`, `allCompletedPosted` y `noPendingJournals` en TRUE. No se usaron `.env`, datos reales ni dinero real.

## Imagen Docker y smoke

La imagen final con Node 22.20.0 / pnpm 10.12.1 superó 5 comprobaciones HTTP sobre Oracle desechable:

1. `health` con Oracle y migraciones repetibles.
2. HTML y assets servidos por Svelte/Express.
3. Registro con cookie `Secure`, `HttpOnly` y `SameSite=Lax`.
4. Pago de 2.50 y replay exacto (2497.50 / 2502.50).
5. Recurso privado 401 y API 404.

La imagen final incorpora Vite 8.3.3 y concurrently 9.2.5 durante el build, con instalación frozen y compilación correctas; las herramientas de desarrollo no se instalan en la etapa runtime. El host local usa Node 26.13.0 / pnpm 11.25.0, fuera de `engines`; Docker emplea el stack fijado. La comprobación HTTP transporta manualmente la cookie de prueba por loopback; verifica su atributo Secure, sin evaluar TLS ni el comportamiento del navegador sobre HTTPS.

## Defecto corregido

Reproducido y corregido en `backend/app.ts`: JSON malformado y cargas >32 kb devolvían 500; ahora responden 400/413 sin internals en la respuesta. La regresión CP-SEC-07 pasó.

Se corrigió además el ejecutor Cypress: esperaba siempre en el puerto 3000 aunque Vite eligiera otro por ocupación. Ahora reserva un puerto efímero, exige `strictPort` y comparte la dirección con Cypress. La regresión ejecutó los cinco casos con un servidor de prueba independiente ocupando el 3000 y respondiendo 418; todos pasaron. La evidencia final se regeneró después de este cambio. Docker Desktop dejó de estar disponible durante un intento intermedio; se reinició el servicio y se repitió la campaña, sin reutilizar ese intento fallido como resultado.

## Controles probados

Sesiones opacas con token hash SHA-256, nuevo token al iniciar sesión, expiración y logout, cookies forjadas, errores de autenticación genéricos, rechazo de accesos cruzados a los recursos ensayados, servidor que ignora `userId`/`ownerId` inyectados, payloads SQLi acotados, números inválidos sin efecto en saldos, solicitudes concurrentes con un único efecto financiero y FX vencido sin consumo. No se afirma ausencia exhaustiva de SQLi/XSS ni se midieron diferencias temporales del login.

## Dependencias y auditoría

Actualizadas dentro del mismo major: express 4.21.2→4.22.3, zod 4.1.11→4.6.7, vite 8.3.0→8.3.3, concurrently 9.2.1→9.2.5; lock actualizado y pnpm 10.12.1 con instalación frozen en Docker.

- Auditoría de producción: de 9 avisos (3 altos, 4 moderados, 2 bajos) a 0.
- Auditoría ampliada a desarrollo: de 9 (1 crítico, 2 altos, 4 moderados, 2 bajos) a 1 bajo: `deepmerge` 4.3.1, transitivo de `@sveltejs/vite-plugin-svelte`; [sin parche publicado](https://github.com/advisories/GHSA-gcqx-w48m-w2h4). Pertenece a herramientas de configuración/build y no se instala en la imagen de producción. No se ensayó su explotación ni se declara exposición nula en desarrollo/CI. Seguimiento pendiente.

## Referencias OWASP (evaluación parcial)

Guías: [ASVS 5.0.0](https://asvs.owasp.org/) y [WSTG 4.2](https://wstg.owasp.org/v4.2/4-Web_Application_Security_Testing/). Se seleccionaron controles de sesiones, autorización, validación de entradas, errores y componentes vulnerables; no se evaluó un nivel completo de ASVS. [WSTG-SESS-02](https://wstg.owasp.org/v4.2/4-Web_Application_Security_Testing/06-Session_Management_Testing/02-Testing_for_Cookies_Attributes/) se contrasta con CP-SEC-02 y la cookie Secure de la imagen; [WSTG-ATHZ-04](https://wstg.owasp.org/v4.2/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References/) con CP-TX-16, CP-TX-09 y CP-CTA-01. Es una evaluación parcial. No se ejecutaron un pentest completo ni un escáner ZAP; no se afirma certificación.

## CI/CD

CI revisado y ampliado: gate de documentación, `types`, fixtures Oracle, migraciones, Vitest, reconciliación, Cypress, build, build Docker, smoke de producción, cierre de evidencia (`always`) y artefactos. Gates: auditoría de producción en 0 avisos; entorno completo en `audit-level=moderate`; el aviso bajo de desarrollo es visible y no ignorado. `gh run list` devolvió `[]`; el workflow remoto está activo (SuperpayCI), pero no hay ejecución remota verificada de los cambios locales. No hubo push ni CD; esto no equivale a CI remoto aprobado.

## Trazabilidad

Catálogo único con 95 CP: 43 aprobados y 52 diseñados (no automatizados); 33 requisitos y 17 CU. Sólo RF-LED-01 está formalmente verificado; el resto se conserva de forma conservadora. Hash de fuentes `a80dbdc5223ffefd37db404259d4423429de3954419a7353da5b18e7cc9a9777`; HEAD `afd5da9194e8fdc50bd6cdd4b0a06e340f3c65a7` con árbol sucio y sin commit nuevo. RNF-MAN al 100%; el resto de RNF no tiene mediciones del contexto SQuaRE: 48 pruebas no equivalen a todos los RNF/CU cumplidos.

## Evidencia

Referencias locales relativas a este informe:

- [Revisión y huella](../../reports/run.json), [Vitest](../../reports/vitest.json), [Cypress](../../reports/cypress.json), [trazabilidad de la ejecución](../../reports/traceability.json).
- [Audit de producción](../../reports/dependency-audit.json), [audit completo](../../reports/dependency-audit-all.json), [smoke de imagen](../../reports/production-smoke.json), [construcción final](../../reports/docker-build-final.log).
- [Aislamiento del puerto E2E](../../reports/e2e-port-isolation.json) y [validación del workflow](../../reports/workflow-validation.json).
- [Catálogo](../01_requisitos/catalogo.json) y [matriz única](../01_requisitos/matriz-trazabilidad.md).

`reports/` es generado y no versionado; este informe conserva un resumen tipo snapshot.

## Riesgos y límites

- `deepmerge` bajo y abierto, pendiente de parche upstream.
- No se encontró rate limiting del login en el runtime revisado; protección perimetral y ensayo de fuerza bruta no evaluados.
- Sin evaluación de TLS externo ni inyección de fallo que pierda una respuesta real después del commit.
- Sin pruebas de carga/estrés, ejecución prolongada, multirréplica, backup/restore, usuarios finales ni CD.
- Cypress (5 pruebas con API interceptada) no es E2E de UI contra API/Oracle en navegador. El smoke HTTP sí es real sobre API y DB, sirve la UI, pero no simula un usuario en navegador.
- La concurrencia probada es funcional a pequeña escala; no demuestra capacidad de escalamiento.

Estado: listo para el sandbox probado; liberación remota pendiente.
