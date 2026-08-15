# Skill — Swarm Patterns (Agentes Paralelos)

## Descripción
Patrones formalizados para lanzar múltiples agentes en paralelo. Maximizan velocidad y calidad al dividir trabajo entre agentes especializados.

## Cuándo usar
- Tareas que se pueden dividir en sub-tareas independientes
- Cuando se necesita implementar y testear simultáneamente
- Para investigar un codebase grande en paralelo
- Code review + testing post-feature

## Patterns

### Pattern 1: Research Swarm
**Para:** Explorar un codebase grande o investigar múltiples fuentes.
**Agentes:** 2-3 Haiku en paralelo, cada uno buscando en una zona distinta.

```javascript
// En un solo mensaje (= paralelo automático):
Agent({ model: "haiku", prompt: "Buscar todos los endpoints de auth en el backend..." })
Agent({ model: "haiku", prompt: "Buscar todos los guards y interceptors en el frontend..." })
Agent({ model: "haiku", prompt: "Buscar todas las referencias a JWT en el proyecto..." })
```

### Pattern 2: Implement + Test
**Para:** Desarrollar feature y escribir tests simultáneamente.
**Agentes:** 2 Sonnet en paralelo — uno codea, otro escribe tests.

```javascript
// El implementador trabaja en el código:
Agent({ model: "sonnet", prompt: "Implementar el endpoint POST /api/clientes con validación Zod, servicio y controller..." })
// El tester escribe tests basándose en la spec:
Agent({ model: "sonnet", prompt: "Escribir tests Jest para POST /api/clientes: happy path, validación fallida, duplicado, error DB..." })
```

**Importante:** Ambos trabajan desde la misma spec/requisito, no desde el código del otro. Los tests se ajustan después si hay diferencias.

### Pattern 3: Code + Review
**Para:** Después de implementar, revisar calidad y tests en paralelo.
**Agentes:** qualified-code (Sonnet) + tester (Sonnet) simultáneos.

```javascript
// Review de calidad contra spec:
Agent({ model: "sonnet", prompt: "Revisar [archivos] contra [spec]. Verificar que cumple todos los requisitos..." })
// Generación de tests:
Agent({ model: "sonnet", prompt: "Generar tests para [feature]. Cubrir: happy path, edge cases, error handling..." })
```

### Pattern 4: Multi-file Refactor
**Para:** Refactorizar múltiples archivos independientes a la vez.
**Agentes:** 2-3 Sonnet, cada uno refactorizando una zona del código.

```javascript
Agent({ model: "sonnet", prompt: "Refactorizar los servicios de auth para usar el patrón Repository..." })
Agent({ model: "sonnet", prompt: "Refactorizar los controllers para delegar lógica a servicios..." })
Agent({ model: "sonnet", prompt: "Actualizar las interfaces y DTOs para consistencia..." })
```

**Precaución:** Solo usar cuando los archivos son independientes. Si comparten imports o interfaces, hacerlo secuencial.

### Pattern 5: Audit Swarm
**Para:** Auditoría completa de un proyecto.
**Agentes:** 3 Haiku explorando + 1 Sonnet consolidando.

```javascript
// Fase 1: Exploración paralela
Agent({ model: "haiku", prompt: "Listar todos los archivos sin tests en el proyecto..." })
Agent({ model: "haiku", prompt: "Buscar vulnerabilidades: console.log, passwords, SQL injection, CORS..." })
Agent({ model: "haiku", prompt: "Verificar que todos los endpoints tienen validación de input..." })
// Fase 2: Consolidación (después de recibir resultados)
// Archie consolida los hallazgos y genera el reporte
```

## Reglas de swarm
1. **Máximo 3-4 agentes paralelos** — más genera overhead sin beneficio
2. **Haiku para exploración**, Sonnet para implementación, Opus solo si hay decisiones complejas
3. **Nunca dos agentes escribiendo el mismo archivo** — conflictos garantizados
4. **Los agentes en paralelo NO se comunican entre sí** — Archie coordina después
5. **Cada agente recibe contexto completo** — no asumir que leyó lo del otro
