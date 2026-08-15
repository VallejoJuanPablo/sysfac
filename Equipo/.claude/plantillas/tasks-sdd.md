# Plantilla — Tasks SDD (Descomposición de tareas)

## Formato estándar

```markdown
# Tasks: [Nombre de la feature/tarea]

- **Fecha:** [YYYY-MM-DD]
- **Spec de referencia:** [ruta a spec.md]
- **Plan de referencia:** [ruta a plan.md]
- **Total de tareas:** [N]

## Resumen
[Breve descripción de cómo se descompuso el trabajo y en qué orden se ejecuta.]

## Dependencias entre tareas
[Diagrama o lista que muestre qué tareas dependen de cuáles]

---

### Task 1: [Nombre descriptivo]
- **Agente:** [area/agente]
- **Tamaño:** [pequeña | mediana | grande]
- **Depende de:** [ninguna | Task N]
- **Estado:** [pendiente | en progreso | completada | bloqueada]

**Objetivo:** [Qué se logra al completar esta tarea — una oración]

**Archivos:**
- [crear | modificar] `ruta/al/archivo`

**Pasos:**
1. [Paso concreto]
2. [Paso concreto]

**Verificación:**
- [ ] [Cómo saber que está bien hecha]

---

### Task 2: [Nombre descriptivo]
...

---

## Resumen de ejecución
| Task | Agente | Tamaño | Dependencia | Estado |
|------|--------|--------|-------------|--------|
| 1 | [agente] | [tamaño] | — | pendiente |
| 2 | [agente] | [tamaño] | Task 1 | pendiente |
```
