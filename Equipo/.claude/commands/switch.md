# /switch — Cambiar de proyecto activo

## Uso
```
/switch                → Lista todos los proyectos registrados
/switch <nombre>       → Carga el contexto del proyecto y queda listo para trabajar
```

## Comportamiento

### Sin argumento: listar proyectos
1. Leer `registro/proyectos.md`
2. Mostrar tabla con todos los proyectos, su estado y última sesión
3. Indicar cuál está activo (si hay uno)

### Con argumento: cambiar al proyecto
1. Buscar el proyecto en `registro/proyectos.md`
2. Si no existe → preguntar si es un proyecto nuevo (ejecutar `/project` para registrarlo)
3. Si existe:
   a. Leer `<ruta_proyecto>/docs/archie-context.md`
   b. Confirmar al usuario: "Cambié a [proyecto]. Stack: [...]. Estado: [...]."
   c. Actualizar `registro/proyectos.md` con la fecha de última sesión
4. A partir de ahora, todos los archivos generados van a la ruta del proyecto

## Al terminar una sesión de trabajo
Antes de cerrar o cambiar de proyecto, Archie DEBE:
1. Actualizar `<ruta_proyecto>/docs/archie-context.md` con:
   - Estado actual (qué se completó en esta sesión)
   - Próximos pasos actualizados
   - Cualquier decisión tomada
2. Actualizar la fecha de última sesión en `registro/proyectos.md`

## Formato de archie-context.md
El archivo de contexto de cada proyecto sigue esta estructura:

```markdown
# Archie Context — [Nombre del Proyecto]

## Qué es
[1-2 líneas describiendo el proyecto]

## Stack
[Tecnologías principales]

## Cómo levantar
[Comandos para levantar el entorno de desarrollo]

## Estado actual
- [x] Lo que está hecho
- [ ] Lo que falta

## Archivos clave
- [ruta] — [qué es]

## Decisiones importantes
- [Decisión] — [por qué]

## Credenciales dev
[Usuarios y contraseñas de prueba]

## Última sesión
[Fecha] — [Resumen de lo que se hizo]
```

## Reglas
- El archie-context.md es CONCISO (< 100 líneas) — contexto operativo, no documentación
- Siempre actualizarlo al terminar la sesión
- No duplicar info que ya está en docs/ del proyecto — referenciarla
- Si un proyecto no tiene archie-context.md, generarlo al primer /switch
