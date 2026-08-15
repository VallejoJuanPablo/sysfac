# /review — Code review con qualified-code + tester

Ejecutar una revisión de código completa usando el pattern code-review del swarm.

## Pasos

1. **Identificar** qué revisar:
   - Si hay una rama activa con commits: revisar esos cambios
   - Si el usuario especifica archivos: revisar esos archivos
   - Si hay una spec activa: revisar contra la spec

2. **Lanzar en paralelo:**
   - Agente `verificacion/qualified-code` (Sonnet): revisar código contra estándares y spec
   - Agente `verificacion/tester` (Sonnet): generar test cases para los cambios

3. **Consolidar** resultados:
   - Issues encontrados (P0-P3)
   - Test cases generados
   - Sugerencias de mejora

4. **Aplicar skills complementarias si aplica:**
   - `polish` — si hay issues visuales
   - `clarify` — si hay problemas de UX copy
   - `harden` — si faltan edge cases

5. **Actualizar** `docs/testing-debt.md` si se generaron tests pendientes

## Output
Reporte de review con: issues encontrados, test cases, y estado de calidad general.
