# SysFac — Contexto Archie

## Estado actual
- **Fase:** Simulador de créditos prendarios en desarrollo
- **Módulo activo:** Simulador Créditos
- **Rama activa:** `feature/simulador-creditos` (1 commit)
- **Repo:** https://github.com/VallejoJuanPablo/sysfac.git
- **Última sesión:** 2026-09-16

## Decisiones tomadas
- Stack: Node.js + Express 5 + TypeScript 7 + Angular 19 + Tailwind CSS 4 + MySQL 8 (Prisma 6)
- Arranque por módulo de Presupuestos
- Sin DDD (usuario prefirió ir directo con SDD)
- PDF generado con Puppeteer usando `modelo vacio.jpg` como fondo
- tsx en lugar de ts-node (incompatibilidad con TypeScript 7)
- Prisma 6 (Prisma 7 cambió API de datasource)
- Express 5 instalado automáticamente
- SweetAlert2 para feedback al generar PDF
- Nombre PDF: presupuesto_{fecha}_{cliente}.pdf
- Simulador: cálculos en frontend, PDF landscape con tabla completa en backend
- Tabla cotizaciones guarda params + resultados, tabla amortización se recalcula

## Lo que se hizo
- [x] Backend completo: auth JWT, CRUD presupuestos, servicios, dashboard stats, PDF
- [x] Frontend completo: login, shell layout, dashboard KPIs, listado y crear presupuesto
- [x] DB: 5 tablas (usuarios, servicios, presupuestos, presupuesto_items, configuracion)
- [x] Seed: usuario pituco/pituco + config empresa + 3 servicios ejemplo
- [x] Todos los endpoints probados y funcionando
- [x] SPEC-001 Fase 6: QC aprobado (5 gaps, 2 corregidos)
- [x] SPEC-001 Fase 7: 22 tests registrados como deuda
- [x] SPEC-001 Cierre: informe final en docs/specs/
- [x] Mergeado a master y pusheado a GitHub
- [x] Guía deploy VPS (formato idéntico a BarberiaElJefe)
- [x] Dockerfiles + nginx.conf + docker-compose.yml en el repo
- [x] Responsive: sidebar md:, tablas→cards en mobile, padding/tipografía adaptiva
- [x] PWA: service worker, manifest, iconos placeholder, meta tags, lang="es"
- [x] Simulador créditos: modelo Cotizacion, rutas CRUD + PDF, componente Angular completo
- [x] Sistema francés y alemán con gastos opcionales (seguro auto/vida, IVA, admin)
- [x] Tabla de amortización mes a mes + descarga PDF landscape

## Deploy VPS (en curso)
- **Dominio:** sysfac.bowin.com.ar (Server 2)
- **Estado:** Resolviendo errores de build Docker
- **Fixes aplicados:**
  - Puppeteer: SKIP_DOWNLOAD + --ignore-scripts en Dockerfile
  - TypeScript: 3 errores de tipos (Express 5 params, Puppeteer waitUntil)
  - MySQL: garantia VARCHAR(500) en vez de TEXT (strict mode no permite default en TEXT)
- **Pendiente:** Verificar que el build completo pasa en el VPS

## Pendientes
- [ ] **Probar simulador de créditos en browser**
- [ ] Probar responsive + PWA en browser (rama feature/responsive-pwa, sin merge)
- [ ] Reemplazar iconos PWA placeholder por logo real
- [ ] Merge feature/responsive-pwa → master (después de probar)
- [ ] Merge feature/simulador-creditos → master (después de probar)
- [ ] Completar deploy en VPS (build + migrate + seed)
- [ ] Verificar PDF en producción (Chromium del sistema)
- [ ] Escribir tests (22 en deuda + nuevos del simulador)

## Notas
- El backend corre en puerto 3000
- El frontend usa proxy para /api → localhost:3000
- Login: pituco / pituco
- Docker: clone en repo/, docker-compose afuera (patrón BarberiaElJefe)
- Simulador: fórmulas francés/alemán, TNA→TEM→TEA, gastos opcionales, PDF A4 landscape
