# Skill: n8n (Automatización de Workflows)

## Descripción
Integración con n8n para gestionar workflows de automatización. Archie puede crear, modificar y administrar workflows completos usando la API REST de n8n, incluyendo bots de Telegram con arquitectura modular.

## Conexión
- **API REST:** `http://localhost:5678/api/v1`
- **Autenticación:** API Key (JWT) en header `X-N8N-API-KEY`
- **n8n:** Docker container, puerto 5678
- **MCP (opcional):** `@leonardsellem/n8n-mcp-server`

## Capacidades

### Gestión de Workflows via API
Archie interactúa directamente con la API REST de n8n para CRUD completo de workflows:
- Crear workflows con nodos, conexiones y credenciales
- Actualizar workflows existentes (lógica, nodos, trigger)
- Activar/desactivar workflows
- Consultar ejecuciones y diagnosticar errores

### Bot de Telegram — Arquitectura Modular
Archie diseña e implementa bots de Telegram usando una arquitectura de sub-workflows:

```
Menu (router) → Sub-workflow A (ej: pendientes)
              → Sub-workflow B (ej: SSL check)
              → Sub-workflow C (futuro módulo)
```

**Patrón de cada módulo:**
1. **Sub-workflow** con `Execute Workflow Trigger` — recibe datos, procesa, envía respuesta
2. **Router** en el Menu — botón en el menú + ruta en el nodo Code
3. **Callbacks con prefijo** — el Router identifica qué módulo maneja cada callback

**Nodos n8n que Archie sabe usar:**
| Nodo | Uso |
|---|---|
| `telegramTrigger` | Recibir updates del bot |
| `executeWorkflowTrigger` | Trigger de sub-workflows |
| `executeWorkflow` | Llamar sub-workflows (formato resource locator: `__rl: true, mode: 'id'`) |
| `code` | Lógica en JavaScript (extract, router, format) |
| `httpRequest` | Enviar mensajes a Telegram API, consultar DB server |
| `ssh` | Ejecutar comandos remotos (ej: openssl para certificados) |
| `if` | Routing condicional entre ramas |
| `emailSend` | Enviar alertas por email |
| `scheduleTrigger` | Cron jobs (ej: chequeo diario de SSL) |

**Consideraciones técnicas:**
- El nodo `executeWorkflow` v1.1 requiere formato resource locator: `{ __rl: true, mode: 'id', value: 'ID' }`
- Los sub-workflows deben estar **activos** antes de que el router los referencie
- El código de los nodos Code se almacena como string en el campo `jsCode` — los Unicode escapes son single-escaped (`\ud83d\udccb`)
- Para separar lógica de escaping, se guarda el código en archivos `.js` separados y se lee con `fs.readFileSync`

### Scripts del equipo
| Script | Qué hace |
|---|---|
| `scripts/bot-health.js` | Health check de todos los servicios |
| `scripts/bot-start.js` | Levanta todo: MySQL → DB server → tunnel → n8n → workflow |
| `scripts/setup-bot-menu.js` | Setup del Menu router + Pendientes sub-workflow |
| `scripts/setup-ssl-menu.js` | Setup del módulo SSL + integración al menú |
| `scripts/archie-db-server.js` | API HTTP intermediaria entre n8n (Docker) y MySQL (XAMPP) |

## Casos de uso
- **Bots de Telegram**: menú interactivo, gestión de pendientes, consulta de SSL, cualquier módulo nuevo
- **Alertas automáticas**: monitoreo de certificados SSL, estados de MySQL, etc.
- **Automatización**: tareas repetitivas del equipo via cron
- **Integración de servicios**: conectar APIs externas, bases de datos, notificaciones

## Requisitos
- n8n corriendo en `localhost:5678` (Docker)
- API Key configurada en n8n (Settings > API)
- Para bot Telegram: Cloudflare Tunnel activo + DB server en :3456
- Para SSH: credenciales configuradas en n8n
