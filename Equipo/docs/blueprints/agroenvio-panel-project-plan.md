# AgroEnvioPanel — Plan de Proyecto

- **Fecha:** 2026-06-09
- **ID proyecto:** P08
- **Tipo:** Frontend Admin Panel
- **Base visual:** FrontKit tpl-dashboard (sidebar dark + content light)
- **Backend:** AgroEnvios API (ae-api-gateway → ae-auth + ae-togoagro-hub)

---

## 1. Resumen

Panel de administración para la plataforma AgroEnvios. Permite gestionar clientes, operadores logísticos, servicios, envíos, tracking, cotizaciones, etiquetas y configuración del sistema. Se conecta al backend existente via REST API (46 endpoints).

## 2. Stack Técnico

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Angular | 20 | Framework frontend |
| Tailwind CSS | 4 | Estilos utility-first |
| SCSS | — | Keyframes y estilos complejos del shell |
| Angular Router | — | Navegación SPA |
| HttpClient | — | Comunicación con API |
| Angular Signals | — | Estado reactivo |
| Heroicons | — | Iconografía (SVG inline) |

**NO usar:** Angular Material, Bootstrap, NgRx, librerías de componentes externas.
**Diseño basado en:** FrontKit tpl-dashboard (sidebar slate-900, content slate-50, indigo accent).

## 3. Arquitectura

```
AgroEnvioPanel/
├── src/
│   ├── app/
│   │   ├── core/                     ← Singleton services
│   │   │   ├── auth/                 ← AuthService, AuthGuard, JWT interceptor
│   │   │   ├── api/                  ← ApiService (HttpClient wrapper)
│   │   │   └── layout/              ← ShellComponent (sidebar + topbar + outlet)
│   │   │
│   │   ├── shared/                   ← Componentes reutilizables
│   │   │   ├── components/           ← Table, Card, Badge, Modal, Form controls
│   │   │   ├── pipes/                ← Date, Currency, Status
│   │   │   └── interfaces/           ← Todas las interfaces TypeScript
│   │   │
│   │   ├── features/                 ← Módulos por feature (lazy loaded)
│   │   │   ├── dashboard/            ← KPIs, gráficos, actividad reciente
│   │   │   ├── clientes/             ← CRUD + operadores + servicios
│   │   │   ├── operadores/           ← CRUD + servicios + cobertura
│   │   │   ├── servicios/            ← Por operador, configuración
│   │   │   ├── envios/               ← Prepostagems, detalle, tracking
│   │   │   ├── cotizaciones/         ← Quotes, volúmenes, simulador
│   │   │   ├── rastro-estados/       ← Tabla de mapeo CRUD
│   │   │   ├── usuarios/             ← Gestión de usuarios
│   │   │   └── configuracion/        ← Webhooks, API keys, integraciones
│   │   │
│   │   ├── app.routes.ts
│   │   ├── app.ts
│   │   ├── app.html
│   │   └── app.scss
│   │
│   ├── environments/
│   │   ├── environment.ts            ← API_URL: http://localhost:6050
│   │   └── environment.prod.ts       ← API_URL: producción
│   │
│   └── styles/
│       ├── _variables.scss           ← Design tokens
│       └── styles.scss               ← Tailwind + global
```

## 4. Design System (basado en tpl-dashboard)

### Colores
| Token | Valor | Uso |
|-------|-------|-----|
| `--sidebar-bg` | `#0f172a` (slate-900) | Fondo sidebar |
| `--content-bg` | `#f8fafc` (slate-50) | Fondo content area |
| `--card-bg` | `#ffffff` | Fondo cards |
| `--card-border` | `#e2e8f0` (slate-200) | Bordes cards |
| `--primary` | `#6366f1` (indigo-500) | Accent, botones, links activos |
| `--primary-light` | `rgba(99,102,241,0.12)` | Bg hover sidebar |
| `--text-primary` | `#0f172a` (slate-900) | Headings |
| `--text-secondary` | `#64748b` (slate-500) | Body text |
| `--text-muted` | `#94a3b8` (slate-400) | Labels, placeholders |
| `--success` | `#10b981` (emerald-500) | Status activo, positivo |
| `--danger` | `#ef4444` (red-500) | Errores, eliminar |
| `--warning` | `#f59e0b` (amber-500) | Alertas, pendiente |

### Layout
- **Sidebar:** 240px expandido, 68px colapsado, transición 0.25s
- **Topbar:** 60px alto, blanca con border-bottom slate-200
- **Content:** flex-1, overflow-y auto, padding 1.75rem 2rem
- **Cards:** white bg, border slate-200, rounded-xl, shadow-sm

### Tipografía
- **Font:** Inter
- **Headings:** font-bold, slate-900, tracking-tight
- **Body:** text-sm, slate-600
- **Labels:** text-xs, font-semibold, slate-500, uppercase tracking-widest

## 5. Pantallas y Rutas

### 5.1 Auth (sin sidebar)
| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/login` | LoginComponent | Email + password, JWT → localStorage |

### 5.2 Dashboard (con sidebar)
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/dashboard` | DashboardComponent | GET /admin/clientes (count), estadísticas de clientes |

### 5.3 Clientes
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/clientes` | ClienteListComponent | GET /admin/clientes (paginado, filtros) |
| `/clientes/nuevo` | ClienteFormComponent | POST /admin/clientes |
| `/clientes/:id` | ClienteDetailComponent | GET /admin/clientes/:id |
| `/clientes/:id/editar` | ClienteFormComponent | PATCH /admin/clientes/:id |
| `/clientes/:id/operadores` | ClienteOperadoresComponent | GET/POST/DELETE /admin/clientes/:id/operadores |
| `/clientes/:id/servicios` | ClienteServiciosComponent | GET/POST/PATCH/DELETE /admin/clientes/:id/servicios |
| `/clientes/:id/perfil-completo` | ClientePerfilComponent | GET /admin/clientes/:id/perfil-completo |

### 5.4 Operadores Logísticos
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/operadores` | OperadorListComponent | GET /admin/operadores (paginado) |
| `/operadores/nuevo` | OperadorFormComponent | POST /admin/operadores |
| `/operadores/:id` | OperadorDetailComponent | GET /admin/operadores/:id |
| `/operadores/:id/editar` | OperadorFormComponent | PATCH /admin/operadores/:id |
| `/operadores/:id/servicios` | OperadorServiciosComponent | GET/POST /admin/operadores/:id/servicios |
| `/operadores/:id/cobertura` | OperadorCoberturaComponent | PUT /admin/operadores/:id/cobertura |
| `/operadores/:id/health` | — (inline) | GET /admin/operadores/:id/health |

### 5.5 Servicios
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/servicios/:id` | ServicioDetailComponent | GET /admin/servicios/:id |
| `/servicios/:id/editar` | ServicioFormComponent | PATCH /admin/servicios/:id |

### 5.6 Envíos (Prepostagems)
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/envios` | EnvioListComponent | GET /prepostagem/get-prepostagem-local |
| `/envios/:id` | EnvioDetailComponent | GET prepostagem-local (by id) + rastro + rotulo |
| `/envios/nuevo` | EnvioCrearComponent | POST /prepostagem/create-prepostagem |

### 5.7 Cotizaciones
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/cotizaciones` | CotizacionSimuladorComponent | POST /cotizacion/get-cotizacion-hub |
| `/cotizaciones/:quoteId` | CotizacionDetalleComponent | POST /cotizacion/get-cotizacion-by-quote |

### 5.8 Tracking (Rastro)
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/tracking` | TrackingBuscarComponent | POST /rastro/get-rastro-macro |
| `/tracking/estados` | RastroEstadosComponent | CRUD rastro_estados (directo a DB o admin endpoints) |

### 5.9 Usuarios
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/usuarios` | UsuarioListComponent | (pendiente: no hay CRUD endpoint) |

### 5.10 Configuración
| Ruta | Componente | Endpoints API |
|------|-----------|---------------|
| `/configuracion` | ConfigComponent | Tabs: General, Webhooks, API, Integraciones |
| `/configuracion/integraciones` | IntegracionesComponent | GET/POST/PATCH /admin/clientes/:id/operadores/:id/integraciones |

## 6. Sidebar Navigation

```
🏠 Dashboard
📦 Envíos
  └─ Lista
  └─ Nuevo envío
💰 Cotizaciones
  └─ Simulador
👥 Clientes
  └─ Lista
  └─ Nuevo cliente
🚚 Operadores
  └─ Lista
  └─ Nuevo operador
📊 Tracking
  └─ Buscar
  └─ Estados (mapeo)
👤 Usuarios
⚙️ Configuración
```

## 7. Core Services

### AuthService
```typescript
- login(username, password) → POST /v1/api/auth/login → { token }
- logout() → clear token
- getToken() → from localStorage
- isAuthenticated() → check token expiry
- getUser() → decode JWT payload
- getPermisos() → user.perfil from JWT
```

### ApiService
```typescript
- Base URL from environment
- JWT interceptor (Authorization: Bearer token)
- Error interceptor (401 → redirect login, 429 → rate limit toast)
- Methods: get<T>, post<T>, patch<T>, put<T>, delete<T>
```

### Feature Services (uno por módulo)
```typescript
- ClientesService → /admin/clientes/*
- OperadoresService → /admin/operadores/*
- ServiciosService → /admin/servicios/*
- ClienteOperadoresService → /admin/clientes/:id/operadores/*
- ClienteServiciosService → /admin/clientes/:id/servicios/*
- IntegracionesService → /admin/clientes/:id/operadores/:id/integraciones/*
- CompuestosService → /admin/clientes/:id/perfil-completo, clonar-config, health
- EnviosService → /prepostagem/*
- CotizacionService → /cotizacion/*
- RastroService → /rastro/*
- RotuloService → /rotulo/*
- ContratoService → /contrato/*
```

## 8. Componentes Shared

### UI Components
| Componente | Propósito |
|-----------|-----------|
| `DataTableComponent` | Tabla paginada con sort, filtros, acciones |
| `KpiCardComponent` | Card de métrica con valor, cambio, icono |
| `StatusBadgeComponent` | Badge de estado (activo/inactivo/error/mantenimiento) |
| `ConfirmModalComponent` | Modal de confirmación para acciones destructivas |
| `FormFieldComponent` | Wrapper de input con label, error, helper |
| `PageHeaderComponent` | Título + breadcrumb + acciones |
| `EmptyStateComponent` | Estado vacío con icono y CTA |
| `LoadingSpinnerComponent` | Spinner de carga |
| `ToastComponent` | Notificaciones toast |
| `SearchInputComponent` | Input de búsqueda con debounce |

### Pipes
| Pipe | Propósito |
|------|-----------|
| `StatusPipe` | Traduce estados a labels/colores |
| `DateBrPipe` | Formatea fechas a dd/mm/yyyy |
| `CurrencyBrlPipe` | Formatea moneda BRL |
| `TruncatePipe` | Trunca texto largo |

## 9. Fases de Implementación

### Fase 1 — Scaffold + Auth + Shell (3-4 días)
- [ ] Crear proyecto Angular 20 con Tailwind 4
- [ ] Configurar environments (dev: localhost:6050)
- [ ] Implementar AuthService + login page
- [ ] Implementar JWT interceptor + AuthGuard
- [ ] Implementar ShellComponent (sidebar + topbar + router-outlet)
- [ ] Sidebar navigation con routerLinkActive
- [ ] Dashboard placeholder

### Fase 2 — CRUD Clientes (3-4 días)
- [ ] ClientesService (todos los endpoints /admin/clientes)
- [ ] Lista paginada con búsqueda y filtros
- [ ] Formulario crear/editar (todos los campos del schema)
- [ ] Detalle con tabs (info, operadores, servicios, integraciones)
- [ ] Asignar/desasignar operadores
- [ ] Asignar/desasignar servicios (individual + bulk)
- [ ] Perfil completo view
- [ ] Clonar configuración

### Fase 3 — CRUD Operadores + Servicios (2-3 días)
- [ ] OperadoresService
- [ ] Lista paginada con filtros (país, estado, habilitado)
- [ ] Formulario crear/editar (incluyendo configuración API)
- [ ] Gestión de cobertura (zonas, CEPs)
- [ ] Health check inline
- [ ] CRUD Servicios por operador
- [ ] Gestión de restricciones (dimensiones, peso, cobros adicionales)

### Fase 4 — Envíos + Cotizaciones (3-4 días)
- [ ] Simulador de cotizaciones (origen, destino, peso, dimensiones → resultados)
- [ ] Lista de envíos (prepostagems) con filtros y paginación
- [ ] Detalle de envío con tracking timeline
- [ ] Crear envío (con upload de nota fiscal)
- [ ] Generar/ver rótulo (PDF)
- [ ] Logística reversa

### Fase 5 — Tracking + Rastro Estados (2 días)
- [ ] Buscador de tracking por código
- [ ] Timeline visual de eventos
- [ ] CRUD de rastro_estados (tabla de mapeo)
- [ ] Filtros por categoría, estado final, problema

### Fase 6 — Dashboard + Analytics (2 días)
- [ ] KPIs: total clientes, operadores activos, envíos último mes, cotizaciones
- [ ] Gráfico de envíos por mes (chart placeholder)
- [ ] Actividad reciente (últimos envíos, cambios de estado)
- [ ] Operadores con problemas (estadoConexion: ERROR)

### Fase 7 — Configuración + Polish (2-3 días)
- [ ] Gestión de integraciones (API keys, webhooks)
- [ ] Gestión de tablas de precios
- [ ] Responsive mobile (sidebar collapsa, tablas responsivas)
- [ ] Loading states, error handling, empty states
- [ ] Toast notifications

## 10. Conexión con API

### Base URL
```
DEV:  http://localhost:6050/{PREFIX}
PROD: https://api.agroenvios.com/{PREFIX}
```

### Prefijos Gateway
- Auth: `/{AUTH_PREFIX}/v1/api/auth/*`
- Hub: `/{AGROENVIOS_PREFIX}/v1/api/*`

### Headers requeridos
```
Authorization: Bearer {jwt_token}
Content-Type: application/json
x-api-key-hub: {api_key}  // solo para endpoints apiKeyAuth
```

### Rate Limits
- Dev: 2000 req/min
- Prod: 450 req/min

## 11. Notas Importantes

1. **No hay endpoint de registro de usuarios** — los usuarios se crean manualmente o desde otro servicio
2. **No hay refresh token** — al expirar el JWT (24h) se redirige al login
3. **Gateway auth middleware está comentado** — los endpoints admin usan `jwtAuth` directamente
4. **Las cotizaciones usan `apiKeyAuth`** — el panel admin necesitará un apiKey de cliente configurado o usar endpoints admin
5. **El cron no tiene API** — el estado del cron no es consultable desde el panel
6. **BullMQ está configurado pero inactivo** — no incluir UI para colas
7. **Typo conocido:** `puedeConfigurearServicios` — mantener así por compatibilidad con backend
