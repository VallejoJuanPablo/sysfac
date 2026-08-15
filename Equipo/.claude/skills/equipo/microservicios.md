# Skill — Microservicios

## Descripción
Patrones y buenas prácticas para diseñar, dividir y comunicar microservicios.

## Cuándo aplicar
- El monolito empieza a ser difícil de mantener o escalar
- Se necesitan equipos/módulos independientes con ciclos de deploy distintos
- Hay dominios de negocio claramente separados

## Cuándo NO aplicar
- Proyectos chicos o MVPs — empezar monolítico y extraer después
- Si el equipo es una sola persona y no hay necesidad real de escalar
- Si la complejidad de la red supera el beneficio de la separación

## Principios de división
1. **Dividir por dominio de negocio**, no por capa técnica
   - Bien: servicio-usuarios, servicio-pagos, servicio-notificaciones
   - Mal: servicio-controllers, servicio-models, servicio-utils
2. **Cada servicio es dueño de sus datos** — base de datos propia
3. **Contratos claros** — APIs bien definidas entre servicios
4. **Independencia de deploy** — un servicio se despliega sin tocar los demás

## Comunicación entre servicios
| Tipo | Cuándo usarlo | Ejemplo |
|---|---|---|
| REST/HTTP | Consultas síncronas simples | Obtener datos de un usuario |
| Message Queue | Operaciones asíncronas, desacopladas | Enviar email después de un registro |
| Events (Pub/Sub) | Notificar cambios a múltiples interesados | Usuario actualizado → sync en varios servicios |

## Estructura típica por servicio
```
servicio-nombre/
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   └── config/
├── tests/
├── Dockerfile
├── .env.example
└── package.json
```

## Herramientas habituales (stack Node.js)
- **Framework:** Express o NestJS (NestJS tiene soporte nativo de microservicios)
- **Message Queue:** RabbitMQ, Redis (Bull/BullMQ)
- **API Gateway:** Express Gateway, Kong, o un reverse proxy con Nginx
- **Contenedores:** Docker + Docker Compose para desarrollo local
- **Descubrimiento:** Variables de entorno para URLs entre servicios (simple) o Consul/etcd (avanzado)

## Buenas prácticas
- Empezar con un monolito bien modularizado, extraer servicios cuando haya razón concreta
- Un servicio = un repositorio, o monorepo con carpetas independientes
- Health checks (`/health`) en cada servicio
- Logs centralizados con correlación de request ID
- Circuit breaker para llamadas entre servicios (evitar cascadas de fallos)
- Variables de entorno para toda configuración de red y conexiones
