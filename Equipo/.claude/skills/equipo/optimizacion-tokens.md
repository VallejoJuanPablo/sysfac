# Skill — Optimización de Tokens

## Descripción
Estrategias y reglas para que Archie y los agentes minimicen el consumo de tokens sin perder calidad.

## Monitoreo
- Usar `/cost` para ver el consumo actual de la sesión
- La barra de estado inferior muestra el costo acumulado en tiempo real
- Al cerrar sesión se muestra un resumen final de tokens y costo
- No existe tracking global/semanal nativo — usar console.anthropic.com si se usa API key propia

## Reglas para Archie y los agentes

### Contexto
- Usar `/compact` después de fases de exploración o cuando se cambia de tema
- Usar `/clear` entre tareas no relacionadas
- Corregir temprano: si la dirección es incorrecta, presionar Escape y redirigir
- Nunca leer archivos completos si solo se necesita una sección (usar offset y limit)

### Prompts
- Ser específico: "Agregá validación en login() de auth.ts" en vez de "mejorá este código"
- En sub-agentes, escribir instrucciones claras y autocontenidas
- Usar Plan Mode (Shift+Tab) antes de tareas complejas para alinear enfoque

### Selección de modelo
- **Sonnet** para el 80% del trabajo diario (ediciones, tests, explicaciones)
- **Opus** solo para decisiones arquitectónicas, debugging difícil o razonamiento complejo
- **Haiku** para sub-agentes con tareas simples (búsquedas, formateo, renombrado)
- Cambiar con: `/model sonnet`, `/model opus`, `/model haiku`

### CLAUDE.md eficiente
- Mantener bajo 200 líneas / ~2,000 tokens (se inyecta en CADA request)
- Usarlo como índice con links a archivos detallados
- Mover instrucciones específicas de workflows a skills separadas

### .claudeignore (crear en raíz del proyecto)
Excluir archivos pesados que no aportan contexto:
```
node_modules/
dist/
build/
*.lock
*.min.js
.git/
coverage/
```

### Prompt caching
- Es automático en Claude Code: los cache reads cuestan 10% del precio base
- El cache tiene TTL de 5 minutos — trabajar dentro de esa ventana
- El CLAUDE.md se cachea automáticamente después del primer uso

### Sub-agentes
- Delegar operaciones verbosas (tests, logs, lecturas masivas) a sub-agentes
- El output queda en su contexto y solo retorna un resumen al principal
- Configurar modelo inferior para sub-agentes cuando la tarea lo permita

### Pensamiento extendido
- Para tareas simples, reducir el esfuerzo con `/effort`
- Toggle rápido del thinking: Alt+T

## Impacto estimado
| Estrategia | Ahorro estimado |
|---|---|
| Sonnet por defecto en vez de Opus | ~60% |
| Sub-agentes en Haiku | ~80% vs modelo principal |
| CLAUDE.md optimizado + .claudeignore | 10-30% acumulativo |
| Compact y clear proactivos | 15-25% |
| **Combinación de todo** | **40-70% reducción total** |
