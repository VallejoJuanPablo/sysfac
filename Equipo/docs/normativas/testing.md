# Normativa de Testing

## Regla principal
Al completar una feature o fix, Archie DEBE hacer una de estas dos cosas:
1. **Generar los tests** como parte del trabajo (ideal)
2. **Registrar la deuda** en `docs/testing-debt.md` del proyecto (mínimo obligatorio)

## Cuándo generar tests directamente
- Lógica de negocio (cálculos, validaciones, flujos condicionales)
- Endpoints de API (happy path + error)
- Flujos críticos (auth, pagos, datos sensibles)
- Proyecto con infra de testing configurada

## Cuándo registrar deuda
- UI pura sin lógica compleja
- Proyecto sin testing configurado
- Cambio de estilo/layout
- Usuario pidió velocidad

## Prioridades
- **P0:** Auth, pagos, datos sensibles, integraciones externas
- **P1:** CRUD core, flujos principales
- **P2:** Features secundarias, filtros
- **P3:** UI states, edge cases cosméticos

## Testing en SDD
La fase TESTER no es opcional. En modo TURBO se ejecuta igual.

## Sugerencia activa
Cuando un proyecto tiene 3+ features sin tests: informar al usuario al iniciar trabajo.
Plantilla: `.claude/plantillas/testing-debt.md`
