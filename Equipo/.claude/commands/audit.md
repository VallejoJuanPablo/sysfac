# /audit — Auditoría técnica del proyecto activo

Ejecutar una auditoría completa del proyecto en el que estamos trabajando.

## Pasos

1. **Leer** el `docs/archie-context.md` del proyecto activo para entender el stack y estado
2. **Correr** la skill `audit` de Claude Code sobre los archivos principales del proyecto
3. **Evaluar** estas áreas:
   - Accesibilidad (WCAG 2.1 AA)
   - Performance (bundle size, lazy loading, imágenes)
   - Responsive (breakpoints, mobile-first)
   - Seguridad (inputs validados, auth, CORS, secrets expuestos)
   - Código (console.logs, any types, dead code, duplicación)
4. **Generar reporte** con scores P0-P3 por área
5. **Actualizar** `docs/testing-debt.md` con los hallazgos P0 y P1
6. **Registrar** uso de skill `audit` en `registro/skill-usage.json`

## Output
Tabla resumen con scores + lista de acciones ordenadas por prioridad.
