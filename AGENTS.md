# AGENTS.md — Superpay

## Propósito

Este repositorio se utiliza como objeto de estudio académico para pruebas, mantenimiento y aseguramiento de la calidad. Los agentes deben priorizar reproducibilidad, trazabilidad y conservación controlada de defectos funcionales reservados.

## Entorno oficial

- Windows nativo.
- PowerShell como terminal de referencia.
- Node.js según `.node-version`.
- Yarn Classic 1.22.22.

No asumir Bash, WSL ni utilidades Unix disponibles.

## Idioma

- Documentación académica: español.
- Evidencias, requisitos, casos de prueba, defectos e informes: español.
- Identificadores internos existentes del código pueden permanecer en inglés.
- No renombrar masivamente clases, funciones, rutas, modelos o archivos solo para traducirlos.

## Alcance documental vigente

La primera capa cubre únicamente:

- pagos;
- solicitudes de pago;
- resolución de solicitudes;
- saldos asociados;
- notificaciones de pago directamente relacionadas.

Consultar `docs/00_proyecto/README.md` antes de ampliar el alcance.

## Defectos que deben preservarse

No corregir sin una tarea explícita de mantenimiento:

- DF-001: rechazo de solicitud puede modificar saldos;
- DF-002: resolución repetida puede repetir efectos financieros;
- DF-003: precisión monetaria, pendiente de reproducción;
- DF-004: autorización de resolución, pendiente de verificación.

Fuente: `docs/03_mantenimiento/defectos-reservados.md`.

## Reglas de cambio

1. No mezclar saneamiento técnico con correcciones funcionales reservadas.
2. Antes de corregir un defecto funcional, exigir un caso de prueba reproducible.
3. Toda corrección funcional debe incluir prueba de regresión.
4. Evitar refactorización general. Refactorizar solo cuando una necesidad de prueba o mantenimiento esté demostrada.
5. Mantener la licencia y atribución del proyecto original.
6. No introducir dependencias externas obligatorias cuando exista una alternativa local suficiente para la materia.
7. Cypress Cloud, Percy y proveedores externos de autenticación no deben ser requisitos para el camino local mínimo.
8. Toda nueva documentación debe usar identificadores estables para requisitos, casos de uso, casos de prueba y defectos.

## Verificación mínima esperada

Cuando una tarea modifique código o infraestructura, intentar según corresponda:

```powershell
yarn types
yarn build
yarn test:unit:ci
```

Las pruebas Cypress deben ejecutarse cuando la tarea afecte comportamiento cubierto por E2E/API.

## Evidencia

Registrar para las tareas de calidad:

- commit;
- entorno;
- datos iniciales;
- comando o pasos;
- resultado esperado;
- resultado observado;
- archivo de evidencia;
- relación con requisito/CU/defecto.
