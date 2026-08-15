# Plantilla — Plan técnico SDD

## Formato estándar

```markdown
# Plan: [Nombre de la feature/tarea]

- **Fecha:** [YYYY-MM-DD]
- **Spec de referencia:** [ruta a spec.md]
- **Estado:** [borrador | en revisión | aprobado]

## Resumen de la solución
[2-3 oraciones que expliquen la estrategia técnica elegida y por qué.]

## Arquitectura

### Componentes involucrados
| Componente | Tipo | Acción | Descripción |
|------------|------|--------|-------------|
| [nombre] | [servicio/componente/modelo/ruta] | [crear/modificar/eliminar] | [qué hace] |

### Diagrama (si aplica)
[Diagrama Mermaid de la arquitectura o flujo de datos]

## Modelo de datos

### Entidades nuevas o modificadas
```
[Esquema del modelo — Mongoose schema, SQL DDL, interfaz TypeScript, etc.]
```

### Migraciones necesarias
- [Migración 1: descripción]

## Contratos de API (si aplica)

### [METHOD] /ruta/del/endpoint
- **Request:** `{ campo: tipo }`
- **Response 200:** `{ campo: tipo }`
- **Response 4xx:** `{ error: string }`

## Decisiones técnicas
| Decisión | Alternativas consideradas | Justificación |
|----------|--------------------------|---------------|
| [Qué se decidió] | [Qué otras opciones había] | [Por qué se eligió esta] |

## Librerías o dependencias nuevas
| Librería | Propósito | Justificación |
|----------|-----------|---------------|
| [nombre] | [para qué] | [por qué esta y no otra] |

## Riesgos identificados
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| [Riesgo] | [baja/media/alta] | [bajo/medio/alto] | [Cómo se mitiga] |

## Notas
[Contexto adicional, trade-offs aceptados, limitaciones conocidas]
```
