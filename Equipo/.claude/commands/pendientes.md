# /pendientes — Gestionar pendientes del equipo

Consultás y gestionás la tabla `pendientes` de la base de datos `archie_team` (MariaDB local). Los pendientes pueden venir de Telegram, n8n, u otras fuentes externas.

## Uso
```
/pendientes                    → Listar todos los pendientes agrupados por proyecto
/pendientes <proyecto>         → Listar pendientes de un proyecto específico (nombre, ID o código 6 dígitos)
/pendientes agregar            → Agregar un pendiente nuevo (interactivo)
/pendientes <id> completar     → Marcar un pendiente como completado
/pendientes <id> descartar     → Marcar un pendiente como descartado
/pendientes <id> spec          → Tomar un pendiente y lanzar /spec con su descripción
```

## Conexión a la base de datos

Usar MariaDB de XAMPP sin contraseña:
```bash
/c/xampp/mysql/bin/mysql -u root archie_team -e "<QUERY>"
```

## Comportamiento

### Sin argumento: listar todos

1. Ejecutar:
```sql
SELECT p.id, p.titulo, p.tipo, p.prioridad, p.estado, p.fuente,
       p.created_at, p.spec_id,
       pr.codigo, pr.nombre AS proyecto
FROM pendientes p
JOIN proyectos pr ON p.proyecto_id = pr.id
WHERE p.estado IN ('pendiente','en_curso')
ORDER BY
  FIELD(p.prioridad, 'alta','media','baja'),
  p.created_at ASC;
```

2. Mostrar resultado agrupado por proyecto:

```
## Pendientes del equipo

### GymPulse (7G4P1S)
| # | Titulo | Tipo | Prioridad | Fuente | Fecha |
|---|--------|------|-----------|--------|-------|
| 1 | Modal de crear alumno | spec | alta | telegram | 2026-06-19 |

### AgroEnvios (A4E6NV)
| # | Titulo | Tipo | Prioridad | Fuente | Fecha |
| 2 | CRUD usuarios | spec | media | manual | 2026-06-19 |

**Total:** N pendientes | Alta: N | Media: N | Baja: N
```

3. Si no hay pendientes, mostrar: "No hay pendientes registrados. Usá `/pendientes agregar` para crear uno, o enviá uno desde Telegram."

### Con proyecto: filtrar

1. Buscar el proyecto por nombre (parcial, case-insensitive), por ID numérico, o por código de 6 dígitos.
2. Ejecutar la misma query con `WHERE pr.nombre LIKE '%arg%'` o `pr.codigo = 'arg'` o `pr.id = arg`.
3. Mostrar solo los pendientes de ese proyecto.

### Agregar pendiente

1. Preguntar al usuario:
   - **Proyecto:** mostrar lista rápida de proyectos para elegir (nombre + código)
   - **Titulo:** descripción corta del pendiente
   - **Descripcion:** (opcional) detalle, contexto, requisitos
   - **Tipo:** spec | fix | mejora | investigacion (default: spec)
   - **Prioridad:** alta | media | baja (default: media)
2. Insertar en la base de datos:
```sql
INSERT INTO pendientes (proyecto_id, titulo, descripcion, tipo, prioridad, fuente)
VALUES (<proyecto_id>, '<titulo>', '<descripcion>', '<tipo>', '<prioridad>', 'manual');
```
3. Confirmar: "Pendiente #N creado para [proyecto] ([codigo])."

### Completar pendiente

1. Actualizar estado:
```sql
UPDATE pendientes SET estado = 'completado' WHERE id = <id>;
```
2. Confirmar: "Pendiente #N marcado como completado."

### Descartar pendiente

1. Actualizar estado:
```sql
UPDATE pendientes SET estado = 'descartado' WHERE id = <id>;
```
2. Confirmar: "Pendiente #N descartado."

### Tomar pendiente y lanzar /spec

1. Leer el pendiente:
```sql
SELECT p.*, pr.nombre, pr.ruta FROM pendientes p
JOIN proyectos pr ON p.proyecto_id = pr.id
WHERE p.id = <id>;
```
2. Marcar como en curso:
```sql
UPDATE pendientes SET estado = 'en_curso' WHERE id = <id>;
```
3. Hacer `/switch` al proyecto correspondiente.
4. Lanzar `/spec` pasando el titulo y descripcion como contexto inicial.
5. Al cerrar la spec, actualizar el pendiente:
```sql
UPDATE pendientes SET estado = 'completado', spec_id = '<SPEC-ID>' WHERE id = <id>;
```

## Integración con el saludo inicial

Cuando Archie muestra la tabla de proyectos al saludar, incluir al final un conteo de pendientes en la base de datos:
```sql
SELECT COUNT(*) as total,
       SUM(prioridad = 'alta') as alta
FROM pendientes WHERE estado = 'pendiente';
```
Si hay pendientes, mostrar: "Hay N pendientes en la base de datos (N de prioridad alta). Usá `/pendientes` para verlos."

## Reglas
- Las queries se ejecutan con el cliente MySQL de XAMPP, sin contraseña, base `archie_team`
- Siempre escapar comillas simples en los valores del usuario antes de insertar
- Si la base de datos no responde, avisar: "MariaDB no está corriendo. Iniciá XAMPP y volvé a intentar."
- Los pendientes con estado `completado` o `descartado` no se muestran en el listado por defecto
- El campo `fuente` se setea automáticamente: 'manual' cuando se agrega desde Archie, 'telegram' o 'n8n' cuando viene de afuera
- Al vincular con una spec (campo spec_id), se genera trazabilidad completa: pendiente → spec → informe

$ARGUMENTS
