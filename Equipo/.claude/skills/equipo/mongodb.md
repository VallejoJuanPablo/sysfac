# Skill — MongoDB

## Descripción
Base de datos NoSQL orientada a documentos.

## Estándares
- Esquemas definidos con Mongoose y validaciones
- Índices en campos de búsqueda frecuente
- Referencias (`ref`) para relaciones entre colecciones cuando sea necesario
- Embedded documents para datos que siempre se consultan juntos
- Nunca exponer el `_id` de Mongo directamente en APIs sin necesidad

## Patrones comunes
- Esquemas con timestamps (`createdAt`, `updatedAt`)
- Virtuals para campos computados
- Pre/post hooks para lógica automática
- Aggregation pipeline para consultas complejas
- Paginación con `skip/limit` o cursor-based
