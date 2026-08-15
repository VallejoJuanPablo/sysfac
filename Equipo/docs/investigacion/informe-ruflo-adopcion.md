# Informe: Qué aprender de Ruflo y cómo adoptarlo en Archie

**Fecha:** 2026-08-13
**Fuente:** https://github.com/ruvnet/ruflo
**Objetivo:** Identificar ideas concretas de Ruflo que mejoren al equipo Archie sin agregar complejidad innecesaria.

---

## Contexto

Ruflo es un meta-harness industrial para Claude Code con 100+ agentes, 210+ tools MCP, 35 plugins npm, motor Rust y aprendizaje automático. Es un sistema complejo diseñado para equipos grandes y autonomía total.

Archie es un orquestador liviano basado en markdown, portable, human-in-the-loop, diseñado para un desarrollador que gestiona 12 proyectos. Son filosofías diferentes — pero Ruflo tiene ideas que podemos adaptar a nuestra escala.

---

## Resumen ejecutivo

| Idea de Ruflo | Adoptable | Esfuerzo | Impacto |
|---------------|-----------|----------|---------|
| Hooks de Claude Code (settings.json) | Si | Bajo | Alto |
| Background workers automáticos | Si | Medio | Alto |
| Statusline personalizada | Si | Bajo | Medio |
| Checkpoints automáticos | Si | Bajo | Alto |
| Auto-memory hooks | Si | Bajo | Alto |
| Cost tracking por proyecto | Si | Medio | Medio |
| Swarm patterns (agentes paralelos) | Si | Bajo | Alto |
| Estructura de commands expandida | Si | Medio | Medio |
| Health monitoring integrado | Si (ya propuesto) | Medio | Alto |
| Tier routing automático | Parcial | Bajo | Medio |
| HNSW / AgentDB vectorial | No | Alto | Bajo para nosotros |
| SONA aprendizaje neuronal | No | Alto | Bajo para nosotros |
| Federation cross-machine | No | Alto | Innecesario |
| Motor Rust | No | Alto | Innecesario |
| Plugin ecosystem npm | No | Alto | Rompe portabilidad |

---

## 1. HOOKS DE CLAUDE CODE

### Qué hace Ruflo
Configura hooks en `.claude/settings.json` que se ejecutan automáticamente en momentos clave:
- `PreToolUse` — Antes de cada herramienta (bash, edit, write)
- `PostToolUse` — Después de cada herramienta
- `PreCompact` / `PostCompact` — Antes/después de compactar contexto
- `Stop` — Cuando Claude termina de responder

Estos hooks ejecutan scripts que validan, registran o transforman automáticamente.

### Cómo lo adoptaríamos

**Hook 1: Post-edit → Polish check automático**
Después de cada edición en archivo `.html`, `.scss` o `.ts` de un componente UI, recordar que hay que correr `polish` antes de commitear.

**Hook 2: Stop → Checkpoint automático**
Cada vez que Archie termina una respuesta, verificar si hay cambios sin guardar en `archie-context.md` y persistir automáticamente.

**Hook 3: Session-start → Leer contexto**
Al iniciar sesión, leer automáticamente el `archie-context.md` del último proyecto activo.

**Hook 4: Pre-bash → Validar rama**
Antes de ejecutar `git commit`, verificar que no estemos en main/dev/master.

### Implementación
```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "command": "node scripts/hooks/pre-bash.js \"$TOOL_INPUT\""
      }]
    }],
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "node scripts/hooks/on-stop.js"
      }]
    }]
  }
}
```

**Esfuerzo:** 1 sesión. Crear 2-4 scripts JS livianos + configurar settings.json.

---

## 2. BACKGROUND WORKERS

### Qué hace Ruflo
12 workers que corren periódicamente en background:
- `audit` — cada hora
- `optimize` — cada 30 min
- `testgaps` — detecta huecos de testing
- `document` — actualiza docs automáticamente
- `benchmark` — mide performance

### Cómo lo adoptaríamos

No necesitamos 12 workers, pero sí 3-4 tareas automatizadas:

**Worker 1: `testgaps`** — Después de cada feature, escanear si se generaron tests o se registró deuda.
**Worker 2: `context-sync`** — Cada 5 interacciones, verificar que archie-context.md esté al día.
**Worker 3: `skill-reminder`** — Al detectar ciertos patrones (UI nueva, deploy, refactor), recordar qué skills aplicar.

### Implementación
Usar el skill `/loop` de Claude Code para tareas periódicas dentro de la sesión. No requiere infra externa.

**Esfuerzo:** 1 sesión. Son reglas en CLAUDE.md + scripts de verificación.

---

## 3. STATUSLINE PERSONALIZADA

### Qué hace Ruflo
Muestra en la barra inferior de Claude Code: proyecto activo, rama, modelo, workers activos, memoria usada.

### Cómo lo adoptaríamos

Mostrar: `[P03 IL017] feature/fix-xyz | sonnet | 3 skills usadas`

### Implementación
Claude Code tiene `/statusline` nativo. Configurar con un script que lea `proyectos.md` + `git branch`.

**Esfuerzo:** 30 minutos.

---

## 4. CHECKPOINTS AUTOMÁTICOS

### Qué hace Ruflo
Carpeta `.claude/checkpoints/` con snapshots del estado del proyecto en momentos clave. Permite "volver atrás" si algo sale mal.

### Cómo lo adoptaríamos

Ya tenemos `archie-context.md` que es un checkpoint manual. La mejora es hacerlo automático:

- Guardar un checkpoint antes de cada merge
- Guardar un checkpoint al cambiar de proyecto
- Formato: `checkpoints/YYYY-MM-DD-HH-mm-proyecto.md` con estado completo

### Implementación
Script `scripts/checkpoint.js` que:
1. Lee archie-context.md del proyecto activo
2. Agrega timestamp y estado de git (branch, last commit, dirty files)
3. Guarda en `registro/checkpoints/`

**Esfuerzo:** 1 sesión.

---

## 5. AUTO-MEMORY HOOKS

### Qué hace Ruflo
Script `auto-memory-hook.mjs` que persiste contexto automáticamente entre sesiones. No depende de que el usuario diga "guardá".

### Cómo lo adoptaríamos

Ya tenemos la normativa de "guardado continuo" en CLAUDE.md, pero es manual (Archie tiene que acordarse). Un hook lo automatiza:

- Al final de cada respuesta de Archie, el hook verifica si hubo cambios significativos
- Si los hubo, actualiza archie-context.md automáticamente
- Sin intervención del usuario ni de Archie

### Implementación
Hook `Stop` en settings.json que ejecuta `node scripts/hooks/auto-save-context.js`. El script:
1. Detecta si estamos en un proyecto (leyendo último `/switch`)
2. Lee el archie-context.md actual
3. Compara con el estado de git (nuevos commits, archivos modificados)
4. Si hay diferencia, actualiza la sección "Última sesión"

**Esfuerzo:** 1-2 sesiones.

---

## 6. COST TRACKING POR PROYECTO

### Qué hace Ruflo
Plugin `ruflo-cost-tracker` que registra consumo de tokens por proyecto, modelo y tipo de tarea.

### Cómo lo adoptaríamos

Archie ya registra uso de skills y agentes. Falta registrar el costo estimado.

**Archivo:** `registro/cost-tracking.json`
```json
{
  "2026-08": {
    "IL017": { "opus": 12, "sonnet": 45, "haiku": 8, "estimado_usd": 1.85 },
    "GymPulse": { "opus": 2, "sonnet": 15, "haiku": 3, "estimado_usd": 0.52 }
  }
}
```

### Implementación
Usar `/cost` de Claude Code al final de cada sesión y distribuir el costo al proyecto activo. Actualizar el JSON en el hook de `Stop` o manualmente.

**Esfuerzo:** 1 sesión (estructura) + disciplina de registro.

---

## 7. SWARM PATTERNS (AGENTES PARALELOS)

### Qué hace Ruflo
Lanza múltiples agentes en paralelo con roles definidos:
```
researcher → architect → coder → tester → reviewer
```
Cada agente tiene nombre y puede comunicarse con `SendMessage`.

### Cómo lo adoptaríamos

Ya usamos `Agent()` con subagentes. La mejora es formalizar patterns de swarm para tareas grandes:

**Pattern 1: Research Swarm** — 2-3 agentes Haiku exploran diferentes partes del codebase en paralelo.
**Pattern 2: Implement + Test** — Un agente Sonnet implementa mientras otro Sonnet escribe tests en paralelo.
**Pattern 3: Code + Review** — Después de codear, lanzar qualified-code + tester en paralelo para revisión y tests simultáneos.

### Implementación
Documentar los patterns en `.claude/skills/equipo/swarm-patterns.md`:
```javascript
// Pattern: Implement + Test paralelo
Agent({ model: "sonnet", prompt: "Implementar la feature X..." })
Agent({ model: "sonnet", prompt: "Escribir tests para la feature X..." })
// Ambos en el mismo mensaje = paralelo
```

**Esfuerzo:** 30 minutos (documentación). Ya lo podemos hacer, solo falta formalizarlo.

---

## 8. ESTRUCTURA DE COMMANDS EXPANDIDA

### Qué hace Ruflo
19 carpetas de commands organizadas por dominio:
`agents/`, `analysis/`, `automation/`, `coordination/`, `github/`, `hooks/`, `memory/`, `monitoring/`, `optimization/`, `swarm/`, `training/`, `verify/`, etc.

### Cómo lo adoptaríamos

Actualmente tenemos solo `spec.md` en commands. Podemos expandir:

```
.claude/commands/
├── spec.md            ← Ya existe (SDD)
├── audit.md           ← /audit — Correr auditoría técnica del proyecto activo
├── test-debt.md       ← /test-debt — Ver/actualizar deuda de testing
├── deploy.md          ← /deploy — Checklist de deploy para proyecto activo
├── health.md          ← /health — Health check completo (local + VPS)
├── metrics.md         ← /metrics — Métricas del equipo (skills, agentes, costos)
├── swarm.md           ← /swarm — Lanzar tarea con patrón de agentes paralelos
└── review.md          ← /review — Code review con qualified-code + tester
```

### Implementación
Crear los archivos .md con las instrucciones de cada comando.

**Esfuerzo:** 1-2 sesiones.

---

## 9. TIER ROUTING MÁS INTELIGENTE

### Qué hace Ruflo
3 tiers automáticos:
- Tier 1 ($0): Codemods determinísticos sin LLM
- Tier 2 ($0.0002): Haiku para tareas simples
- Tier 3 ($0.003-0.015): Sonnet/Opus para complejas

### Cómo lo adoptaríamos

Ya tenemos tabla de mapeo agente→modelo. La mejora es agregar reglas de detección automática:

| Señal detectada | Modelo |
|-----------------|--------|
| Renombrar, formatear, mover archivos | Haiku |
| CRUD, componente nuevo, fix puntual | Sonnet |
| Decisión arquitectónica, spec, trade-off | Opus |
| Búsqueda en codebase, lectura de archivos | Haiku |
| Refactor que toca 5+ archivos | Sonnet (considerar Opus) |

### Implementación
Agregar sección "Detección automática de modelo" al CLAUDE.md con las señales.

**Esfuerzo:** 15 minutos (solo documentación).

---

## Plan de adopción propuesto

### Fase 1 — Quick wins (1 sesión)
1. Statusline personalizada
2. Tier routing documentado
3. Swarm patterns documentados

### Fase 2 — Hooks (1-2 sesiones)
4. Configurar settings.json con hooks pre-bash y stop
5. Script pre-bash: validación de rama git
6. Script on-stop: checkpoint + context sync

### Fase 3 — Automatización (2 sesiones)
7. Auto-memory hook (persistencia automática de contexto)
8. Checkpoints automáticos pre-merge
9. Commands expandidos (/audit, /deploy, /health, /test-debt)

### Fase 4 — Métricas (1 sesión)
10. Cost tracking por proyecto
11. Dashboard de métricas del equipo

### Total estimado: 5-6 sesiones

---

## Qué NO adoptar y por qué

| Idea de Ruflo | Por qué no |
|---------------|-----------|
| AgentDB vectorial (HNSW) | Overkill para 12 proyectos. archie-context.md es suficiente |
| SONA aprendizaje neuronal | Requiere Rust + infra. Nuestro "aprendizaje" es el CLAUDE.md |
| Federation cross-machine | Somos un solo desarrollador |
| Motor Rust (RuVector) | Mantenimiento complejo sin beneficio real para nosotros |
| Plugin ecosystem npm | Rompe la portabilidad (copiar carpeta y listo) |
| 210+ tools MCP | Ya tenemos los MCPs que necesitamos |
| IPFS/Pinata registry | Complejidad innecesaria |
| 15 agentes simultáneos | 3-4 en paralelo es nuestro máximo práctico |

---

## Conclusión

De las ~30 capacidades de Ruflo, **10 son adoptables** para Archie con esfuerzo moderado (5-6 sesiones). Las mejoras más impactantes son:

1. **Hooks en settings.json** — Automatizan lo que hoy hacemos "de memoria"
2. **Auto-memory** — Resuelve el problema crónico de olvidar guardar contexto
3. **Swarm patterns** — Formalizan algo que ya hacemos ad-hoc
4. **Commands expandidos** — Dan acceso rápido a tareas frecuentes

La filosofía de Archie (simple, portable, human-in-the-loop) se mantiene. Solo adoptamos la automatización que reduce fricción sin agregar complejidad.
