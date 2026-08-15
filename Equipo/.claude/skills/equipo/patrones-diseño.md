# Skill — Patrones de Diseño

## Descripción
Patrones clásicos de diseño de software y cuándo aplicarlos en el contexto de Node.js y Angular.

## Patrones creacionales

### Factory
- **Qué hace:** Centraliza la creación de objetos sin exponer la lógica
- **Cuándo usarlo:** Cuando el tipo de objeto a crear depende de condiciones en runtime
- **Ejemplo Node.js:** Factory de conexiones a BD según el tipo (Mongo vs MySQL)
- **Ejemplo Angular:** Factory de servicios según el entorno (dev vs prod)

### Singleton
- **Qué hace:** Garantiza una sola instancia de una clase
- **Cuándo usarlo:** Conexiones a BD, configuración global, cache
- **En Node.js:** Los módulos ya son singleton por defecto (require cache)
- **En Angular:** Los servicios con `providedIn: 'root'` ya son singleton

### Builder
- **Qué hace:** Construye objetos complejos paso a paso
- **Cuándo usarlo:** Cuando un objeto tiene muchas propiedades opcionales
- **Ejemplo:** Construir queries complejas, configuraciones de email, respuestas HTTP

## Patrones estructurales

### Adapter
- **Qué hace:** Convierte la interfaz de una clase en otra que el cliente espera
- **Cuándo usarlo:** Integrar librerías de terceros, cambiar proveedores sin tocar el código
- **Ejemplo:** Wrapper para cambiar de Stripe a MercadoPago sin tocar los controladores

### Facade
- **Qué hace:** Provee una interfaz simplificada a un subsistema complejo
- **Cuándo usarlo:** Cuando un módulo tiene muchas partes internas que el consumidor no necesita conocer
- **Ejemplo Node.js:** Servicio de notificaciones que internamente maneja email, push y SMS
- **Ejemplo Angular:** Servicio facade que coordina múltiples stores o servicios de datos

### Decorator
- **Qué hace:** Agrega comportamiento a un objeto sin modificar su clase
- **Cuándo usarlo:** Logging, caching, validación, permisos
- **En Node.js:** Middleware de Express (cada middleware decora el request/response)
- **En Angular:** Decoradores de TypeScript (`@Component`, `@Injectable`), interceptors HTTP

## Patrones de comportamiento

### Observer
- **Qué hace:** Un objeto notifica a sus suscriptores cuando cambia de estado
- **Cuándo usarlo:** Eventos, notificaciones, actualización de UI en tiempo real
- **En Node.js:** EventEmitter, WebSockets
- **En Angular:** RxJS Observables, Subjects, EventEmitter en componentes

### Strategy
- **Qué hace:** Define una familia de algoritmos intercambiables
- **Cuándo usarlo:** Cuando una operación tiene múltiples formas de ejecutarse
- **Ejemplo:** Estrategias de autenticación (JWT, OAuth, API Key), estrategias de pago, estrategias de validación

### Repository
- **Qué hace:** Abstrae el acceso a datos detrás de una interfaz
- **Cuándo usarlo:** Siempre que accedas a datos persistidos — separar lógica de negocio de la BD
- **Ejemplo Node.js:** `UserRepository` que internamente usa Mongoose o Sequelize
- **Beneficio:** Podés cambiar de MongoDB a MySQL sin tocar los servicios

### Middleware / Chain of Responsibility
- **Qué hace:** Pasa una petición a través de una cadena de handlers
- **Cuándo usarlo:** Procesamiento en pipeline, validaciones en capas
- **En Node.js:** Middleware de Express (auth → validate → controller)
- **En Angular:** Interceptors HTTP (token → logging → error handling)

## Patrones arquitectónicos

### MVC / MVC-like
- **Model:** Datos y lógica de negocio
- **View:** Presentación (Angular components)
- **Controller:** Coordinación entre modelo y vista (Express controllers / Angular services)

### Service Layer
- **Qué hace:** Capa intermedia entre controladores y acceso a datos
- **Regla:** Controllers delgados, services gordos
- **Flujo:** Route → Controller → Service → Repository → DB

### Module Pattern
- **Qué hace:** Agrupa funcionalidad relacionada en un módulo cohesivo
- **En Node.js:** Carpeta por dominio con su index.js que exporta la API pública
- **En Angular:** Feature modules con lazy loading

## Cuándo NO usar patrones
- No forzar un patrón donde no encaja naturalmente
- Si la solución directa tiene 10 líneas y el patrón 50, usar la directa
- Los patrones resuelven problemas reales, no decoran código simple
- Primero hacer que funcione, después refactorizar con patrones si hay un problema claro
