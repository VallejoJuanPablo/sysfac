# /listp — Listar proyectos registrados

## Uso
```
/listp
```

## Comportamiento
1. Leer `registro/proyectos.md`
2. Mostrar la tabla completa de proyectos con: ID, nombre, stack, estado y última sesión
3. Incluir un resumen al final: total de proyectos y cuántos están activos/en desarrollo

## Formato de salida

```
## Proyectos registrados

| ID | Proyecto | Stack | Estado | Última sesión |
|----|----------|-------|--------|---------------|
| ... | ... | ... | ... | ... |

**Total:** N proyectos | En desarrollo: N | Registrados: N
```

## Reglas
- Solo lectura: este comando no modifica nada
- Si no hay proyectos registrados, indicar: "No hay proyectos registrados. Usá `/project` para crear uno."
- La ruta no se muestra en la tabla (es dato interno), solo el nombre del proyecto
