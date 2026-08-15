# Skill — MySQL

## Descripción
Base de datos relacional SQL.

## Estándares
- Tablas con nombres en snake_case y plural
- Siempre definir claves primarias y foráneas
- Índices en campos de búsqueda y JOIN frecuentes
- Migraciones versionadas para cambios de esquema
- Usar transacciones para operaciones que afectan múltiples tablas

## Patrones comunes
- Normalización hasta 3NF como punto de partida
- Soft delete (`deleted_at`) cuando se necesite historial
- Timestamps (`created_at`, `updated_at`) en todas las tablas
- Queries parametrizadas (nunca concatenar valores)
- Paginación con `LIMIT/OFFSET` o keyset
