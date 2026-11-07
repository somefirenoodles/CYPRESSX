# Flujo de cambios y documentación

Este flujo mantiene alineados los contratos de escritura, los módulos, las reglas de negocio, el código y su evidencia. La fuente de trazabilidad del producto es `docs/01_requisitos/catalogo.json`; los informes personales o temporales no sustituyen esa fuente.

## Clasificar antes de editar

- **Versionado:** cambios de producto, contratos de módulos, migraciones, requisitos vigentes y documentos durables que explican el sistema.
- **Trazabilidad:** modificar el catálogo para cambios de reglas, requisitos, casos de uso o criterios de aceptación. Regenerar las vistas derivadas; no mantener copias manuales.
- **Trabajo local:** colocar planes temporales, notas de agente, informes de sesión, borradores y documentación auxiliar en `local-work/`. El directorio se ignora en Git.
- **Instrucciones locales:** `AGENTS.md` y `CODE_OF_CONDUCT.md` en la raíz pueden existir en cada checkout para orientar el trabajo local; Git los ignora y no deben añadirse al commit.
- **Evidencia ejecutable:** los artefactos de ejecución van en `reports/`, que también se ignora. La documentación de pruebas que define casos y resultados vigentes permanece en `docs/02_pruebas/` cuando está vinculada a requisitos o defectos.

No ignorar globalmente `docs/02_pruebas/` ni `docs/03_mantenimiento/`: esos directorios pueden contener contratos de prueba, defectos históricos o decisiones mantenibles. Antes de versionar un informe, comprobar que tiene propósito durable, fecha/alcance cuando aplique y vínculos a RF/CU/CP/DF; si solo registra una sesión de trabajo, debe quedar en `local-work/`.

## Secuencia de cambio

1. Identificar módulos y contratos afectados, junto con sus RF/CU/CP/DF en el catálogo.
2. Antes de editar o delegar, compilar y validar un contrato Xunlie en `local-work/xunlie/` mediante la skill local `xunlie`. Es obligatorio para cambios de código, infraestructura y documentación mantenible, incluidos cambios pequeños. Cada criterio de aceptación debe quedar relacionado con sus módulos, contratos de escritura y trazabilidad pertinente. Si Xunlie no está disponible o no valida, detener implementación/delegación y reportar el bloqueo.
3. Delimitar archivos de escritura y criterios de aceptación antes de implementar.
4. Actualizar en conjunto el código, las pruebas pertinentes y el catálogo cuando cambie el comportamiento o su contrato.
5. Ejecutar `pnpm docs:generate` si cambió el catálogo y `pnpm docs:check` para comprobar las vistas generadas y los enlaces de trazabilidad.
6. Ejecutar las validaciones pertinentes del proyecto y guardar reportes de ejecución en `reports/`.
7. Revisar `git status` y `git diff --cached`: excluir `local-work/`, `reports/`, instrucciones locales, credenciales y cualquier informe sin relación durable con requisitos, pruebas o mantenimiento.

Xunlie valida el contrato previo y Superpowers puede guiar su ejecución: usar brainstorming/planning si el alcance está abierto, TDD al cambiar comportamiento y verification antes de declarar terminado. Estas habilidades orientan el proceso; GitHub Actions ejecuta los controles automatizados del repositorio. Xunlie aún es un control local del flujo de trabajo y no forma parte del CI. El workflow CI actual comprueba trazabilidad y corre las validaciones configuradas para cada cambio.
