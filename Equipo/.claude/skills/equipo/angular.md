# Skill — Angular

## Descripción
Desarrollo frontend con Angular y TypeScript.

## Estándares
- Tipado estricto: evitar `any`, definir interfaces para todo
- Componentes standalone cuando sea posible
- Formularios reactivos sobre template-driven
- Lazy loading para módulos/rutas pesadas
- Servicios inyectables para lógica compartida

## Patrones comunes
- Smart/Dumb components (contenedor vs presentacional)
- Servicios para comunicación con APIs (HttpClient)
- Guards para protección de rutas
- Interceptors para headers, tokens y manejo de errores
- Pipes personalizados para transformación de datos

## Estructura de carpetas
```
src/app/
├── core/          # Servicios singleton, guards, interceptors
├── shared/        # Componentes, pipes y directivas reutilizables
├── features/      # Módulos por funcionalidad
└── models/        # Interfaces y tipos
```
