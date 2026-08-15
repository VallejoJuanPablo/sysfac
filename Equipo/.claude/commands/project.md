# /project — Crear o conectar un proyecto administrado por Archie

Creás o conectás un proyecto para que Archie y todo su equipo puedan trabajar en él con agentes, skills, plantillas y `/spec`.

## Instrucciones

Leé el argumento del usuario para determinar qué modo usar.

### Detectar modo

Analizá el argumento:

1. **Si incluye `--existing` o apunta a una carpeta con código existente** → Modo CONECTAR
2. **Si es solo un nombre o nombre + ruta** → Modo CREAR
3. **Si no hay argumento** → Preguntá al usuario qué quiere hacer

### Modo CREAR — Proyecto nuevo

1. **Determinar ubicación:**
   - Si el usuario pasa `--path C:\ruta`, usar esa ruta
   - Si no, crear en `C:\xampp\htdocs\Personal\` (ubicación por defecto de los proyectos del usuario)
   - Confirmar la ubicación con el usuario antes de crear

2. **Crear estructura del proyecto:**
   ```
   NombreProyecto/
   ├── Equipo/          ← Copiar carpeta Equipo completa
   ├── src/             ← Código fuente (vacío, el usuario lo llena)
   ├── docs/            ← Documentación del proyecto
   │   ├── resumenes/
   │   ├── investigacion/
   │   ├── analisis/
   │   ├── planes/
   │   └── specs/
   │       └── INDEX.md
   ├── registro/        ← Registro de tareas
   ├── .gitignore       ← Con node_modules, dist, .env, etc.
   └── CLAUDE.md        ← Configuración del proyecto que referencia a Equipo
   ```

3. **Generar el CLAUDE.md del proyecto** con este contenido base:
   ```markdown
   # [NombreProyecto]

   ## Equipo
   Lee y seguí las instrucciones de `Equipo/CLAUDE.md`

   ## Sobre el proyecto
   [Descripción — preguntar al usuario o dejar placeholder]

   ## Stack
   [Preguntar al usuario qué stack va a usar]

   ## Convenciones del proyecto
   [Se irán agregando a medida que el proyecto avance]
   ```

4. **Generar .gitignore** con las exclusiones estándar del stack del equipo.

5. **Inicializar git** si el usuario lo aprueba.

6. **Correr el agente de documentación** (`.claude/agents/documentacion/tecnica.md`) para generar un README básico.

7. **Informar al usuario** qué se creó y cómo empezar.

### Modo CONECTAR — Proyecto existente

1. **Verificar que la carpeta existe** y tiene código.

2. **Copiar la carpeta Equipo/** a la raíz del proyecto.

3. **Crear o actualizar CLAUDE.md** del proyecto:
   - Si ya existe un CLAUDE.md, agregar la línea `Lee y seguí las instrucciones de Equipo/CLAUDE.md` al inicio, sin borrar el contenido existente.
   - Si no existe, crear uno nuevo con la referencia a Equipo.

4. **Crear carpetas de documentación** si no existen:
   - `docs/` con subcarpetas (resumenes, investigacion, analisis, planes, specs)
   - `docs/specs/INDEX.md`
   - `registro/`

5. **Correr el agente de análisis de proyecto** (`.claude/agents/analisis/proyecto.md`) para escanear el proyecto y generar un resumen en `docs/resumenes/`.

6. **Informar al usuario** qué se conectó y el resumen del análisis.

### Post-setup (ambos modos)

Después de crear o conectar:
- Confirmá que Archie está operativo mostrando un resumen:
  - Ruta del proyecto
  - Agentes disponibles
  - Comandos disponibles (`/spec`, `/project`, `/archie-help`)
  - Próximo paso sugerido (ej: "Podés arrancar con `/spec` para planificar tu primera feature")

## Ejemplos de uso

- `/project MiApp` — Crea proyecto nuevo en ruta por defecto
- `/project MiApp --path D:\proyectos` — Crea en ruta específica
- `/project --existing C:\xampp\htdocs\ClienteX` — Conecta Equipo a proyecto existente
- `/project` — Sin argumento, Archie pregunta qué hacer

## Notas importantes

- **Copiar, no linkear:** Equipo se copia completo al proyecto para que sea independiente y portable. Cambios en el Equipo original no afectan proyectos ya creados.
- **No sobrescribir:** Si la carpeta `Equipo/` ya existe en el proyecto, avisar al usuario y preguntar si quiere actualizarla.
- **Respetar lo existente:** En modo CONECTAR, nunca borrar ni modificar código del usuario. Solo agregar la carpeta Equipo y la infraestructura de docs.

$ARGUMENTS
