# Testing Debt — SysFac

## SPEC-001: Módulo Presupuestos

### Tests pendientes (por criterio de aceptación)

#### Backend (Jest + Supertest)
| # | Criterio | Test |
|---|----------|------|
| 1 | Login pituco/pituco → token | POST /api/auth/login con credenciales correctas |
| 2 | Login incorrecto → 401 | POST /api/auth/login con credenciales incorrectas |
| 3 | Ruta protegida sin token → 401 | GET /api/presupuestos sin header |
| 4 | Crear presupuesto → 201 + items | POST /api/presupuestos con items válidos |
| 5 | Crear presupuesto sin cliente → 400 | POST /api/presupuestos sin cliente |
| 6 | Crear presupuesto sin items → 400 | POST /api/presupuestos sin items |
| 7 | Cantidad <= 0 → 400 | POST /api/presupuestos con cantidad inválida |
| 8 | Servicio nuevo se crea auto | POST presupuesto, verificar tabla servicios |
| 9 | Servicio duplicado se reutiliza | POST 2 presupuestos, verificar 1 solo servicio |
| 10 | Total calculado correctamente | POST presupuesto, verificar total = sum(subtotales) |
| 11 | Dashboard stats correctos | GET /api/dashboard/stats |
| 12 | Búsqueda servicios filtra | GET /api/servicios?q=limpieza |
| 13 | PDF se genera | GET /api/presupuestos/:id/pdf → content-type pdf |

#### Frontend (Cypress o Playwright)
| # | Criterio | Test |
|---|----------|------|
| 14 | Login flow completo | Navegar, ingresar pituco/pituco, ver dashboard |
| 15 | Login error | Credenciales incorrectas, ver mensaje error |
| 16 | Logout → redirect login | Click logout, verificar URL /login |
| 17 | Guard funciona | Acceder / sin token, redirect a /login |
| 18 | Dashboard muestra KPIs | 4 cards con valores numéricos |
| 19 | Listado presupuestos | Tabla con datos después de crear |
| 20 | Crear presupuesto | Llenar form, agregar servicio, guardar, ver en lista |
| 21 | Descargar PDF | Click botón PDF, verificar descarga |
| 22 | Servicio autocomplete | Escribir en dropdown, ver sugerencias |

**Total deuda: 22 tests**
**Prioridad: MEDIA** (sistema interno, primer módulo)
