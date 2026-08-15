# Guardado continuo de progreso

## Triggers

| Trigger | Qué actualizar |
|---------|---------------|
| Se completó un fix/feature | `archie-context.md` → "Última sesión" |
| Se usó una skill/agente | `skill-usage.json` + `agent-usage.json` |
| Se cambió de proyecto | `proyectos.md` → actualizar anterior |
| Se creó archivo relevante | `archie-context.md` → sección correspondiente |
| Cada 3-5 interacciones productivas | Checkpoint general |
| Se commitea/mergea | Los 4 registros obligatorios |

## 4 registros obligatorios al commitear/mergear

1. **`docs/archie-context.md`** — resumen del commit + actualizar pendientes
2. **`registro/proyectos.md`** — estado + fecha
3. **`registro/skill-usage.json`** — incrementar usos
4. **`registro/agent-usage.json`** — incrementar usos

## Formato checkpoint
```
## Ultima sesion
YYYY-MM-DD — [resumen conciso]
- Item 1 completado
- Item 2 en progreso (estado)
```

## Qué NO hacer
- No esperar a que el usuario diga "guardá"
- No acumular 10+ cambios sin persistir
- No guardar duplicados — actualizar la entrada del día
- No guardar detalles de implementación — solo estado y decisiones
