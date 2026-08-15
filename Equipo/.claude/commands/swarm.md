# /swarm — Lanzar tarea con agentes paralelos

Ejecutar una tarea dividida entre múltiples agentes trabajando en paralelo.

## Uso
`/swarm <pattern> <descripción de la tarea>`

## Patterns disponibles

### research — Explorar codebase en paralelo
2-3 agentes Haiku buscando en zonas distintas del proyecto.
Útil para: entender un codebase nuevo, buscar bugs, mapear dependencias.

### implement-test — Implementar y testear simultáneamente
1 agente Sonnet implementa + 1 agente Sonnet escribe tests.
Útil para: features nuevas donde la spec está clara.

### code-review — Revisar calidad + generar tests
qualified-code (Sonnet) revisa código + tester (Sonnet) genera tests.
Útil para: después de implementar una feature, antes de merge.

### refactor — Refactorizar múltiples zonas
2-3 agentes Sonnet, cada uno refactorizando archivos independientes.
Útil para: cambios grandes que tocan muchos archivos sin dependencias cruzadas.

### audit — Auditar seguridad + calidad + performance
3 agentes Haiku explorando + Archie consolida resultados.
Útil para: revisión completa antes de deploy.

## Pasos
1. **Leer** skill `.claude/skills/equipo/swarm-patterns.md`
2. **Identificar** el pattern correcto según la tarea
3. **Lanzar** los agentes en un solo mensaje (= paralelo automático)
4. **Consolidar** resultados cuando todos terminen
5. **Reportar** resultado unificado al usuario

## Reglas
- Máximo 3-4 agentes paralelos
- Nunca dos agentes escribiendo el mismo archivo
- Haiku para exploración, Sonnet para implementación
