# Skill — OpenSpec (Spec-Driven Development alternativo)

## Descripción
Framework de desarrollo guiado por especificación creado por Fission AI. Alternativa al SDD propio del equipo. Se usa **solo cuando el usuario lo solicita explícitamente**.

## Regla de activación
- `/spec` → **siempre usa SDD** (comportamiento por defecto, no cambia)
- Si el usuario menciona "openspec", "open spec", "usar openspec", "con openspec" → Archie **pregunta confirmación** antes de cambiar de metodología
- Nunca se activa automáticamente

## Filosofía (4 principios)
1. **Fluid not rigid** — sin phase gates forzados
2. **Iterative not waterfall** — refinás sobre la marcha
3. **Easy not complex** — mínima ceremonia
4. **Brownfield-first** — pensado para proyectos existentes

## Estructura de carpetas
Al usar OpenSpec, se crea en la raíz del proyecto:

```
openspec/
├── specs/                     ← Source of truth del sistema actual
│   └── [dominio]/             ← Organizadas por dominio (auth, orders, etc.)
│       └── [feature].md       ← Spec con Requirements + Scenarios
├── changes/                   ← Cambios propuestos (aislados)
│   └── [feature-name]/
│       ├── proposal.md        ← Intent, scope, in/out of scope
│       ├── specs/             ← Delta specs (ADDED/MODIFIED/REMOVED)
│       ├── design.md          ← Decisiones técnicas, arquitectura
│       └── tasks.md           ← Checklist de implementación
└── archive/                   ← Cambios completados
    └── [YYYY-MM-DD-feature]/  ← Se mueven acá al cerrar
```

## Flujo de trabajo

### Paso 1 — PROPOSE
Crear la propuesta del cambio:
- Archivo: `openspec/changes/[feature]/proposal.md`
- Contenido: qué se quiere hacer, por qué, qué incluye, qué excluye
- Mostrar al usuario y pedir aprobación

### Paso 2 — SPECS (Delta Specs)
Escribir las especificaciones como deltas:
- Archivo: `openspec/changes/[feature]/specs/[dominio].md`
- Formato:
```markdown
## ADDED Requirements
### Requirement: [Título descriptivo]
[Descripción con RFC 2119: MUST, SHOULD, MAY]

#### Scenarios
- GIVEN [precondición]
- WHEN [acción]
- THEN [resultado observable]

## MODIFIED Requirements
### Requirement: [Título] (was: [valor anterior], now: [valor nuevo])

## REMOVED Requirements
### Requirement: [Título]
[Razón de la eliminación]
```
- Mostrar al usuario y pedir aprobación

### Paso 3 — DESIGN
Documentar la solución técnica:
- Archivo: `openspec/changes/[feature]/design.md`
- Contenido: arquitectura, archivos afectados, data flow, decisiones técnicas con justificación
- Mostrar al usuario y pedir aprobación

### Paso 4 — TASKS
Descomponer en tareas:
- Archivo: `openspec/changes/[feature]/tasks.md`
- Formato: checklist jerárquico con checkboxes
```markdown
## Tasks
- [ ] 1. [Tarea principal]
  - [ ] 1.1 [Sub-tarea]
  - [ ] 1.2 [Sub-tarea]
- [ ] 2. [Tarea principal]
```
- Mostrar al usuario y pedir aprobación

### Paso 5 — APPLY (Implementación)
Ejecutar las tareas una por una:
- Marcar checkboxes en tasks.md conforme se completan
- Commitear cada tarea o grupo lógico

### Paso 6 — VERIFY
Verificar que todo funciona:
- Revisar cada scenario de las delta specs
- Build sin errores
- Reportar resultado al usuario

### Paso 7 — ARCHIVE
Cerrar el cambio:
1. Mergear delta specs a las specs principales en `openspec/specs/`
   - ADDED → se agregan
   - MODIFIED → se reemplazan
   - REMOVED → se eliminan
2. Mover la carpeta del cambio a `openspec/archive/[YYYY-MM-DD-feature]/`
3. Confirmar al usuario

## Formato de specs (source of truth)

```markdown
# [Dominio] — [Feature]

## Purpose
[Qué hace esta parte del sistema]

## Requirements

### Requirement: [Título]
[Descripción. Usa MUST/SHOULD/MAY según RFC 2119]

#### Scenarios
- GIVEN [precondición]
- WHEN [acción]  
- THEN [resultado observable]
```

## Diferencias con SDD del equipo

| Aspecto | SDD (default) | OpenSpec |
|---------|---------------|----------|
| Activación | `/spec` | Usuario pide "con openspec" |
| Fases | 7 fases fijas con aprobación | Fluidas, sin gates rígidos |
| Specs | Una por feature, se archiva como informe | Acumulativas + deltas por cambio |
| QA | Qualified Code + Tester | Verify |
| Archivado | Informe en `docs/specs/` | Delta merge + move a `archive/` |
| Criterios | Given/When/Then | Given/When/Then + MUST/SHOULD/MAY |
| Artefactos | spec.md, plan-sdd.md, tasks-sdd.md, informe-spec.md | proposal.md, specs/, design.md, tasks.md |

## Notas
- SDD **no cambia** — sigue siendo el default para `/spec`
- OpenSpec es experimental — se está probando como alternativa
- Ambos pueden coexistir en el mismo proyecto (SDD en `docs/specs/`, OpenSpec en `openspec/`)
- El tracking de uso se registra en `skill-usage.json` como skill separada
