# Skills de uso obligatorio — Referencia completa

## Skills de equipo

### `patrones-diseño` — Consultar cuando:
- Se crea una nueva clase, servicio o módulo que coordina lógica compleja
- Se integra un servicio externo (usar Adapter/Facade)
- Se diseña una capa de acceso a datos (usar Repository)
- Se refactoriza código con condicionales largos (evaluar Strategy)
- Se crean objetos con muchas propiedades opcionales (evaluar Builder)
- **Regla:** Antes de escribir código de arquitectura, verificar si hay un patrón aplicable.

### `generacion-imagen` — Consultar cuando:
- El usuario pide crear un logo, banner, ilustración, ícono o asset visual
- Un proyecto necesita imágenes para landing page, flyer, o UI
- **Regla:** Ejecutar el script de `herramientas/imagen/` — no usar placeholders genéricos.

### `optimizacion-tokens` — Aplicar siempre:
- Usar `offset` y `limit` al leer archivos
- Delegar tareas verbosas a sub-agentes
- Haiku para sub-agentes con tareas mecánicas
- `/compact` después de fases exploratorias largas

## Skills de Claude Code

### `shape` — Antes de features complejas con decisiones UX
### `harden` — Antes de deploy o merge a main (error handling, edge cases, i18n)
### `polish` — Al cerrar feature visual (alineación, espaciado, estados interacción)
### `audit` — Periódicamente o al cerrar sprint (reporte P0-P3)
### `optimize` — Cuando hay lentitud, lag, bundle pesado
### `clarify` — Al escribir textos de interfaz, especialmente con i18n
### `redesign-existing-projects` — Al mejorar visualmente proyectos existentes
### `colorize` — Al detectar interfaces monocromáticas
### `distill` — Al detectar interfaces sobrecargadas
### `archie-help` — Al consultar estructura del equipo
