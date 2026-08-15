# Context Map — {{ nombre_proyecto }}

## Fecha: {{ fecha }}
## Autor: Archie (agente analisis/proyecto)

---

## 1. Bounded Contexts

| # | Context | Responsabilidad | Entidades principales |
|---|---------|----------------|----------------------|
| 1 | {{ nombre }} | {{ qué hace }} | {{ entidades }} |

## 2. Relaciones entre contexts

| Context A | Relación | Context B | Notas |
|-----------|----------|-----------|-------|
| {{ A }} | {{ upstream/downstream/shared kernel/etc }} | {{ B }} | {{ detalle }} |

## 3. Ubiquitous Language (Glosario)

| Término | Significado en el dominio | Context |
|---------|--------------------------|---------|
| {{ término }} | {{ significado }} | {{ context }} |

## 4. Diagrama (ASCII)

```
┌─────────────┐     ┌─────────────┐
│  Context A  │────▶│  Context B  │
└─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Context C  │
└─────────────┘
```

## 5. Decisiones

| Decisión | Justificación |
|----------|--------------|
| {{ qué se decidió }} | {{ por qué }} |
