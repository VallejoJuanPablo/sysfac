# Skill — Node.js

## Descripción
Desarrollo backend con Node.js y su ecosistema.

## Estándares
- Usar ES Modules (`import/export`) salvo que el proyecto requiera CommonJS
- Estructura de carpetas clara: rutas, controladores, servicios, modelos
- Variables de entorno con `.env` (nunca hardcodeadas)
- Manejo de errores centralizado con middleware
- Async/await sobre callbacks y `.then()`

## Patrones comunes
- MVC o similar para organización de código
- Middleware para validación, auth y manejo de errores
- Servicios separados de controladores
- Modelos con validación en el esquema

## Herramientas habituales
- Express o NestJS como framework
- Mongoose (MongoDB) / Sequelize o Knex (MySQL)
- JWT para autenticación
- dotenv para configuración
