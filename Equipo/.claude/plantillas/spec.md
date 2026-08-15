# Plantilla — Spec (Especificación)

## Formato estándar

```markdown
# Spec: [Nombre de la feature/tarea]

- **Fecha:** [YYYY-MM-DD]
- **Solicitado por:** [usuario]
- **Estado:** [borrador | en revisión | aprobada]

## Contexto
[Cuál es el problema o necesidad que origina este trabajo. Qué existe hoy y por qué no es suficiente.]

## Objetivo
[Qué se va a construir y qué resultado se espera. 2-3 oraciones máximo.]

## User stories

### US-1: [Título]
**Como** [tipo de usuario]
**Quiero** [acción]
**Para** [beneficio]

**Criterios de aceptación:**
- [ ] **Given** [contexto] **When** [acción] **Then** [resultado esperado]
- [ ] **Given** [contexto] **When** [acción] **Then** [resultado esperado]

### US-2: [Título]
...

## Requisitos no funcionales
- [Performance: tiempos de respuesta, carga esperada]
- [Seguridad: autenticación, autorización, datos sensibles]
- [Compatibilidad: navegadores, dispositivos, versiones]

## Fuera de alcance
- [Qué explícitamente NO se va a hacer en esta iteración]

## Edge cases
| # | Escenario | Comportamiento esperado |
|---|-----------|------------------------|
| 1 | [Caso extremo] | [Qué debe pasar] |
| 2 | [Caso extremo] | [Qué debe pasar] |

## Dependencias
- [Servicios, APIs, librerías o features de las que depende este trabajo]

## Notas
[Contexto adicional, decisiones previas, restricciones conocidas]
```
