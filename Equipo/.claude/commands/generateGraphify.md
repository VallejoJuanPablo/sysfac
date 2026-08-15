# Comando: /generateGraphify

Genera el grafo de conocimiento Graphify para el proyecto activo o el proyecto indicado.

## Instrucciones para Archie

Al recibir este comando, ejecutar el siguiente flujo:

### Paso 0 — Determinar proyecto objetivo
- Si el usuario pasa un argumento (ej: `/generateGraphify p03`), resolver el proyecto desde `registro/proyectos.md`
- Si no pasa argumento, usar el proyecto activo actual
- Si no hay proyecto activo, pedir al usuario que indique cual

### Paso 1 — Verificar requisitos
Verificar que Python 3.10+ y graphify estan instalados:

```bash
python --version
graphify --version
```

Si `graphify` no esta instalado, instalarlo:
```bash
uv tool install graphifyy
graphify install
```

Si `uv` no esta instalado:
```bash
pip install graphifyy
```

### Paso 2 — Navegar al proyecto
Resolver la ruta del proyecto desde `registro/proyectos.md` y verificar que existe.

### Paso 3 — Verificar si ya existe un grafo
Verificar si existe `graphify-out/` en la raiz del proyecto.

- **Si existe:** preguntar al usuario si quiere regenerar completo o hacer update incremental (`--update`)
- **Si no existe:** generar completo

### Paso 4 — Generar el grafo
Ejecutar desde la raiz del proyecto:

```bash
# Generacion completa
graphify .

# O update incremental
graphify . --update
```

Esto genera `graphify-out/` con:
- `graph.html` — visualizacion interactiva
- `GRAPH_REPORT.md` — resumen y conexiones
- `graph.json` — grafo consultable

### Paso 5 — Integrar con Claude Code
Configurar la integracion con Claude Code en el proyecto:

```bash
graphify claude install
```

Esto inyecta reglas en el `CLAUDE.md` del proyecto y configura hooks PreToolUse.

### Paso 6 — Instalar git hook para auto-rebuild
Instalar el hook que regenera el grafo automaticamente en cada commit:

```bash
graphify hook install
```

Esto instala `post-commit` y `post-checkout` hooks. Verificar con:
```bash
graphify hook status
```

### Paso 7 — Configurar exclusiones (si aplica)
Si el proyecto tiene carpetas que no deben indexarse (node_modules, dist, build, .angular, coverage), verificar que `.graphifyignore` o `.gitignore` las excluyen.

### Paso 8 — Reportar resultado
Mostrar al usuario:

```
## Graphify generado para [nombre del proyecto]

| Metrica | Valor |
|---------|-------|
| Proyecto | [nombre] |
| Ruta | [ruta] |
| Archivos indexados | [cantidad] |
| Grafo | graphify-out/graph.json |
| Visualizacion | graphify-out/graph.html |
| Reporte | graphify-out/GRAPH_REPORT.md |
| Integracion Claude | Configurada |

### Proximos pasos
- Abri `graph.html` en el browser para explorar el grafo visual
- Revisa `GRAPH_REPORT.md` para ver las conexiones clave
- El grafo se usara automaticamente en futuras sesiones de Claude Code
```

### Paso 9 — Registrar uso
Actualizar `registro/skill-usage.json` incrementando el uso de la skill `graphify`.

## Argumentos

| Argumento | Ejemplo | Descripcion |
|-----------|---------|-------------|
| (ninguno) | `/generateGraphify` | Usa el proyecto activo |
| ID de proyecto | `/generateGraphify p03` | Proyecto por ID del registro |
| Nombre | `/generateGraphify idoneo` | Proyecto por nombre parcial |
| `--update` | `/generateGraphify p03 --update` | Solo archivos que cambiaron |

## Ejemplos de uso
```
/generateGraphify              → Proyecto activo
/generateGraphify p03          → IL017-broker-manager-frontend
/generateGraphify agroenvios   → ECO AGROENVIOS
/generateGraphify p07 --update → FrontKit (incremental)
```
