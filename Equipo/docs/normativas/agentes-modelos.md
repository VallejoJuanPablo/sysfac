# Agentes y Modelos — Referencia completa

## Agentes por área
- `backend/nodejs` — Desarrollo backend (Node.js, APIs, bases de datos)
- `frontend/angular` — Desarrollo frontend (Angular, componentes, UI)
- `diseño/ui-ux` — Diseño de interfaces y UX
- `analisis/proyecto` — Análisis de proyecto, context maps, visión global
- `analisis/codigo` — Análisis de código, patrones, deuda técnica
- `verificacion/qualified-code` — Revisión de código contra spec (SDD)
- `verificacion/tester` — Generación de test cases contra spec (SDD)
- `testing/e2e-cypress` — Tests E2E con Cypress
- `testing/unit-backend` — Tests unitarios con Jest
- `infra/devops` — Docker, deploy, CI/CD, monitoreo
- `documentacion/tecnica` — Documentación estructurada

## Mapeo agente → modelo

| Agente | Modelo | Razón |
|--------|--------|-------|
| `analisis/proyecto` | **opus** | Requiere criterio, trade-offs, visión global |
| `analisis/codigo` | **sonnet** | Lectura de código, patrones |
| `backend/nodejs` | **sonnet** | Desarrollo estándar, APIs, CRUD |
| `frontend/angular` | **sonnet** | Componentes, servicios, UI |
| `diseño/ui-ux` | **opus** | Decisiones de UX requieren criterio |
| `verificacion/qualified-code` | **sonnet** | Revisión contra spec |
| `verificacion/tester` | **sonnet** | Generación de tests |
| `testing/e2e-cypress` | **sonnet** | Tests E2E |
| `testing/unit-backend` | **sonnet** | Tests unitarios |
| `infra/devops` | **sonnet** | Docker, deploy, CI/CD |
| `documentacion/tecnica` | **haiku** | Tareas mecánicas |

## Tier Routing — Detección automática de modelo

| Señal detectada | Modelo | Tier |
|-----------------|--------|------|
| Renombrar, formatear, mover archivos | **Haiku** | ECO |
| Buscar en codebase, leer archivos, listar | **Haiku** | ECO |
| CRUD, componente nuevo, fix puntual | **Sonnet** | STD |
| Test unitario o E2E, documentación técnica | **Sonnet** | STD |
| Refactor que toca 5+ archivos | **Sonnet** | STD |
| Decisión arquitectónica, spec, trade-off | **Opus** | MAX |
| Análisis de dominio, context map, DDD | **Opus** | MAX |
| Debugging complejo con múltiples capas | **Opus** | MAX |
