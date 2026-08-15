# SysFac — Contexto Archie

## Estado actual
- **Fase:** SPEC-001 completada (Fase 5 CODE terminada)
- **Módulo activo:** Presupuestos
- **Rama:** `feature/modulo-presupuestos` (sin mergear a master)
- **Última sesión:** 2026-08-14

## Decisiones tomadas
- Stack: Node.js + Express + TypeScript + Angular 19 + Tailwind CSS 4 + MySQL (Prisma 6)
- Arranque por módulo de Presupuestos
- Sin DDD (usuario prefirió ir directo con SDD)
- PDF generado con Puppeteer usando `modelo vacio.jpg` como fondo
- tsx en lugar de ts-node (incompatibilidad con TypeScript 7)
- Prisma 6 (Prisma 7 cambió API de datasource)
- Express 5 instalado automáticamente

## Lo que se hizo
- [x] Backend completo: auth JWT, CRUD presupuestos, servicios, dashboard stats, PDF
- [x] Frontend completo: login, shell layout, dashboard KPIs, listado y crear presupuesto
- [x] DB: 5 tablas (usuarios, servicios, presupuestos, presupuesto_items, configuracion)
- [x] Seed: usuario pituco/pituco + config empresa + 3 servicios ejemplo
- [x] Todos los endpoints probados y funcionando
- [x] PDF generado correctamente con el formato del modelo

## Pendientes
- [ ] SPEC-001 Fase 6: Qualified Code (verificación adversarial)
- [ ] SPEC-001 Fase 7: Tester (tests)
- [ ] SPEC-001 Cierre: Informe final
- [ ] Mergear rama a master (esperar instrucción)
- [ ] Probar visualmente en browser (frontend completo)

## Notas
- El backend corre en puerto 3000
- El frontend usa proxy para /api → localhost:3000
- Login: pituco / pituco
