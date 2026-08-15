# /spec — Flujo Spec-Driven Development

Activás el flujo **Spec-Driven Development (SDD)** del equipo Archie. Este comando lanza un proceso estructurado de 7 fases para desarrollar features con calidad garantizada.

## Instrucciones

Seguí estas fases en orden estricto. **No avances a la siguiente fase sin aprobación del usuario.**

Leé la skill completa en `.claude/skills/equipo/sdd.md` y los perfiles de los agentes involucrados antes de arrancar.

### Fase 1 — SPEC (Especificación)

1. Preguntale al usuario qué quiere construir. Hacé preguntas clarificadoras si la descripción es ambigua.
2. Generá la especificación usando la plantilla `.claude/plantillas/spec.md`.
3. Incluí: contexto, objetivo, user stories con criterios de aceptación (Given/When/Then), requisitos no funcionales, fuera de alcance, y edge cases.
4. Presentá la spec al usuario y pedí aprobación explícita antes de continuar.

**Mostrar al usuario:** La spec completa formateada.
**Esperar:** Aprobación del usuario.

### Fase 2 — PLAN (Plan técnico)

1. Basándote en la spec aprobada, diseñá la solución técnica.
2. Usá la plantilla `.claude/plantillas/plan-sdd.md`.
3. Incluí: componentes, modelo de datos, contratos de API, decisiones técnicas con justificación, y riesgos.
4. Delegá al agente de área correspondiente (leé su perfil en `.claude/agents/`) para las decisiones técnicas específicas.
5. Presentá el plan al usuario y pedí aprobación.

**Mostrar al usuario:** El plan técnico completo.
**Esperar:** Aprobación del usuario.

### Fase 3 — TASK (Descomposición)

1. Descomponé el plan en tareas atómicas.
2. Usá la plantilla `.claude/plantillas/tasks-sdd.md`.
3. Cada tarea debe tener: objetivo claro, archivos afectados, pasos concretos, verificación, y dependencias.
4. Ordená las tareas por dependencia.
5. Presentá las tareas al usuario y pedí aprobación.

**Mostrar al usuario:** Lista completa de tareas con tabla resumen.
**Esperar:** Aprobación del usuario.

### Fase 4 — REVIEW (implícita)

Las fases 1, 2 y 3 ya incluyen review del usuario antes de avanzar. Si el usuario pide cambios en cualquier fase, ajustá y volvé a presentar.

### Fase 5 — CODE (Implementación)

1. Ejecutá las tareas en orden de dependencia, una a la vez.
2. Delegá cada tarea al agente correcto según su perfil en `.claude/agents/`.
3. Seguí los estándares definidos en las skills del agente (`.claude/skills/equipo/`).
4. Después de cada tarea, marcala como completada y mostrá un breve resumen de lo que se hizo.
5. Si encontrás un problema que requiere cambio en la spec o el plan, informá al usuario y proponé el ajuste.

**Mostrar al usuario:** Progreso por tarea completada.

### Fase 6 — QUALIFIED CODE (Verificación adversarial)

1. Leé el perfil del agente verificador en `.claude/agents/verificacion/qualified-code.md`.
2. Releé la spec original completa.
3. Leé el código implementado (archivos reales, no resúmenes).
4. Verificá fidelidad: cada criterio de aceptación tiene código que lo cumple.
5. Verificá calidad: el código sigue las buenas prácticas del equipo.
6. Verificá seguridad: no hay vulnerabilidades obvias.
7. Si hay gaps, clasifícalos y proponé correcciones al usuario.
8. Iterá hasta que el veredicto sea APROBADO.

**Mostrar al usuario:** Reporte de verificación con veredicto.

### Fase 7 — TESTER (Validación)

1. Leé el perfil del agente tester en `.claude/agents/verificacion/tester.md`.
2. Diseñá tests que cubran cada criterio de aceptación de la spec.
3. Implementá los tests en el framework del proyecto (o proponé uno si no existe).
4. Ejecutá los tests.
5. Reportá resultados con cobertura de criterios.

**Mostrar al usuario:** Reporte de testing con resultados.

### Cierre — Informe final

1. Al completar todas las fases, generá el informe final usando `.claude/plantillas/informe-spec.md`.
2. Guardá el informe en `docs/specs/` del proyecto con formato `SPEC-YYYY-NNN-nombre.md`.
3. Asigná el Spec ID secuencial: leé `docs/specs/INDEX.md` para saber el último número usado.
4. **Antes de guardar**, verificá el checklist de completitud:

#### Checklist de cierre obligatorio
- [ ] Sección 1 — Resumen ejecutivo (3-5 oraciones, se entiende sin leer el resto)
- [ ] Sección 2 — Qué se hizo (entregables + criterios cumplidos con checks)
- [ ] Sección 3 — Cómo se planteó (estrategia + decisiones clave con justificación)
- [ ] Sección 4 — Cómo se ejecutó (tabla de fases + tareas + iteraciones de QC)
- [ ] Sección 5 — Archivos creados o modificados (tabla completa)
- [ ] Sección 6 — Métricas (tasks, tests, iteraciones QC, criterios)
- [ ] Sección 7 — Lecciones aprendidas (mínimo 1 de cada: qué salió bien, qué salió mal, qué se descubrió)
- [ ] Sección 8 — Próximos pasos (al menos 1 acción pendiente)

Si falta alguna sección, completala antes de cerrar. No se cierra una spec con informe incompleto.

5. Guardá el informe.
6. Actualizá `docs/specs/INDEX.md` agregando una fila con los datos de esta spec.
7. Presentá el informe al usuario.

**Mostrar al usuario:** Informe final completo + confirmación de que el índice se actualizó.

## Argumento

El usuario puede pasar una descripción inicial como argumento:
- `/spec Crear API de autenticación con JWT` — arranca la Fase 1 con ese contexto
- `/spec` sin argumentos — Archie pregunta qué se quiere construir

$ARGUMENTS
