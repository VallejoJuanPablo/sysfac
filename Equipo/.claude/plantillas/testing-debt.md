# Testing Debt — {PROYECTO}

> Generado automáticamente por Archie al completar features sin tests.
> Última actualización: {FECHA}

## Resumen
- **Tests existentes:** {N_EXISTENTES} (unit: {N_UNIT}, e2e: {N_E2E}, integration: {N_INT})
- **Deuda acumulada:** {N_DEUDA} features sin cobertura
- **Prioridad máxima:** {P_MAX}

## Deuda de testing

| # | Feature / Módulo | Tipo de test necesario | Prioridad | SPEC origen | Estado |
|---|-----------------|----------------------|-----------|-------------|--------|
| 1 | {feature} | unit / e2e / integration | P0-P3 | SPEC-XXX o N/A | pendiente / en progreso / cubierto |

## Prioridades
- **P0:** Funcionalidad crítica de negocio sin ningún test (auth, pagos, datos sensibles)
- **P1:** Flujos principales del usuario (CRUD core, navegación principal)
- **P2:** Features secundarias (filtros, ordenamiento, UI states)
- **P3:** Edge cases, validaciones cosméticas

## Plan de cobertura sugerido
1. Cubrir todos los P0 primero (estimado: {N} specs)
2. P1 en el siguiente sprint de testing
3. P2-P3 como parte del desarrollo normal (test al cerrar feature)

## Notas
- Este archivo se actualiza cada vez que se completa una feature sin tests
- Al cubrir una deuda, cambiar estado a "cubierto" y agregar referencia al commit/spec
