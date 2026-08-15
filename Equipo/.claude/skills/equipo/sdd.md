# Skill — Spec-Driven Development (SDD)

## Descripción
Metodología de desarrollo guiado por especificación. La spec es la fuente de verdad, el código es un artefacto derivado que se genera y verifica contra ella. Se activa exclusivamente con el comando `/spec`.

## Principio fundamental
> "Si la spec está bien, el código estará bien."

El código se asume defectuoso hasta que sea verificado adversarialmente contra la especificación original.

## Las 7 fases

### Fase 1 — SPEC (Especificación)
- **Qué hace:** Define QUÉ se construye y POR QUÉ, sin detalles técnicos
- **Artefacto:** `spec.md` en la raíz del proyecto o feature
- **Contenido:**
  - Propósito y contexto del problema
  - User stories con criterios de aceptación (Given/When/Then)
  - Requisitos funcionales y no-funcionales
  - Límites de alcance (qué NO se construye)
  - Catálogo de edge cases
- **Responsable:** Archie (Coordinator) con input del usuario
- **Criterio de salida:** El usuario aprueba la spec

### Fase 2 — PLAN (Planificación técnica)
- **Qué hace:** Traduce la spec en arquitectura técnica. Define el CÓMO
- **Artefacto:** `plan.md`
- **Contenido:**
  - Decisiones de arquitectura con justificación
  - Modelos de datos / contratos de API
  - Selección de librerías y herramientas
  - Estrategia de migración (si aplica)
  - Diagrama de componentes (Mermaid cuando sea útil)
- **Responsable:** Archie delegando al agente de área correspondiente
- **Restricción:** Alineado con el stack y convenciones del proyecto
- **Criterio de salida:** El usuario aprueba el plan

### Fase 3 — TASK (Descomposición en tareas)
- **Qué hace:** Descompone el plan en unidades atómicas de trabajo
- **Artefacto:** `tasks.md`
- **Contenido por tarea:**
  - Objetivo único y claro
  - Paths exactos de archivos a crear/modificar
  - Dependencias con otras tareas
  - Pasos de verificación
  - Estimación: pequeña (< 5 min) | mediana (5-15 min) | grande (15+ min)
- **Responsable:** Archie
- **Criterio de salida:** El usuario aprueba las tareas antes de ejecutar

### Fase 4 — REVIEW (Revisión humana en cada frontera)
- **Qué hace:** Checkpoint humano antes de avanzar a la siguiente fase
- **Regla:** Los humanos revisan en cada frontera de fase
  - La spec se revisa antes del plan
  - El plan se revisa antes de las tareas
  - Las tareas se revisan antes de la implementación
- **Responsable:** El usuario
- **Criterio de salida:** Aprobación explícita del usuario

### Fase 5 — CODE (Implementación)
- **Qué hace:** Ejecuta las tareas una por una
- **Método:** 
  - Implementar con TDD cuando sea posible (Red → Green → Refactor)
  - Una tarea a la vez, en orden de dependencias
  - Commits atómicos por tarea completada
- **Responsable:** Agente de área (backend/frontend/diseño según la tarea)
- **Criterio de salida:** Todas las tareas implementadas

### Fase 6 — QUALIFIED CODE (Verificación adversarial)
- **Qué hace:** Revisión adversarial con tolerancia cero contra la spec
- **Verificaciones:**
  - Fidelidad: ¿el código cumple exactamente con la spec?
  - Calidad: ¿sigue las buenas prácticas del equipo?
  - Seguridad: ¿hay vulnerabilidades?
  - Cobertura: ¿faltan edge cases de la spec?
  - Gaps: ¿hay diferencia entre lo especificado y lo implementado?
- **Responsable:** Agente `verificacion/qualified-code`
- **Si falla:** Los problemas se rutean a la fase correcta:
  - Bug de spec → Fase 1
  - Gap de tareas → Fase 3
  - Problema de implementación → Fase 5
- **Criterio de salida:** Cero gaps entre spec e implementación

### Fase 7 — TESTER (Validación final)
- **Qué hace:** Verifica que el sistema se comporta según la spec original
- **Verificaciones:**
  - Tests unitarios cubren la lógica de negocio
  - Tests de integración verifican flujos completos
  - Edge cases de la spec están cubiertos
  - No hay regresiones en funcionalidad existente
- **Responsable:** Agente `verificacion/tester`
- **Criterio de salida:** Todos los tests pasan, criterios de aceptación cumplidos

## Flujo con retroalimentación

```
SPEC → PLAN → TASK → [REVIEW] → CODE → QUALIFIED CODE → TESTER
  ↑      ↑      ↑                  |           |            |
  └──────┴──────┴── feedback ──────┴───────────┴────────────┘
```

Si se detecta un problema en cualquier fase posterior, vuelve a la fase correcta.

## Arquitectura de agentes

| Rol | Agente | Función |
|-----|--------|---------|
| **Coordinator** | Archie | Orquesta las fases, genera spec/plan/tasks, delega |
| **Implementor** | backend/frontend/diseño | Ejecutan las tareas de código |
| **Verifier** | verificacion/qualified-code | Revisa adversarialmente contra la spec |
| **Tester** | verificacion/tester | Valida con tests y criterios de aceptación |

## Artefactos generados
Cada ejecución de `/spec` genera en la carpeta del proyecto:
- `spec.md` — Especificación aprobada
- `plan.md` — Plan técnico aprobado
- `tasks.md` — Lista de tareas descompuestas
- Informe final en `docs/specs/` — Resumen de todo el ciclo

## Cuándo usar SDD
- Features nuevas con requisitos claros o que necesitan clarificarse
- Refactorizaciones grandes que afectan múltiples archivos
- Integraciones con servicios externos
- Cualquier trabajo donde "improvisar" generaría retrabajo

## Cuándo NO usar SDD
- Bug fixes puntuales
- Cambios de estilo o copy
- Tareas de una sola línea
- Cuando el usuario no invoca `/spec`
