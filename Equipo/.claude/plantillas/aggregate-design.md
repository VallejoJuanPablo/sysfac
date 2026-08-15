# Aggregate Design — {{ nombre_contexto }}

## Fecha: {{ fecha }}
## Bounded Context: {{ context }}

---

## 1. Aggregates

### Aggregate: {{ nombre }}
- **Root Entity:** {{ entity_raiz }}
- **Entities internas:** {{ entities }}
- **Value Objects:** {{ value_objects }}

#### Invariantes (reglas de negocio)
1. {{ regla }}

#### Ciclo de vida
```
CREATED → {{ estados }} → COMPLETED/CANCELLED
```

## 2. Repository Interface

```typescript
interface I{{ nombre }}Repository {
  findById(id: string): Promise<{{ nombre }} | null>;
  save(entity: {{ nombre }}): Promise<void>;
  delete(id: string): Promise<void>;
}
```

## 3. Domain Events

| Evento | Cuándo se emite | Datos |
|--------|----------------|-------|
| {{ NombreEvent }} | {{ trigger }} | {{ payload }} |

## 4. Diagrama

```
┌─────────────────────────────┐
│     {{ AggregateRoot }}     │
│  ┌────────┐  ┌────────────┐ │
│  │ Entity │  │ ValueObject│ │
│  └────────┘  └────────────┘ │
└─────────────────────────────┘
```
