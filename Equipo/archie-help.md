# Archie Help — Referencia del Equipo

---

## 1. ¿Quién es Archie?
Archie es el orquestador del equipo. Coordina agentes especializados, delega tareas, entrega informes y documenta todo. Habla en español y siempre explica antes de actuar.

---

## 2. Comandos

| Comando | Qué hace |
|---|---|
| `/spec` | Activa el flujo Spec-Driven Development (7 fases: spec → plan → task → review → code → qualified code → tester) |
| `/spec [descripción]` | Arranca `/spec` con contexto inicial (ej: `/spec Crear API de auth con JWT`) |
| `/project [nombre]` | Crea un proyecto nuevo administrado por Archie |
| `/project --existing [ruta]` | Conecta Equipo a un proyecto existente |
| `/switch` | Lista proyectos registrados o cambia al indicado |
| `/listp` | Lista proyectos registrados |
| `/pendientes` | Gestiona pendientes del equipo |
| `/correo` | Lee correos del equipo |
| `/archie-help` | Muestra esta referencia |

---

## 3. Agentes

Ubicación: `.claude/agents/`

### Backend
| Agente | Archivo | Especialidad |
|---|---|---|
| Node.js | `.claude/agents/backend/nodejs.md` | APIs REST, lógica de negocio, bases de datos |

### Frontend
| Agente | Archivo | Especialidad |
|---|---|---|
| Angular | `.claude/agents/frontend/angular.md` | Componentes, routing, consumo de APIs, UI |

### Diseño
| Agente | Archivo | Especialidad |
|---|---|---|
| UI/UX | `.claude/agents/diseño/ui-ux.md` | Paletas, tipografía, layouts, sistema de diseño |

### Análisis
| Agente | Archivo | Especialidad |
|---|---|---|
| Proyecto | `.claude/agents/analisis/proyecto.md` | Escanea y resume un proyecto completo para dar contexto al equipo |
| Código | `.claude/agents/analisis/codigo.md` | Analiza calidad de código, detecta problemas, propone refactorizaciones |

### Verificación (SDD)
| Agente | Archivo | Especialidad |
|---|---|---|
| Qualified Code | `.claude/agents/verificacion/qualified-code.md` | Verificación adversarial: revisa código contra la spec con tolerancia cero |
| Tester | `.claude/agents/verificacion/tester.md` | Diseña y ejecuta tests contra criterios de aceptación y edge cases |

### Documentación
| Agente | Archivo | Especialidad |
|---|---|---|
| Técnica | `.claude/agents/documentacion/tecnica.md` | READMEs, informes, ADRs, mantenimiento de docs, gestión de plantillas |

---

## 4. Skills del equipo

Ubicación: `.claude/skills/equipo/`

| Skill | Archivo | Descripción |
|---|---|---|
| Node.js | `nodejs.md` | Estándares backend Node.js |
| Angular | `angular.md` | Estándares frontend Angular |
| MongoDB | `mongodb.md` | Patrones y buenas prácticas MongoDB |
| MySQL | `mysql.md` | Patrones y buenas prácticas MySQL |
| Git | `git.md` | Flujo de branches, formato de commits |
| Diseño UI | `diseño-ui.md` | Mobile-first, espaciado, tipografía, colores |
| Microservicios | `microservicios.md` | División por dominio, comunicación entre servicios |
| Optimización de tokens | `optimizacion-tokens.md` | Reducir consumo sin perder calidad |
| Buenas prácticas | `buenas-practicas.md` | SOLID, DRY, KISS, clean code, code smells |
| Patrones de diseño | `patrones-diseño.md` | Factory, Observer, Strategy, Repository |
| Generación de imágenes | `generacion-imagen.md` | Genera imágenes con Gemini Imagen 3 |
| SDD | `sdd.md` | Metodología Spec-Driven Development (7 fases) |
| n8n | `n8n.md` | Automatización, workflows, bots de mensajería |

---

## 5. Skills externas (Claude Code)

Ubicación: `.claude/skills/` (cada una en su carpeta con `SKILL.md`)

### Impeccable — Diseño frontend profesional
| Comando | Qué hace |
|---|---|
| `/impeccable` | Skill principal — craft/teach/extract |
| `/audit` | Auditoría completa de diseño |
| `/critique` | Crítica con heurísticas y personas |
| `/polish` | Pulir detalles visuales |
| `/optimize` | Optimizar rendimiento visual |
| `/harden` | Accesibilidad y robustez |
| `/animate` | Motion design y transiciones |
| `/colorize` | Color y contraste |
| `/typeset` | Tipografía y jerarquía |
| `/layout` | Layout y grids |
| `/adapt` | Responsive design |
| `/bolder` | Hacer elementos más prominentes |
| `/quieter` | Reducir ruido visual |
| `/delight` | Agregar detalles de deleite |
| `/distill` | Simplificar interfaz |
| `/clarify` | Mejorar claridad de UI |
| `/shape` | Planificar UX/UI antes de codear |
| `/overdrive` | Máxima intensidad visual |

### UI UX Pro Max — Motor de diseño con IA
| Comando | Qué hace |
|---|---|
| `/ui-ux-pro-max` | Skill principal — 50+ estilos, 161 paletas, 57 font pairings |
| `/design-system` | Genera sistema de diseño completo (tokens, specs) |
| `/brand` | Branding e identidad visual |
| `/design` | Diseño general con routing inteligente (logos, CIP, banners, icons) |
| `/banner-design` | Banners para redes sociales, ads, web, print |
| `/slides` | Presentaciones HTML con Chart.js |
| `/ui-styling` | Estilos UI con shadcn/ui + Tailwind |

### Emil Kowalski — Design Engineering
| Comando | Qué hace |
|---|---|
| `/emil-design-eng` | Filosofía de UI polish, animaciones, taste como diferenciador |

### Taste Skills — Diseño premium anti-genérico
| Skill | Qué hace |
|---|---|
| `design-taste-frontend` | Senior UI/UX Engineer con reglas métricas |
| `gpt-taste` | GSAP motion, tipografía editorial, bento grids |
| `high-end-visual-design` | Diseño de agencia high-end |
| `minimalist-ui` | Interfaces editoriales limpias |
| `industrial-brutalist-ui` | Interfaces brutalistas, estética militar |
| `brandkit` | Brand guidelines boards premium |
| `image-to-code` | Genera imagen de diseño → implementa en código |
| `imagegen-frontend-web` | Imágenes de referencia por sección para landing pages |
| `imagegen-frontend-mobile` | Conceptos de pantallas mobile premium |
| `redesign-existing-projects` | Audita y upgradea proyectos a calidad premium |
| `stitch-design-taste` | Design system semántico anti-genérico |
| `full-output-enforcement` | Fuerza output completo sin truncar |

---

## 6. Plantillas

Ubicación: `.claude/plantillas/`

| Plantilla | Archivo | Uso |
|---|---|---|
| Tarea | `tarea.md` | Definir y asignar tareas a agentes |
| Informe | `informe.md` | Reportar trabajo completado |
| Spec | `spec.md` | Especificación (Fase 1 de SDD) |
| Plan SDD | `plan-sdd.md` | Plan técnico (Fase 2 de SDD) |
| Tasks SDD | `tasks-sdd.md` | Descomposición de tareas (Fase 3 de SDD) |
| Informe Spec | `informe-spec.md` | Informe final de ciclo `/spec` completado |

---

## 7. Documentación del proyecto

| Carpeta | Contenido |
|---|---|
| `docs/resumenes/` | Resúmenes ejecutivos |
| `docs/investigacion/` | Investigaciones técnicas |
| `docs/analisis/` | Análisis de problemas o decisiones |
| `docs/planes/` | Planes de implementación |
| `docs/specs/` | Informes de ciclos `/spec` completados |
| `docs/specs/INDEX.md` | Índice acumulativo de todas las specs |
| `registro/` | Historial de tareas completadas |

---

## 8. Spec-Driven Development (SDD)

Se activa con `/spec`. Flujo de 7 fases:

```
SPEC → PLAN → TASK → [REVIEW] → CODE → QUALIFIED CODE → TESTER
```

| Fase | Qué hace | Quién |
|---|---|---|
| **1. SPEC** | Define QUÉ se construye (user stories, criterios, edge cases) | Archie + usuario |
| **2. PLAN** | Define CÓMO se construye (arquitectura, decisiones técnicas) | Archie + agente de área |
| **3. TASK** | Descompone en tareas atómicas | Archie |
| **4. REVIEW** | Aprobación del usuario en cada frontera de fase | Usuario |
| **5. CODE** | Ejecuta las tareas | Agente de área |
| **6. QUALIFIED CODE** | Verificación adversarial contra la spec | Agente qualified-code |
| **7. TESTER** | Valida con tests y criterios de aceptación | Agente tester |

Al completar, se genera un informe final en `docs/specs/` y se actualiza el `INDEX.md`.

---

## 9. Herramientas

| Herramienta | Ubicación | Descripción |
|---|---|---|
| Generador de imágenes | `herramientas/imagen/` | Genera imágenes con Gemini Imagen 3 |
| Bot de Telegram | n8n workflows | Bot con menú interactivo y módulos |
| Servicios del equipo | `scripts/` | Health check, startup, DB server |

### Bot de Telegram — Arquitectura de Workflows n8n

El bot de Telegram funciona como un sistema modular de workflows en n8n. Un workflow **router** recibe todos los mensajes y delega a **sub-workflows** especializados.

```
Archie Bot - Menu (router)
├── Telegram Trigger → Extract → Read DB → Router
│   ├── route: pendientes → Execute Pendientes (sub-workflow)
│   ├── route: ssl       → Execute SSL Check (sub-workflow)
│   └── route: menu      → Send Menu (botonera con opciones)
└── Answer Callback

Archie Pendientes Bot (sub-workflow)
├── Execute Workflow Trigger → Extract → Read DB → Logic → Write DB → Send Telegram
└── Flujo completo: proyecto → titulo → descripcion → tipo → prioridad → crear

Archie SSL Check (sub-workflow)
├── Execute Workflow Trigger → Extract → SSH openssl → Format → Send Telegram
└── Consulta certificados SSL en vivo y muestra días restantes
```

**IDs de workflows:**

| Workflow | ID | Tipo | Estado |
|---|---|---|---|
| Archie Bot - Menu | `EIG3uBbmgh8xskol` | Router principal | Activo |
| Archie Pendientes Bot | `ZBgC6QoXA6qDfpyk` | Sub-workflow | Activo |
| Archie SSL Check | `zYb5pc98G6OphPhS` | Sub-workflow | Activo |
| SSL - Alerta Vencimiento (Dinámico) | `YrbjItfiu1G3tV6b` | Cron diario 8AM | Activo |

**Menú del bot (opciones actuales):**

| Opción | Callback | Qué hace |
|---|---|---|
| Pendientes | `menu_pendientes` | Crear pendientes con proyecto, título, descripción, tipo y prioridad |
| Vencimiento SSL | `menu_ssl` | Consultar certificados SSL con fecha y días restantes |

### Agregar un módulo nuevo al bot

Archie puede crear nuevos módulos para el bot de Telegram. El proceso es:

1. **Crear sub-workflow**: un workflow con `Execute Workflow Trigger` que reciba datos, procese y envíe respuesta por Telegram
2. **Actualizar el Router**: agregar el botón al menú y la ruta en el nodo `Router` del workflow Menu
3. **Registrar callbacks**: definir qué callbacks pertenecen al módulo para que el Router los dirija correctamente

**Scripts disponibles:**

| Script | Qué hace |
|---|---|
| `scripts/bot-health.js` | Health check de todos los servicios (MySQL, DB server, n8n, tunnel, workflow, Telegram) |
| `scripts/bot-start.js` | Levanta todos los servicios automáticamente |
| `scripts/setup-bot-menu.js` | Crea/actualiza el workflow Menu + configura Pendientes como sub-workflow |
| `scripts/setup-ssl-menu.js` | Crea/actualiza el módulo SSL y lo integra al menú |
| `scripts/create-telegram-workflow.js` | Script original de creación del workflow Pendientes |
| `scripts/archie-db-server.js` | Servidor HTTP intermediario entre n8n y MySQL (puerto 3456) |

**Infraestructura:**

| Componente | Puerto/URL | Descripción |
|---|---|---|
| MySQL (XAMPP) | `:3306` | Base `archie_team` — tablas: `proyectos`, `pendientes`, `chat_states` |
| Archie DB Server | `:3456` | API HTTP que conecta n8n con MySQL |
| n8n | `:5678` | Motor de workflows (Docker) |
| Cloudflare Tunnel | URL dinámica | Expone n8n para webhooks de Telegram |

---

## 10. Stack del equipo
- **Backend:** Node.js (Express, NestJS)
- **Frontend:** Angular + TypeScript
- **Bases de datos:** MongoDB, MySQL
- **Control de versiones:** Git
- **Diseño:** UI/UX, sistemas de diseño
- **Automatización:** n8n

---

## 11. Estructura de archivos

```
Equipo/
├── CLAUDE.md                          ← Identidad de Archie
├── archie-help.md                     ← Este archivo
├── .claude/
│   ├── agents/                        ← Perfiles de agentes
│   │   ├── backend/nodejs.md
│   │   ├── frontend/angular.md
│   │   ├── diseño/ui-ux.md
│   │   ├── analisis/proyecto.md
│   │   ├── analisis/codigo.md
│   │   ├── verificacion/qualified-code.md
│   │   ├── verificacion/tester.md
│   │   ├── documentacion/tecnica.md
│   │   └── anti-patterns.md
│   ├── skills/                        ← Skills (Claude Code + equipo)
│   │   ├── equipo/                    ← Skills-doc del equipo (13)
│   │   ├── impeccable/               ← Skills de Claude Code (39+)
│   │   ├── emil-design-eng/
│   │   ├── gpt-taste/
│   │   └── ...
│   ├── commands/                      ← Comandos slash
│   │   ├── spec.md                    ← /spec (SDD)
│   │   └── project.md                ← /project (crear/conectar proyectos)
│   └── plantillas/                    ← Templates de reportes (6)
├── herramientas/
│   └── imagen/                        ← Generador de imágenes con Gemini
├── bot/                               ← Bot de Telegram
├── docs/                              ← Documentación del proyecto
│   ├── resumenes/
│   ├── investigacion/
│   ├── analisis/
│   ├── planes/
│   └── specs/
│       └── INDEX.md
└── registro/                          ← Historial de tareas
```

---

## 12. Portabilidad

Para usar Archie en un proyecto nuevo:
```
/project MiApp                           ← Crea proyecto nuevo
/project --existing C:\ruta\al\proyecto  ← Conecta a proyecto existente
```

O manualmente:
1. Copiá la carpeta `Equipo/` a la raíz del proyecto
2. Agregá en el `CLAUDE.md` del proyecto: `Lee y seguí las instrucciones de Equipo/CLAUDE.md`
