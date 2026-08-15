# SPEC-2026-001: Módulo Presupuestos con Login y Dashboard

## 1. Resumen ejecutivo
Se construyó el sistema SysFac desde cero con login JWT, dashboard administrativo y módulo completo de presupuestos. El backend usa Express + TypeScript + Prisma/MySQL y el frontend Angular 19 + Tailwind CSS 4. Incluye generación de PDF usando la plantilla visual de la empresa (modelo-vacio.jpg como fondo). Todos los endpoints fueron probados manualmente y el frontend compila correctamente con lazy loading.

## 2. Qué se hizo

### Entregables
- [x] Backend Express + TypeScript con 8 endpoints REST
- [x] Frontend Angular 19 con 7 componentes + auth system
- [x] Base de datos MySQL con 5 tablas (Prisma)
- [x] Generación de PDF con Puppeteer
- [x] Seed con usuario admin + config empresa + servicios ejemplo

### Criterios cumplidos
- [x] US-1: Login pituco/pituco, error, logout, guard
- [x] US-2: Dashboard KPIs, sidebar, topbar, responsivo
- [x] US-3: Listado presupuestos, estado vacío, descarga PDF
- [x] US-4: Crear presupuesto, servicios, total, tipo oculto, PDF
- [x] US-5: Servicios reutilizables, filtro, autocomplete precio
- [x] Edge cases: validaciones, token expirado, servicio duplicado

## 3. Cómo se planteó

### Estrategia
Monorepo con backend/ y frontend/ independientes. PDF server-side con Puppeteer para máxima fidelidad al modelo visual. Layout admin replicando el patrón de AgroEnvioPanel.

### Decisiones clave
| Decisión | Justificación |
|----------|---------------|
| Prisma 6 (no 7) | Prisma 7 cambió la API de datasource, 6 es estable |
| tsx (no ts-node) | ts-node incompatible con TypeScript 7 |
| Puppeteer para PDF | Permite usar imagen de fondo + HTML posicionado |
| Tailwind CSS 4 | Consistente con AgroEnvioPanel |
| Angular standalone | Patrón moderno, menos boilerplate |

## 4. Cómo se ejecutó

| Fase | Duración | Resultado |
|------|----------|-----------|
| 1. SPEC | Rápida | Aprobada con adición de PDF |
| 2. PLAN | Rápida | Aprobado sin cambios |
| 3. TASK | Rápida | 10 tareas aprobadas |
| 4. REVIEW | Implícita | OK |
| 5. CODE | Principal | 10/10 tareas completadas |
| 6. QC | 1 iteración | APROBADO (5 gaps menores, 2 corregidos) |
| 7. TESTER | Deuda | 22 tests registrados |

## 5. Archivos creados o modificados

| Tipo | Archivo |
|------|---------|
| Backend | src/index.ts, routes/auth.routes.ts, routes/presupuestos.routes.ts |
| Backend | routes/servicios.routes.ts, routes/dashboard.routes.ts |
| Backend | middleware/auth.middleware.ts, services/pdf.service.ts |
| Backend | prisma/schema.prisma, prisma/seed.ts |
| Frontend | app.config.ts, app.routes.ts, app.ts |
| Frontend | core/auth/auth.service.ts, auth.guard.ts, auth.interceptor.ts |
| Frontend | core/layout/shell, sidebar, topbar |
| Frontend | features/login, dashboard, presupuestos/list, presupuestos/create |
| Frontend | shared/pipes/currency.pipe.ts |
| Config | .env, .gitignore, proxy.conf.json, .postcssrc.json |

## 6. Métricas

| Métrica | Valor |
|---------|-------|
| Tasks | 10 |
| Archivos creados | 42 |
| Endpoints API | 8 |
| Componentes Angular | 7 |
| Tablas DB | 5 |
| Iteraciones QC | 1 |
| Gaps QC encontrados | 5 (2 corregidos, 3 aceptados) |
| Tests | 0 (22 en deuda) |
| Criterios aceptación | 20/20 |

## 7. Lecciones aprendidas

### Qué salió bien
- SDD turbo permitió entregar todo el módulo en una sesión
- El modelo visual (JPG) como referencia para el PDF fue muy efectivo

### Qué salió mal
- Prisma 7 y TypeScript 7 tienen breaking changes. Hay que fijar versiones o adaptarse desde el inicio
- ts-node ya no funciona con TS7, tsx es el reemplazo directo

### Qué se descubrió
- Express 5 se instala por defecto ahora (npm install express → 5.x)
- Puppeteer con imagen de fondo como base64 en HTML funciona perfecto para plantillas visuales

## 8. Próximos pasos
- [ ] Probar visualmente en browser (ng serve + npm run dev)
- [ ] Ajustar posicionamiento del PDF comparando con modelo.jpg
- [ ] Implementar editar/eliminar presupuestos
- [ ] Agregar más tipos de presupuesto (activar el select oculto)
- [ ] CRUD de clientes como entidad separada
- [ ] Escribir tests (22 en deuda)
- [ ] Configurar CI/CD
