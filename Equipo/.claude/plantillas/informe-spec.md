# Plantilla — Informe de Spec completada

## Descripción
Este informe se genera al finalizar un ciclo completo de `/spec`. Documenta todo el proceso: qué se hizo, cómo se planteó, cómo se ejecutó, y el resultado final. Se guarda en `docs/specs/` del proyecto.

## Formato estándar

```markdown
# Informe Spec: [Nombre de la feature/tarea]

- **Fecha inicio:** [YYYY-MM-DD]
- **Fecha fin:** [YYYY-MM-DD]
- **Estado final:** [completada | completada con observaciones | abortada]
- **Spec ID:** [SPEC-YYYY-NNN]

---

## 1. Resumen ejecutivo
[3-5 oraciones que expliquen: qué se pidió, qué se entregó, y el resultado. Un lector que lea solo esta sección debe entender qué pasó.]

## 2. Qué se hizo
### Objetivo original
[Cuál era el problema o necesidad]

### Entregables producidos
| Entregable | Tipo | Ubicación |
|------------|------|-----------|
| [Nombre] | [archivo/endpoint/componente/config] | [ruta] |

### Criterios de aceptación cumplidos
- [x] [Criterio 1 — cumplido]
- [x] [Criterio 2 — cumplido]
- [ ] [Criterio 3 — no cumplido: motivo]

## 3. Cómo se planteó
### Estrategia elegida
[Descripción de la solución técnica elegida y por qué se eligió esta sobre las alternativas]

### Decisiones clave
| Decisión | Por qué | Alternativa descartada |
|----------|---------|----------------------|
| [Qué se decidió] | [Justificación] | [Qué se descartó y por qué] |

### Arquitectura implementada
[Descripción de la arquitectura. Diagrama Mermaid si aplica.]

## 4. Cómo se ejecutó
### Fases completadas
| Fase | Estado | Observaciones |
|------|--------|---------------|
| SPEC | completada | [Nota breve] |
| PLAN | completada | [Nota breve] |
| TASK | completada | [N tareas descompuestas] |
| CODE | completada | [N tareas ejecutadas] |
| QUALIFIED CODE | completada | [Aprobado/Rechazado + iteraciones] |
| TESTER | completada | [N tests, X pasaron, Y fallaron] |

### Tareas ejecutadas
| # | Tarea | Agente | Resultado |
|---|-------|--------|-----------|
| 1 | [Nombre] | [agente] | completada |
| 2 | [Nombre] | [agente] | completada |

### Iteraciones de verificación
[Cuántas rondas de qualified-code fueron necesarias y qué se corrigió en cada una]

## 5. Archivos creados o modificados
| Archivo | Acción | Descripción |
|---------|--------|-------------|
| [ruta/archivo] | [creado/modificado/eliminado] | [qué se hizo] |

## 6. Métricas
- **Tareas totales:** [N]
- **Tareas completadas:** [N]
- **Tests escritos:** [N]
- **Tests pasando:** [N]
- **Iteraciones de QC:** [N]
- **Criterios de aceptación:** [cumplidos/total]

## 7. Lecciones aprendidas
- [Qué salió bien y se debería repetir]
- [Qué salió mal y cómo evitarlo]
- [Qué se descubrió durante el proceso que no se sabía antes]

## 8. Próximos pasos
- [ ] [Acción pendiente derivada de este trabajo]
- [ ] [Mejora futura identificada durante el proceso]
```
