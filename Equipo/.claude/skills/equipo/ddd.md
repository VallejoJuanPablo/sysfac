# Skill — Domain-Driven Design (DDD)

## Descripción
Metodología de arquitectura de software centrada en el dominio del negocio. Define cómo organizar código, capas y relaciones entre módulos.

## Cuándo aplicar
- **Siempre al iniciar un proyecto nuevo** — Archie debe preguntar "¿Querés arrancar con DDD?"
- Proyectos con lógica de negocio compleja
- Cuando hay múltiples entidades relacionadas
- Cuando se necesita separar responsabilidades claramente

## Relación con SDD
- **DDD** = arquitectura (cómo se organiza el código)
- **SDD** = proceso (cómo se desarrolla cada feature)
- Son complementarios: DDD se aplica al inicio del proyecto, SDD se aplica a cada feature
- Dentro de un `/spec` se puede diseñar o refactorizar hacia DDD

## Las 4 capas

```
┌──────────────────────────────┐
│        PRESENTATION          │  ← Controllers, Routes, Middlewares, Resolvers
│  (Express routes / Angular)  │     Recibe requests, devuelve responses
├──────────────────────────────┤
│        APPLICATION           │  ← Use Cases, Services, DTOs, Validators
│   (Orquesta el dominio)      │     Coordina flujos, NO tiene lógica de negocio
├──────────────────────────────┤
│          DOMAIN              │  ← Entities, Value Objects, Aggregates,
│   (Corazón del negocio)      │     Domain Services, Repository Interfaces,
│                              │     Domain Events
├──────────────────────────────┤
│       INFRASTRUCTURE         │  ← Prisma/Mongoose repos, external APIs,
│   (Implementaciones)         │     email services, file storage, adapters
└──────────────────────────────┘
```

## Regla de dependencias (ESTRICTA)

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain NO importa de nadie** — es el centro, no depende de nada externo
- **Application** depende solo de Domain
- **Infrastructure** implementa interfaces definidas en Domain
- **Presentation** depende de Application (nunca accede a Domain directo)

## Building blocks

| Bloque | Qué es | Regla |
|--------|--------|-------|
| **Entity** | Objeto con identidad única (ID) | Tiene ciclo de vida, se compara por ID |
| **Value Object** | Objeto inmutable sin identidad | Se compara por valor, no tiene ID propio |
| **Aggregate Root** | Entity que controla un grupo de objetos | Un aggregate = una transacción, acceso solo via root |
| **Repository** | Interfaz para persistencia | Se define en Domain como interfaz, se implementa en Infrastructure |
| **Domain Service** | Lógica que no pertenece a una entity | Operaciones que involucran múltiples aggregates |
| **Domain Event** | Algo que pasó en el dominio | Comunicación entre bounded contexts |
| **DTO** | Objeto de transferencia de datos | Vive en Application, traduce entre Domain y Presentation |

## Bounded Contexts

Un bounded context es un límite donde un modelo de dominio tiene significado. Ejemplo:
- **Context "Ordenes"**: Order, OrderLine, Status
- **Context "Clientes"**: Client, Address, Contact
- **Context "Facturación"**: Invoice, Payment, Tax

Cada context tiene su propio modelo, su propio lenguaje, y se comunican via Domain Events o APIs.

## Estructura de carpetas estándar (Node.js/NestJS)

```
src/
├── domain/
│   ├── entities/           ← Order.ts, Client.ts
│   ├── value-objects/      ← Money.ts, Email.ts, Address.ts
│   ├── aggregates/         ← OrderAggregate.ts
│   ├── repositories/       ← IOrderRepository.ts (interfaces)
│   ├── services/           ← PricingService.ts (lógica cross-entity)
│   └── events/             ← OrderCreatedEvent.ts
├── application/
│   ├── use-cases/          ← CreateOrderUseCase.ts
│   ├── services/           ← OrderApplicationService.ts
│   ├── dtos/               ← CreateOrderDto.ts, OrderResponseDto.ts
│   └── validators/         ← CreateOrderValidator.ts
├── infrastructure/
│   ├── persistence/        ← PrismaOrderRepository.ts (implementa IOrderRepository)
│   ├── external/           ← EmailService.ts, PaymentGateway.ts
│   └── config/             ← database.ts, environment.ts
└── presentation/
    ├── controllers/        ← OrderController.ts
    ├── routes/             ← order.routes.ts
    ├── middlewares/        ← auth.middleware.ts
    └── mappers/            ← OrderMapper.ts (DTO ↔ Response)
```

## Estructura de carpetas estándar (Angular)

```
src/app/
├── domain/
│   ├── models/             ← Order.ts, Client.ts (interfaces/clases)
│   ├── repositories/       ← IOrderRepository.ts (interfaces)
│   └── services/           ← PricingDomainService.ts
├── application/
│   ├── use-cases/          ← GetOrdersUseCase.ts
│   ├── dtos/               ← OrderDto.ts
│   └── services/           ← OrderFacadeService.ts
├── infrastructure/
│   ├── api/                ← OrderApiRepository.ts (implementa IOrderRepository via HTTP)
│   ├── storage/            ← LocalStorageService.ts
│   └── mappers/            ← OrderApiMapper.ts
└── presentation/
    ├── pages/              ← Componentes de página (smart components)
    ├── components/         ← Componentes UI (dumb components)
    └── shared/             ← Pipes, directives, guards
```

## Flujo al iniciar proyecto con DDD

1. **Análisis de dominio** — Identificar entidades, relaciones, reglas de negocio
2. **Context Map** — Definir bounded contexts y sus relaciones
3. **Aggregate Design** — Definir aggregates con sus invariantes
4. **Estructura de carpetas** — Crear la estructura de 4 capas
5. **Repository interfaces** — Definir interfaces en Domain
6. **Recién ahí** empezar a implementar con SDD (features via /spec)

## Checklist de validación DDD

- [ ] Domain no importa de Infrastructure ni Presentation
- [ ] Repositories definidos como interfaces en Domain
- [ ] Infrastructure implementa las interfaces de Domain
- [ ] DTOs viven en Application, no en Domain
- [ ] Un Aggregate = una transacción (no se persisten 2 aggregates en una misma transacción)
- [ ] Value Objects son inmutables
- [ ] Entities se comparan por ID, no por valor
- [ ] Bounded contexts identificados y documentados
