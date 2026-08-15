# Skill — Graphify (Knowledge Graph del Codebase)

## Descripcion
Convierte cualquier proyecto en un grafo de conocimiento consultable. En vez de que Claude haga grep/read archivo por archivo para orientarse, Graphify parsea el AST del codigo y genera un grafo con relaciones reales: que llama a que, que importa que, que modulos son centrales.

## Beneficios
- **Ahorro de tokens:** 6x-49x menos tokens de navegacion segun tamaño del proyecto
- **Ahorro de tiempo:** menos tool calls = menos round-trips = sesiones mas rapidas
- **Precision:** Claude carga solo los nodos relevantes del grafo, no todo el repo

## Cuando usarlo
- Proyectos con **100+ archivos** (debajo de 100, grep ya es barato)
- Al iniciar trabajo en un repo grande o desconocido
- Antes de specs SDD en proyectos complejos
- Cuando Claude gasta muchos tokens solo orientandose

## Cuando NO usarlo
- Proyectos chicos (< 100 archivos)
- Cambios puntuales donde ya se sabe el archivo exacto
- Si el grafo no esta generado y no hay tiempo para generarlo

## Rangos de ahorro por tamaño

| Archivos en src/ | Ahorro estimado | Recomendacion |
|-------------------|-----------------|---------------|
| < 100 | Marginal | No vale la pena |
| 100 - 500 | 6x - 15x | Recomendado |
| 500+ | 30x - 49x | Muy recomendado |
| 1000+ | Hasta 71x | Esencial |

## Requisitos
- **Python 3.10+** instalado
- **uv** (recomendado) o pipx
- Paquete: `graphifyy` (doble y en PyPI)
- Comando: `graphify` (sin doble y)

## Instalacion (una sola vez por maquina)

```bash
# 1. Instalar el paquete
uv tool install graphifyy

# 2. Registrar con Claude Code
graphify install
```

Si el shell no encuentra `graphify`, ejecutar `uv tool update-shell` y abrir terminal nueva.

## Uso por proyecto

### Generar el grafo
```bash
# Desde la raiz del proyecto
graphify .

# Solo archivos que cambiaron (rebuild incremental)
graphify . --update
```

### Archivos generados
El comando genera `graphify-out/` en la raiz del proyecto:

| Archivo | Descripcion |
|---------|-------------|
| `graph.html` | Visualizacion interactiva (abrir en browser) |
| `GRAPH_REPORT.md` | Resumen, conexiones, preguntas sugeridas |
| `graph.json` | Grafo consultable en JSON |

### Consultar el grafo
```bash
graphify query "que conecta auth con la base de datos?"
graphify path "UserService" "DatabasePool"
graphify explain "RateLimiter"
```

### Auto-rebuild en commits
```bash
graphify hook install
```

## Integracion con Claude Code
Graphify inyecta reglas en `CLAUDE.md` del proyecto y configura un hook `PreToolUse` que redirige a Claude para que consulte el grafo antes de hacer grep/read masivo.

```bash
# Configurar integracion completa con Claude Code
graphify claude install
```

## Configuracion de exclusiones
Crear `.graphifyignore` en la raiz del proyecto (misma sintaxis que `.gitignore`). Graphify tambien respeta `.gitignore` automaticamente.

## Buenas practicas
1. **Commitear `graphify-out/`** al repo para que todo el equipo lo use
2. **Regenerar con `--update`** despues de cambios grandes
3. **Instalar el hook** para auto-rebuild en cada commit
4. **Revisar `GRAPH_REPORT.md`** antes de trabajar en un proyecto nuevo

## Advertencia de compatibilidad
En Claude Code v2.1.117+ se cambio como funcionan Grep/Glob internamente. Si el hook PreToolUse no intercepta correctamente, verificar la version de Graphify y actualizar:
```bash
uv tool upgrade graphifyy
```

## Relacion con otras skills
- **SDD:** Generar el grafo ANTES de iniciar `/spec` en proyectos grandes para que las fases de analisis sean mas eficientes
- **DDD:** El grafo ayuda a visualizar bounded contexts y dependencias entre modulos
- **Analisis de codigo:** El agente `analisis/codigo` puede usar el grafo como fuente primaria
