# AgroEnvios -- Admin Panel Blueprint

## Fecha: 2026-06-09

> **Purpose:** This single file contains everything a frontend developer needs to build the complete AgroEnvios admin panel without reading any backend code. It covers authentication, every database schema, every API endpoint, TypeScript interfaces, business domain, and suggested screens.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Database Collections](#3-database-collections)
4. [API Endpoints -- Complete Reference](#4-api-endpoints----complete-reference)
5. [Business Domain](#5-business-domain)
6. [Admin Panel Screens](#6-admin-panel-screens)
7. [TypeScript Interfaces](#7-typescript-interfaces)
8. [Known Issues & Gaps](#8-known-issues--gaps)

---

## 1. OVERVIEW

### What is AgroEnvios?

AgroEnvios is a logistics hub platform that acts as a multi-carrier aggregator for shipping in Brazil. It primarily integrates with Correios (Brazil's national postal service) and SSW, providing clients with unified APIs for:

- **Cotizacion (Quoting):** Get shipping prices from multiple carriers
- **Prepostagem (Pre-posting):** Create shipments before physical posting
- **Rotulo (Labels):** Generate shipping labels
- **Rastro (Tracking):** Track shipments across carriers
- **Reversa (Returns):** Handle reverse logistics

### Architecture

```
                         +-------------------+
                         |   API Gateway     |
                         |   Port: 5000      |
                         +--------+----------+
                                  |
                    +-------------+-------------+
                    |                           |
           +-------v--------+         +--------v---------+
           |   ae-auth      |         |  ae-togoagro-hub |
           |   Port: 5001   |         |  Port: 5002      |
           +----------------+         +------------------+
                    |                           |
                    |                    +------+------+
                    |                    |             |
                    +-----> MongoDB <----+   ae-cron   |
                                             Port: 5003
                                        (04:00 & 16:00)
```

| Service | Default Port | Purpose |
|---|---|---|
| **ae-api-gateway** | 5000 | Reverse proxy, rate limiting, CORS, routes to auth + hub |
| **ae-auth** | 5001 | Authentication (login, JWT) |
| **ae-togoagro-hub** | 5002 | Core business logic, all CRUD, carrier integrations |
| **ae-cron** | 5003 | Scheduled jobs (tracking polling, webhooks) |
| **agroenvios-shared** | N/A | Shared library: schemas, interfaces, services, middleware |

### Gateway Routing

| Gateway Prefix | Target Service |
|---|---|
| `/{AUTH_PREFIX}/*` | ae-auth (port 5001) |
| `/{AGROENVIOS_PREFIX}/*` | ae-togoagro-hub (port 5002) |

The gateway prefixes are configured via environment variables. Typical dev values:

- Auth: `v1/api/auth` --> `http://localhost:5001/v1/api/auth`
- Hub: `v1/api` --> `http://localhost:5002/v1/api`

### Rate Limiting

| Environment | Requests/Minute |
|---|---|
| Development | 2,000 |
| Production | 450 |

Standard headers are returned. When exceeded: `429 Too Many Requests` with `{ message, retryAfter }`.

### Connection to the Frontend

- **Base URL (dev):** `http://localhost:5000`
- **All API calls go through the gateway** on port 5000
- The gateway proxies to the correct microservice based on URL prefix
- Authentication uses JWT Bearer tokens (see Section 2)
- API Key authentication (`x-api-key-hub` header) is for client-facing endpoints
- Admin endpoints use JWT-only auth

---

## 2. AUTHENTICATION

### Login Endpoint

```
POST /v1/api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Error Responses:**

| Status | Body | Condition |
|---|---|---|
| 401 | `{ error: "Credenciales invalidas" }` | Wrong username or password |
| 403 | `{ error: "Usuario inactivo" }` | `activo === false` |
| 403 | `{ error: "Usuario bloqueado temporalmente" }` | Locked out |
| 403 | `{ error: "Demasiados intentos fallidos..." }` | 5th failed attempt triggers 30-min lock |

### JWT Payload

```typescript
{
  id: string;          // MongoDB ObjectId of the user
  clienteId: string;   // ID of the client the user belongs to
  username: string;     // Username
  email: string;        // User email
  perfil: {             // User permissions object (IPerfilUsuario)
    administrador: boolean;
    gestorClientes: boolean;
    gestorOperadores: boolean;
    puedeCrearEnvios: boolean;
    puedeConsultarPrecios: boolean;
    puedeRastrearEnvios: boolean;
    puedeGenerarEtiquetas: boolean;
    puedeVerHistorial: boolean;
    puedeExportarReportes: boolean;
    puedeConfigurearServicios: boolean;
    limiteDiarioEnvios?: number;
    limiteMensualEnvios?: number;
    clientesPermitidos?: string[];
    operadoresPermitidos?: string[];
  };
  iat: number;          // Issued at (UNIX timestamp)
  exp: number;          // Expires at (UNIX timestamp)
}
```

### Token Configuration

| Setting | Value |
|---|---|
| Algorithm | HS256 (default jsonwebtoken) |
| Expiry | 24 hours |
| Refresh | **None -- no refresh token endpoint exists** |
| Secret | `JWT_SECRET` env var (fallback: `your-secret-key-change-in-production`) |

### Using the Token

All authenticated requests must include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Middlewares

There are **two** auth middlewares in the hub:

| Middleware | Header Required | Used By |
|---|---|---|
| `apiKeyAuth` | `x-api-key-hub` + `Authorization: Bearer <token>` | Client-facing endpoints (cotizacion, prepostagem, rastro, rotulo, reversa) |
| `jwtAuth` | `Authorization: Bearer <token>` only | Admin endpoints (`/admin/*`) |

For the **admin panel**, you only need `jwtAuth` -- send the JWT Bearer token.

### Account Lockout

| Parameter | Value |
|---|---|
| Max failed attempts | 5 |
| Lockout duration | 30 minutes |
| Reset on success | Yes -- `intentosFallidosLogin` resets to 0, `bloqueadoHasta` set to null |

### Login Flow (Internal)

1. Find user by `username` (including `+password` field)
2. Check `activo === true`
3. Check `seguridad.bloqueadoHasta` is not in the future
4. Compare password with bcrypt
5. On failure: increment `seguridad.intentosFallidosLogin`; if >= 5, set `bloqueadoHasta` to now + 30 min
6. On success: reset failed attempts, sign JWT, return `{ token }`

### Dead Code (Not Active)

- `getMe()` -- exists in service but has no route
- `verifyToken()` -- exists in service but has no route
- **No register endpoint**
- **No password reset endpoint**

---

## 3. DATABASE COLLECTIONS

All collections live in a single MongoDB database (configured via `MONGO_URI_TODOAGRO` env var).

### 3.1 `usuarios`

User accounts for the platform.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | Primary key |
| `email` | String | Yes | -- | Yes | Lowercase, trimmed. Regex validated. |
| `username` | String | No | -- | Yes (sparse) | 3-30 chars, alphanumeric + `-_` |
| `password` | String | Yes | -- | No | bcrypt hash. `select: false` -- not returned in queries by default |
| `nombre` | String | Yes | -- | No | Max 100 chars |
| `apellido` | String | No | -- | No | Max 100 chars |
| `telefono` | String | No | -- | No | Phone regex validated |
| `avatar` | String | No | -- | No | URL |
| `clienteId` | String | Yes | -- | Yes | References `clientes._id` |
| `departamento` | String | No | -- | No | Max 100 chars |
| `cargo` | String | No | -- | No | Max 100 chars |
| `perfil` | **PerfilUsuario** | Yes | -- | No | See sub-document below |
| `seguridad` | **SeguridadUsuario** | Yes | -- | No | See sub-document below |
| `activo` | Boolean | No | `true` | Yes | |
| `verificado` | Boolean | No | `false` | No | |
| `tokenVerificacion` | String | No | -- | No | `select: false` |
| `fechaRegistro` | Date | No | `Date.now` | No | |
| `fechaUltimoAcceso` | Date | No | -- | No | |
| `fechaUltimaActividad` | Date | No | -- | No | |
| `configuracion` | **Configuracion** | Yes | `{}` | No | See sub-document below |
| `sesiones` | **Sesion[]** | No | -- | No | Array of sessions |
| `createdAt` | Date | auto | auto | No | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | No | Mongoose timestamps |

**Sub-document: PerfilUsuario**

| Field | Type | Default | Notes |
|---|---|---|---|
| `administrador` | Boolean | `false` | Full system admin |
| `gestorClientes` | Boolean | `false` | Can manage clients |
| `gestorOperadores` | Boolean | `false` | Can manage operators |
| `puedeCrearEnvios` | Boolean | `true` | |
| `puedeConsultarPrecios` | Boolean | `true` | |
| `puedeRastrearEnvios` | Boolean | `true` | |
| `puedeGenerarEtiquetas` | Boolean | `true` | |
| `puedeVerHistorial` | Boolean | `true` | |
| `puedeExportarReportes` | Boolean | `false` | |
| `puedeConfigurearServicios` | Boolean | `false` | NOTE: typo in original code, keep as-is |
| `limiteDiarioEnvios` | Number | -- | Min: 0 |
| `limiteMensualEnvios` | Number | -- | Min: 0 |
| `clientesPermitidos` | String[] | -- | Array of client IDs |
| `operadoresPermitidos` | String[] | -- | Array of operator IDs |

**Sub-document: SeguridadUsuario**

| Field | Type | Default | Notes |
|---|---|---|---|
| `requiere2FA` | Boolean | `false` | |
| `secret2FA` | String | -- | `select: false` |
| `codigosRecuperacion` | String[] | -- | `select: false` |
| `bloqueadoHasta` | Date | -- | Lockout expiry |
| `intentosFallidosLogin` | Number | `0` | Min: 0 |
| `ultimoCambioPassword` | Date | `Date.now` | |
| `historialPasswords` | String[] | -- | `select: false`, max 5 |
| `ipUltimoAcceso` | String | -- | |
| `dispositivosConfiables` | DispositivoConfiable[] | -- | See below |

**Sub-document: DispositivoConfiable**

| Field | Type | Required | Default |
|---|---|---|---|
| `deviceId` | String | Yes | -- |
| `nombre` | String | Yes | -- |
| `fechaRegistro` | Date | No | `Date.now` |
| `ultimoUso` | Date | No | `Date.now` |

**Sub-document: Configuracion**

| Field | Type | Default | Enum |
|---|---|---|---|
| `idioma` | String | `pt-BR` | `es`, `pt-BR`, `en` |
| `timezone` | String | `America/Sao_Paulo` | -- |
| `notificacionesEmail` | Boolean | `true` | -- |
| `notificacionesSMS` | Boolean | `false` | -- |
| `notificacionesPush` | Boolean | `true` | -- |
| `temaOscuro` | Boolean | `false` | -- |

**Sub-document: Sesion**

| Field | Type | Required | Default |
|---|---|---|---|
| `sessionId` | String | Yes | -- (unique) |
| `deviceInfo` | String | Yes | -- |
| `ip` | String | Yes | -- |
| `userAgent` | String | Yes | -- |
| `fechaCreacion` | Date | No | `Date.now` |
| `fechaUltimaActividad` | Date | No | `Date.now` |
| `activa` | Boolean | No | `true` |

### 3.2 `clientes`

Client companies that use the platform.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | Primary key |
| `codigoCliente` | String | Yes | -- | Yes | Uppercase, trimmed |
| `nombre` | String | Yes | -- | Yes | |
| `razonSocial` | String | No | -- | No | |
| `tipoCliente` | String | Yes | -- | Yes | Enum: `INTERNO`, `EXTERNO`, `PARTNER`, `CORPORATIVO` |
| `contacto` | **Contacto** | Yes | -- | No | See sub-document |
| `numeroDocumento` | String | No | -- | Yes (sparse) | CNPJ/RUT |
| `website` | String | No | -- | No | |
| `industria` | String | No | -- | No | |
| `logoUrl` | String | No | -- | No | |
| `operadoresHabilitados` | **OperadorHabilitado[]** | No | `[]` | No | Embedded array (legacy structure) |
| `integracion` | **IntegracionCliente** | No | -- | No | API keys, webhooks, rate limits |
| `configuracionEnvios` | **ConfiguracionEnvios** | No | -- | No | |
| `permisos` | **PermisosCliente** | No | -- | No | |
| `activo` | Boolean | Yes | `true` | Yes | |
| `fechaRegistro` | Date | Yes | `Date.now` | Yes | |
| `fechaUltimoAcceso` | Date | No | -- | No | |
| `fechaUltimoEnvio` | Date | No | -- | No | |
| `estadisticas` | **EstadisticasCliente** | No | -- | No | |
| `facturacion` | **FacturacionCliente** | No | -- | No | |
| `notas` | String | No | -- | No | |
| `tags` | String[] | No | -- | No | |
| `creadoPor` | String | No | -- | No | |
| `ultimaModificacionPor` | String | No | -- | No | |
| `createdAt` | Date | auto | auto | No | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | No | Mongoose timestamps |

**Sub-document: Contacto**

| Field | Type | Required | Default |
|---|---|---|---|
| `email` | String | Yes | -- | Lowercase, indexed |
| `telefono` | String | No | -- |
| `direccion` | String | No | -- |
| `ciudad` | String | No | -- |
| `estado` | String | No | -- |
| `codigoPostal` | String | No | -- |
| `pais` | String | No | `BR` |

**Sub-document: OperadorHabilitado (embedded in clientes)**

| Field | Type | Required | Default | Indexed |
|---|---|---|---|---|
| `operadorId` | String | Yes | -- | Yes |
| `nombreOperador` | String | No | -- | No |
| `habilitado` | Boolean | Yes | `true` | Yes |
| `prioridadGeneral` | Number | Yes | -- | Yes | Min: 1, Max: 100 |
| `serviciosHabilitados` | ServicioHabilitado[] | No | -- | No |
| `fechaActivacion` | Date | Yes | `Date.now` | No |
| `ultimaActualizacion` | Date | Yes | `Date.now` | No |

**Sub-document: ServicioHabilitado (nested in OperadorHabilitado)**

| Field | Type | Required | Default | Indexed |
|---|---|---|---|---|
| `servicioId` | String | Yes | -- | Yes |
| `codigoServicio` | String | Yes | -- | Yes |
| `nombreServicio` | String | Yes | -- | Yes |
| `habilitado` | Boolean | Yes | `true` | Yes |
| `fechaActivacion` | Date | No | `Date.now` | No |
| `ultimoUso` | Date | No | -- | No |

**Sub-document: IntegracionCliente**

| Field | Type | Default | Notes |
|---|---|---|---|
| `apiKey` | String | -- | Used with `x-api-key-hub` header |
| `secretKey` | String | -- | |
| `rateLimitPorMinuto` | Number | -- | Min: 0 |
| `rateLimitPorHora` | Number | -- | Min: 0 |
| `rateLimitPorDia` | Number | -- | Min: 0 |
| `ipPermitidas` | String[] | -- | |
| `webhooks` | Webhook[] | -- | See below |
| `fechaCreacionAPI` | Date | `Date.now` | |
| `fechaUltimoUso` | Date | -- | |
| `requestsRealizados` | Number | `0` | Min: 0 |
| `activa` | Boolean | `true` | |

**Sub-document: Webhook**

| Field | Type | Required | Default |
|---|---|---|---|
| `url` | String | Yes | -- |
| `eventos` | String[] | No | -- |
| `activo` | Boolean | Yes | `false` |
| `codigo` | String | Yes | -- | e.g. `sendRastros` |
| `secretWebhook` | String | No | -- |

**Sub-document: ConfiguracionEnvios**

| Field | Type | Default |
|---|---|---|
| `zonaOperacion` | String[] | -- |
| `tiposProducto` | String[] | -- |
| `volumenMensualEstimado` | Number | -- |
| `valorPromedioEnvio` | Number | -- |
| `requiereSeguroObligatorio` | Boolean | `false` |
| `requiereAprobacionEnvios` | Boolean | `false` |
| `notificacionesEmail` | Boolean | `true` |
| `notificacionesSMS` | Boolean | `false` |

**Sub-document: PermisosCliente**

| Field | Type | Required | Default |
|---|---|---|---|
| `puedeCrearEnvios` | Boolean | Yes | `true` |
| `puedeConsultarPrecios` | Boolean | Yes | `true` |
| `puedeRastrearEnvios` | Boolean | Yes | `true` |
| `puedeGenerarEtiquetas` | Boolean | Yes | `true` |
| `puedeVerHistorial` | Boolean | Yes | `true` |
| `puedeExportarReportes` | Boolean | Yes | `false` |
| `puedeConfigurearServicios` | Boolean | Yes | `false` |
| `limiteDiarioEnvios` | Number | No | -- |
| `limiteMensualEnvios` | Number | No | -- |

**Sub-document: EstadisticasCliente**

| Field | Type | Default | Notes |
|---|---|---|---|
| `totalEnvios` | Number | `0` | Min: 0 |
| `enviosUltimoMes` | Number | `0` | Min: 0 |
| `costoTotalFacturado` | Number | `0` | Min: 0 |
| `costoUltimoMes` | Number | `0` | Min: 0 |
| `operadorMasUsado` | String | -- | |
| `servicioMasUsado` | String | -- | |
| `zonaMasUsada` | String | -- | |
| `satisfaccionPromedio` | Number | -- | Min: 1, Max: 5 |

**Sub-document: FacturacionCliente**

| Field | Type | Default | Enum |
|---|---|---|---|
| `cicloFacturacion` | String | `MENSUAL` | `MENSUAL`, `QUINCENAL`, `SEMANAL`, `POR_ENVIO` |
| `metodoPago` | String | `CREDITO` | `CREDITO`, `DEBITO`, `TRANSFERENCIA`, `EFECTIVO` |
| `monedaPreferida` | String | `BRL` | -- |
| `descuentoGeneral` | Number | -- | Min: 0, Max: 100 |
| `recargoAdministrativo` | Number | -- | Min: 0 |
| `condicionesPago` | String | -- | -- |
| `contactoFacturacion.nombre` | String | -- | -- |
| `contactoFacturacion.email` | String | -- | Lowercase |
| `contactoFacturacion.telefono` | String | -- | -- |

### 3.3 `clientes_operadores` (Junction Table)

Many-to-many relationship between clients and operators, with configuration per relationship.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Primary key |
| `clienteId` | String | Yes | -- | References `clientes._id` |
| `operadorId` | String | Yes | -- | References `operadores_logisticos._id` |
| `config` | **ConfigCO** | No | -- | Relationship configuration |
| `integracion` | **IntegracionCO[]** | No | -- | Array of API integrations |
| `creadoPor` | String | No | -- | |
| `ultimaModificacionPor` | String | No | -- | |
| `createdAt` | Date | auto | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | Mongoose timestamps |

**Sub-document: ConfigCO**

| Field | Type | Required | Default | Indexed |
|---|---|---|---|---|
| `habilitado` | Boolean | Yes | `true` | Yes |
| `prioridadGeneral` | Number | Yes | -- | Yes | Min: 1, Max: 100 |
| `creditoLimite` | Number | No | `0` | No | Min: 0 |
| `formaPagoPreferida` | String | No | -- | No | |
| `facturacionEspecial` | Boolean | No | `false` | No | |
| `contactoComercial.nombre` | String | No | -- | No | |
| `contactoComercial.email` | String | No | -- | No | |
| `contactoComercial.telefono` | String | No | -- | No | |
| `contrato` | String | No | -- | No | |
| `numeroCliente` | String | No | -- | No | |
| `descuentoGeneral` | Number | No | -- | No | Min: 0, Max: 100 |
| `condicionesPago` | String | No | -- | No | |
| `fechaActivacion` | Date | Yes | `Date.now` | No | |
| `ultimaActualizacion` | Date | Yes | `Date.now` | No | |

**Sub-document: IntegracionCO**

| Field | Type | Required | Default | Indexed |
|---|---|---|---|---|
| `apiKey` | String | Yes | -- | Yes |
| `secretKey` | String | No | -- | No |
| `rateLimitPorMinuto` | Number | No | -- | No | Min: 0 |
| `rateLimitPorHora` | Number | No | -- | No | Min: 0 |
| `rateLimitPorDia` | Number | No | -- | No | Min: 0 |
| `ipPermitidas` | String[] | No | -- | No | |
| `webhook.url` | String | No | -- | No | |
| `webhook.eventos` | String[] | No | -- | No | |
| `webhook.activo` | Boolean | No | `false` | No | |
| `webhook.secretWebhook` | String | No | -- | No | |
| `fechaCreacionAPI` | Date | Yes | `Date.now` | No | |
| `fechaUltimoUso` | Date | No | -- | No | |
| `requestsRealizados` | Number | No | `0` | No | Min: 0 |
| `activa` | Boolean | Yes | `true` | Yes | |

### 3.4 `clientes_servicios` (Junction Table)

Many-to-many relationship between clients and services, scoped to an operator.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Primary key |
| `clienteId` | String | Yes | -- | References `clientes._id` |
| `operadorId` | String | Yes | -- | References `operadores_logisticos._id` |
| `servicioId` | String | Yes | -- | References `servicios_operadores_logisticos._id` |
| `config` | **ConfigCS[]** | No | -- | Array of config entries |
| `creadoPor` | String | No | -- | |
| `ultimaModificacionPor` | String | No | -- | |
| `createdAt` | Date | auto | auto | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | Mongoose timestamps |

**Sub-document: ConfigCS**

| Field | Type | Required | Default | Indexed |
|---|---|---|---|---|
| `habilitado` | Boolean | Yes | `true` | Yes |
| `prioridadCliente` | Number | Yes | -- | Yes | Min: 1, Max: 100 |
| `fechaActivacion` | Date | Yes | `Date.now` | No |
| `ultimoUso` | Date | Yes | `Date.now` | No |

### 3.5 `operadores_logisticos`

Logistics carriers/operators that provide shipping services.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | Primary key |
| `id` | String | Yes | -- | Yes (unique) | Custom ID |
| `nombre` | String | Yes | -- | Yes | |
| `codigo` | String | Yes | -- | Yes (unique) | Uppercase |
| `plataforma` | String | No | -- | Yes | Lowercase. Maps to carrier name (e.g. `correios`, `ssw`) |
| `descripcion` | String | No | -- | No | |
| `razonSocial` | String | Yes | -- | No | |
| `numeroDocumento` | String | No | -- | No | |
| `pais` | String | Yes | -- | Yes | 2-char uppercase ISO |
| `regiones` | String[] | No | `[]` | Yes | |
| `website` | String | No | -- | No | |
| `logoUrl` | String | No | -- | No | |
| `contacto` | **ContactoOperador** | No | -- | No | |
| `contactoSoporte` | **ContactoOperador** | No | -- | No | |
| `contactoComercial` | **ContactoOperador** | No | -- | No | |
| `tieneCotizadorOnline` | Boolean | No | `false` | No | |
| `tieneTrackingOnline` | Boolean | No | `false` | No | |
| `tieneGeneracionEtiquetas` | Boolean | No | `false` | No | |
| `soportaWebhooks` | Boolean | No | `false` | No | |
| `soportaNotificacionesSMS` | Boolean | No | `false` | No | |
| `soportaNotificacionesEmail` | Boolean | No | `false` | No | |
| `formasPago` | String[] | No | `['POSTPAGO']` | No | Enum: `POSTPAGO`, `PREPAGO`, `CREDITO`, `DEBITO`, `CONTRATO` |
| `configuracion` | **ConfiguracionAPI** | Yes | -- | No | See sub-document |
| `tipoIntegracion` | String | Yes | -- | No | Enum: `API`, `TABLA_PRECIOS`, `MANUAL`, `EDI` |
| `documentacionAPI` | String | No | -- | No | URL |
| `cobertura` | **Cobertura** | No | -- | No | See sub-document |
| `habilitado` | Boolean | No | `false` | No | |
| `enMantenimiento` | Boolean | No | `false` | No | |
| `prioridad` | Number | No | `5` | Yes | Min: 1, Max: 10 |
| `fechaUltimaValidacion` | Date | No | -- | No | |
| `estadoConexion` | String | No | `INACTIVA` | Yes | Enum: `ACTIVA`, `INACTIVA`, `ERROR`, `MANTENIMIENTO` |
| `mensajeEstado` | String | No | -- | No | |
| `metricas` | **MetricasOperador** | No | -- | No | See sub-document |
| `createdAt` | Date | auto | auto | No | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | No | Mongoose timestamps |

**Compound Indexes:** `{ pais: 1, habilitado: 1 }`, `{ estadoConexion: 1, habilitado: 1 }`, `{ prioridad: 1, habilitado: 1 }`

**Sub-document: ContactoOperador**

| Field | Type |
|---|---|
| `email` | String |
| `telefono` | String |
| `personaContacto` | String |
| `horarioAtencion` | String |
| `departamento` | String |

**Sub-document: ConfiguracionAPI**

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `baseUrl` | String | No | -- | URL |
| `authType` | String | Yes | -- | Enum: `API_KEY`, `BASIC`, `OAUTH`, `CUSTOM` |
| `credenciales` | Mixed | Yes | -- | Encrypted credentials object |
| `timeout` | Number | No | `30000` | Min: 1000, Max: 300000 (ms) |
| `maxReintentos` | Number | No | `3` | Min: 0, Max: 10 |
| `headerCustom` | Map<String, String> | No | `{}` | |
| `versionAPI` | String | No | -- | |

**Sub-document: Cobertura**

| Field | Type | Default |
|---|---|---|
| `nacional` | Boolean | `false` |
| `internacional` | Boolean | `false` |
| `zonasCubiertas` | String[] | `[]` |
| `zonasExcluidas` | String[] | `[]` |
| `cepCubiertos` | String[] | `[]` |
| `cepExcluidos` | String[] | `[]` |

**Sub-document: MetricasOperador**

| Field | Type | Min | Max |
|---|---|---|---|
| `tiempoRespuestaPromedio` | Number | 0 | 300000 |
| `tasaExitoCotizacion` | Number | 0 | 100 |
| `tasaExitoTracking` | Number | 0 | 100 |
| `cantidadEnviosUltimoMes` | Number | 0 | -- |
| `costoPromedioPorKg` | Number | 0 | -- |
| `satisfaccionCliente` | Number | 1 | 5 |

### 3.6 `servicios_operadores_logisticos`

Shipping services offered by each operator.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | Primary key |
| `operadorId` | String | Yes | -- | Yes | References `operadores_logisticos._id` |
| `codigoServicio` | String | Yes | -- | Yes | Internal code |
| `codigoExterno` | String | No | -- | No | Code in carrier's system |
| `nombre` | String | Yes | -- | No | |
| `descripcion` | String | No | -- | No | |
| `segmento` | String | Yes | -- | No | Enum: `EXPRESS`, `STANDARD`, `ECONOMICO`, `PREMIUM`, `OVERNIGHT` |
| `tiempoEntregaMin` | Number | Yes | -- | No | Days, min: 0 |
| `tiempoEntregaMax` | Number | Yes | -- | No | Days, min: 0 |
| `corteSolicitud` | String | No | -- | No | e.g. `14:00` |
| `pesoMinimo` | Number | No | -- | No | kg, min: 0 |
| `pesoMaximo` | Number | No | -- | No | kg, min: 0 |
| `dimensionesMaximas` | **DimensionesMaximas** | No | -- | No | |
| `valorMaximoDeclarado` | Number | No | -- | No | Min: 0 |
| `shippingConstraints` | **ShippingConstraints** | No | -- | No | |
| `entregaDomicilio` | Boolean | No | `true` | No | |
| `entregaSabado` | Boolean | No | `false` | No | |
| `entregaDomingo` | Boolean | No | `false` | No | |
| `entregaFeriados` | Boolean | No | `false` | No | |
| `requiereRecogida` | Boolean | No | `false` | No | |
| `requiereAgendamiento` | Boolean | No | `false` | No | |
| `soportaLogisticaReversa` | Boolean | No | `false` | No | |
| `soportaCambioDestino` | Boolean | No | `false` | No | |
| `soportaReentrega` | Boolean | No | `true` | No | |
| `requiereSeguro` | Boolean | No | `false` | No | |
| `aceptaFragil` | Boolean | No | `true` | No | |
| `aceptaPeligrosos` | Boolean | No | `false` | No | |
| `prioridadUso` | Number | No | `5` | No | Min: 1, Max: 10 |
| `configuracionEspecial` | Mixed | No | -- | No | |
| `cobrosAdicionales` | **CobroAdicional[]** | No | -- | No | |
| `reversa` | String | No | `N` | No | Enum: `S`, `N` |
| `codigoServicioReversa` | String | No | -- | No | |
| `fechaCreacion` | Date | No | `Date.now` | No | |
| `ultimaActualizacion` | Date | No | `Date.now` | No | |
| `createdAt` | Date | auto | auto | No | Mongoose timestamps |
| `updatedAt` | Date | auto | auto | No | Mongoose timestamps |

**Sub-document: DimensionesMaximas**

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `largo` | Number | Yes | -- | cm, min: 0 |
| `ancho` | Number | Yes | -- | cm, min: 0 |
| `alto` | Number | Yes | -- | cm, min: 0 |
| `peso` | Number | Yes | -- | kg, min: 0 |
| `unidadPeso` | String | No | `kg` | Enum: `kg`, `g`, `lb` |
| `unidadDimension` | String | No | `cm` | Enum: `cm`, `mm`, `in` |

**Sub-document: ShippingConstraints**

| Field | Type | Required |
|---|---|---|
| `length` | `{ min: number, max: number }` | Yes |
| `width` | `{ min: number, max: number }` | Yes |
| `height` | `{ min: number, max: number }` | Yes |
| `sumDimensions` | `{ min: number, max: number }` | Yes |
| `physicalWeight` | `{ min: number, max: number }` | Yes |
| `volume` | `{ min: number, max: number }` | Yes |
| `maxScaleWeight` | Number | Yes |
| `defaultVolumetricFactor` | Number | Yes |
| `acceptedShippingType` | String[] | No |

**Sub-document: CobroAdicional**

| Field | Type | Required | Default |
|---|---|---|---|
| `concepto` | String | Yes | -- |
| `codigo` | String | Yes | -- |
| `tipo` | String | Yes | -- | Enum: `FIJO`, `PORCENTUAL`, `POR_KG`, `POR_KM`, `POR_VOLUMEN` |
| `valor` | Number | Yes | -- | Min: 0 |
| `condicion` | String | No | -- |
| `obligatorio` | Boolean | No | `false` |
| `activo` | Boolean | No | `true` |

### 3.7 `prepostagems`

Pre-posting records -- shipments registered with Correios before physical posting.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | |
| `id` | String | No | -- | Yes | Correios ID |
| `idCliente` | String | No | -- | Yes | References `clientes._id` |
| `idLote` | String | No | -- | No | Batch ID |
| `idVolume` | String | No | -- | No | |
| `remetente` | **Persona** | Yes | -- | No | Sender |
| `destinatario` | **Persona** | Yes | -- | No | Recipient |
| `codigoObjeto` | String | Yes | -- | Yes (unique) | Tracking code |
| `codigoServico` | String | Yes | -- | No | Service code |
| `servico` | String | Yes | -- | No | Service name |
| `numeroNotaFiscal` | String | No | -- | No | Invoice number |
| `itensDeclaracaoConteudo` | Mixed[] | No | -- | No | Content declaration items |
| `pesoInformado` | Number | No | -- | No | grams |
| `alturaInformada` | Number | No | -- | No | cm |
| `larguraInformada` | Number | No | -- | No | cm |
| `comprimentoInformado` | Number | No | -- | No | cm |
| `statusAtual` | Number | Yes | -- | No | Current status code |
| `dataHoraStatusAtual` | Date | Yes | -- | No | |
| `descStatusAtual` | String | No | -- | No | Status description |
| `codigoFormatoObjetoInformado` | String | No | -- | No | `1`=box, `2`=cylinder, `3`=envelope |
| `numeroCartaoPostagem` | String | No | -- | No | Postal card number |
| `dataHora` | Date | Yes | -- | No | Creation datetime |
| `cienteObjetoNaoProibido` | Number | No | `0` | No | 0 or 1 |
| `tipoRotulo` | String | No | -- | No | |
| `modalidadePagamento` | Number | No | -- | No | 1, 2, or 3 |
| `idCorreios` | String | No | -- | No | Correios internal ID |
| `chaveNFe` | String | No | -- | Yes (sparse) | NFe key (44 digits) |
| `solicitarColeta` | String | No | `N` | No | Enum: `S`, `N` |
| `reciboSolicitacaoAssincrona` | String | No | -- | No | |
| `codigoFormatoObjetoPreAfericao` | String | No | -- | No | |
| `alturaPreAfericao` | Number | No | -- | No | |
| `larguraPreAfericao` | Number | No | -- | No | |
| `comprimentoPreAfericao` | Number | No | -- | No | |
| `diametroPreAfericao` | Number | No | -- | No | |
| `pesoPreAfericao` | Number | No | -- | No | |
| `dataHoraPreAfericao` | Date | No | -- | No | |
| `mcuUnidadePreAfericao` | String | No | -- | No | |
| `idBalancaCubagem` | String | No | -- | No | |
| `cepDestinoPreAfericao` | String | No | -- | No | |
| `tipoObjeto` | String | No | -- | No | |
| `logisticaReversa` | String | No | `N` | No | Enum: `S`, `N` |
| `prazoPostagem` | Date | No | -- | No | |
| `prazoEntrega` | Number | No | -- | No | Days |
| `createdAt` | Date | auto | auto | No | |
| `updatedAt` | Date | auto | auto | No | |

**Compound Indexes:** `{ destinatario.cpfCnpj: 1 }`, `{ dataHoraStatusAtual: -1 }`

**Sub-document: Persona**

| Field | Type | Required |
|---|---|---|
| `nome` | String | Yes |
| `cpfCnpj` | String | Yes |
| `email` | String | No |
| `endereco` | **Address** | Yes |

**Sub-document: Address**

| Field | Type | Required |
|---|---|---|
| `logradouro` | String | Yes |
| `numero` | String | Yes |
| `bairro` | String | Yes |
| `cidade` | String | Yes |
| `cep` | String | Yes |
| `uf` | String | Yes | 2-char uppercase state code |

### 3.8 `cotizacion`

Shipping quotes from Correios.

| Field | Type | Required | Indexed | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | Yes | |
| `coProduto` | String | Yes | Yes | Product code |
| `nuRequisicao` | String | Yes | Yes | Requisition number |
| `cepOrigem` | String | Yes | No | Origin postal code |
| `cepDestino` | String | Yes | No | Destination postal code |
| `preco` | **Preco** | Yes | No | Price details |
| `prazo` | **Prazo** | No | No | Delivery time info |
| `transportista` | **Transportista** | No | No | Carrier info |
| `quote_id` | String | No | No | References `quotes._id` |
| `createdAt` | Date | auto | No | |
| `updatedAt` | Date | auto | No | |

**Compound Index:** `{ coProduto: 1, nuRequisicao: 1 }`

**Sub-document: Preco**

| Field | Type | Notes |
|---|---|---|
| `pcBase` | Number | Base price |
| `pcBaseGeral` | Number | General base price |
| `peVariacao` | Number | Price variation |
| `pcReferencia` | Number | Reference price |
| `vlBaseCalculoImposto` | Number | Tax calculation base |
| `inPesoCubico` | String | `S` or `N` -- uses volumetric weight? |
| `psCobrado` | Number | Charged weight |
| `peAdValorem` | Number | Ad valorem percentage |
| `vlSeguroAutomatico` | Number | Automatic insurance value |
| `qtAdicional` | Number | Additional quantity |
| `pcFaixa` | Number | Range price |
| `pcFaixaVariacao` | Number | Range variation |
| `pcProduto` | Number | Product price |
| `pcFinal` | Number | **Final price** |
| `servicoAdicional` | ServicoAdicional[] | Additional services |
| `pcTotalServicosAdicionais` | Number | Total additional services cost |

**Sub-document: Prazo**

| Field | Type |
|---|---|
| `prazoEntrega` | Number | Business days |
| `dataMaxima` | String | Max delivery date |
| `entregaDomiciliar` | String | `S` or `N` |
| `entregaSabado` | String | `S` or `N` |
| `entregaDomingo` | String | `S` or `N` |
| `msgPrazo` | String | |

**Sub-document: Transportista**

| Field | Type |
|---|---|
| `codigo` | String |
| `descricao` | String |
| `coSegmento` | String |
| `descSegmento` | String |

### 3.9 `cotizacion_logs`

Full logs of cotizacion requests and responses.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `entryData` | **EntryData** | Yes | Request data |
| `responseData` | **ResponseData[]** | Yes | Response data array |
| `createdAt` | Date | auto | Indexed (descending) |
| `updatedAt` | Date | auto | |

**Indexes:** `{ entryData.origin_zip_code: 1 }`, `{ entryData.destination_zip_code: 1 }`, `{ createdAt: -1 }`

### 3.10 `rastro`

Tracking events for shipments.

| Field | Type | Required | Indexed | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | Yes | |
| `idsPrePostagem` | String | No | No | References prepostagem |
| `codObjeto` | String | Yes | Yes | Tracking code |
| `codigo` | String | Yes | Yes | Event code (e.g. `BDE`, `OEC`) |
| `tipo` | String | Yes | No | Event type (e.g. `01`, `08`) |
| `dtHrCriado` | Date | Yes | No | Event datetime |
| `descricao` | String | Yes | No | Description |
| `detalhe` | String | No | No | |
| `comentario` | String | No | No | |
| `unidade` | **Unidade** | Yes | No | Origin unit |
| `unidadeDestino` | **Unidade** | No | No | Destination unit |
| `dtLimiteRetirada` | Date | No | No | Pickup deadline |
| `codLista` | String | No | No | |
| `createdAt` | Date | auto | No | |
| `updatedAt` | Date | auto | No | |

**Compound Indexes:** `{ codObjeto: 1, dtHrCriado: -1 }`, `{ codigo: 1 }`

**Sub-document: Unidade**

| Field | Type | Required |
|---|---|---|
| `codSro` | String | No |
| `tipo` | String | Yes |
| `endereco` | **EnderecoRastro** | Yes |

**Sub-document: EnderecoRastro**

| Field | Type | Required |
|---|---|---|
| `cep` | String | No |
| `logradouro` | String | No |
| `numero` | String | No |
| `bairro` | String | No |
| `cidade` | String | No |
| `uf` | String | Yes |

### 3.11 `rastro_estados`

Mapping table for Correios tracking event codes to human-readable statuses.

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | |
| `codigo` | String | Yes | -- | Yes | Uppercase. e.g. `BDE`, `OEC` |
| `tipo` | String | Yes | -- | No | e.g. `01`, `08` |
| `descricao` | String | Yes | -- | No | Description |
| `categoria` | String | Yes | -- | No | Enum: `Entrega`, `Transferencia`, `Correcciones`, `Etiquetas`, `Pendiente`, `Salida`, `Postado` |
| `codigoMacro` | String | No | -- | No | Macro status code |
| `retornable` | Boolean | No | `false` | No | |
| `esEstadoFinal` | Boolean | No | `false` | No | |
| `esProblema` | Boolean | No | `false` | No | |
| `prioridad` | Number | No | -- | No | |
| `activo` | Boolean | Yes | `true` | No | |
| `observaciones` | String | No | -- | No | |
| `createdAt` | Date | auto | auto | No | |
| `updatedAt` | Date | auto | auto | No | |

### 3.12 `rotulo`

Shipping labels.

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | |
| `idsPrePostagem` | String | Yes | -- | References prepostagem |
| `idRecibo` | String | No | -- | Receipt ID |
| `nome` | String | No | -- | |
| `link` | String | No | -- | URL to PDF |
| `formatoRotulo` | String | No | -- | |
| `tipoRotulo` | String | No | -- | |
| `valido` | String | No | `S` | `S` or `N` |
| `createdAt` | Date | auto | auto | |
| `updatedAt` | Date | auto | auto | |

### 3.13 `nota_fiscal`

Fiscal notes (invoices) associated with shipments.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | String | Yes | |
| `idsPrePostagem` | String[] | No | null default |
| `url` | String | Yes | |
| `createdAt` | Date | auto | |
| `updatedAt` | Date | auto | |

### 3.14 `info_lotes`

Batch processing information for prepostagems.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `lote.idLote` | String | Yes | Unique index |
| `lote.quote_id` | String | No | |
| `lote.dataInclusao` | Date | Yes | |
| `lote.dataEncerramento` | Date | No | |
| `lote.statusProcessamento` | String | Yes | e.g. `STARTED`, `COMPLETED`, `FAILED` |
| `lote.nomeArquivoLote` | String | Yes | |
| `lote.tipoLote` | String | Yes | |
| `lote.numeroCartaoPostagem` | String | Yes | |
| `lote.quantidadeLinhasNaoProcessadas` | Number | No | |
| `lote.quantidadeLinhasProcessadasSucesso` | Number | No | |
| `lote.mensagem` | String | No | |
| `lote.erroProcessamento` | Boolean | Yes | |
| `prePostagens.ids` | String[] | No | |
| `prePostagens.codigosObjetos` | String[] | No | |
| `prePostagens.statusPrePostagens` | Number | No | |
| `linhasNaoProcessadas` | `{ indice: number, erro: string }[]` | No | |

### 3.15 `volumes`

Package/volume data from optimized packaging.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | String | Yes | |
| `dimensions.length` | Number | Yes | |
| `dimensions.width` | Number | Yes | |
| `dimensions.height` | Number | Yes | |
| `dimensions.sumOfDimensions` | Number | Yes | |
| `dimensions.unit` | String | Yes | |
| `products` | ProductResponse[] | Yes | Array of products in volume |
| `shippingWeight` | Number | Yes | |
| `cost_of_goods` | Number | No | |
| `quote_id` | String | No | |
| `cotizacion_id` | String | No | |

### 3.16 `quotes`

Quote session records.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `clienteId` | String | No | |
| `createdAt` | Date | auto | Indexed descending |
| `updatedAt` | Date | auto | |

### 3.17 `tabelas`

Price tables for services (used for table-based pricing instead of API calls).

| Field | Type | Required | Default | Indexed | Notes |
|---|---|---|---|---|---|
| `_id` | ObjectId | auto | auto | Yes | |
| `servicio_Id` | String | Yes | -- | Yes | References service |
| `categoriaEnvio` | **CategoriaEnvio[]** | Yes | -- | No | Price categories |
| `activo` | Boolean | No | `true` | Yes | |
| `version` | String | No | `1.0` | No | Max 20 chars |
| `descripcion` | String | No | -- | No | Max 500 chars |
| `createdAt` | Date | auto | auto | No | |
| `updatedAt` | Date | auto | auto | No | |

**Sub-document: CategoriaEnvio**

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `region` | String | Yes | e.g. `Norte`, `Sul` |
| `origen` | String[] | Yes | Region codes |
| `destino` | String[] | Yes | Region codes |
| `codigo_cat` | String | Yes | Uppercase, e.g. `E4`, `N1` |
| `extra` | Number | Yes | Extra price per additional kg |
| `precios` | RangoPrecio[] | Yes | |

**Sub-document: RangoPrecio**

| Field | Type | Required |
|---|---|---|
| `peso_min` | Number | Yes | Min: 0, in grams |
| `peso_max` | Number | Yes | Min: 1, in grams |
| `precio` | Number | Yes | Min: 0, in BRL |

### 3.18 `provinces`

Brazilian states with CEP ranges -- reference data.

| Field | Type | Required | Notes |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `estado_id` | String | Yes | Unique. e.g. `SP` |
| `nombre_estado` | String | Yes | e.g. `Sao Paulo` |
| `region` | String | Yes | e.g. `Sudeste` |
| `cep_inicio` | String | Yes | e.g. `01000-000` |
| `cep_fin` | String | Yes | e.g. `19999-999` |
| `codigo_estado` | Number | Yes | e.g. `35` |

---

## 4. API ENDPOINTS -- COMPLETE REFERENCE

All paths below are **relative to the gateway base URL** (e.g. `http://localhost:5000`). The gateway prefix is configurable; typical dev setup uses `/v1/api` for hub and `/v1/api/auth` for auth.

### 4.1 Auth Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| A1 | POST | `/v1/api/auth/login` | Public | Login, returns JWT token |

**A1 -- Login**
```
POST /v1/api/auth/login

Body: { "username": string, "password": string }
Response 200: { "token": string }
Response 401: { "error": "Credenciales invalidas" }
Response 403: { "error": "Usuario inactivo" | "Usuario bloqueado temporalmente" }
```

### 4.2 Admin Endpoints (`/admin/*`)

All admin endpoints require **JWT auth** (`Authorization: Bearer <token>`).

#### 4.2.1 Clientes CRUD

| # | Method | Path | Purpose |
|---|---|---|---|
| A1 | GET | `/v1/api/admin/clientes` | List clients (paginated, filtered) |
| A2 | GET | `/v1/api/admin/clientes/:clienteId` | Get client by ID |
| A3 | POST | `/v1/api/admin/clientes` | Create client |
| A4 | PATCH | `/v1/api/admin/clientes/:clienteId` | Update client |
| A5 | PATCH | `/v1/api/admin/clientes/:clienteId/estado` | Activate/deactivate client |
| A6 | DELETE | `/v1/api/admin/clientes/:clienteId` | Soft-delete (deactivate) client |

**A1 -- List Clients**
```
GET /v1/api/admin/clientes?activo=true&tipoCliente=EXTERNO&busqueda=acme&pagina=1&limite=25

Query params:
  activo: boolean (optional)
  tipoCliente: "INTERNO" | "EXTERNO" | "PARTNER" | "CORPORATIVO" (optional)
  busqueda: string, max 100 chars (optional) -- searches nombre, codigoCliente, etc.
  pagina: integer >= 1 (default: 1)
  limite: integer 1-100 (default: 25)

Response 200:
{
  "success": true,
  "data": ICliente[],
  "total": number,
  "pagina": number,
  "limite": number,
  "totalPaginas": number
}
```

**A2 -- Get Client by ID**
```
GET /v1/api/admin/clientes/:clienteId

Params: clienteId = MongoDB ObjectId (24-char hex)

Response 200: { "success": true, "data": ICliente }
```

**A3 -- Create Client**
```
POST /v1/api/admin/clientes

Body:
{
  "codigoCliente": string (required, uppercase, max 50),
  "nombre": string (required, max 200),
  "razonSocial": string (optional, max 200),
  "tipoCliente": "INTERNO" | "EXTERNO" | "PARTNER" | "CORPORATIVO" (required),
  "contacto": {
    "email": string (required, valid email),
    "telefono": string (optional),
    "direccion": string (optional),
    "ciudad": string (optional),
    "estado": string (optional),
    "codigoPostal": string (optional),
    "pais": string (optional, default "BR")
  },
  "numeroDocumento": string (optional),
  "permisos": object (optional),
  "facturacion": {
    "cicloFacturacion": "MENSUAL" | "QUINCENAL" | "SEMANAL" | "POR_ENVIO" (optional),
    "metodoPago": "CREDITO" | "DEBITO" | "TRANSFERENCIA" | "EFECTIVO" (optional),
    "monedaPreferida": string (optional, default "BRL"),
    "descuentoGeneral": number 0-100 (optional),
    "recargoAdministrativo": number (optional),
    "condicionesPago": string (optional)
  },
  "notas": string (optional, max 1000),
  "tags": string[] (optional)
}

Response 201: { "success": true, "data": ICliente, "message": "Cliente creado" }
```

**A4 -- Update Client**
```
PATCH /v1/api/admin/clientes/:clienteId

Body: Same fields as create, all optional, at least 1 required.

Response 200: { "success": true, "data": ICliente }
```

**A5 -- Change Client Status**
```
PATCH /v1/api/admin/clientes/:clienteId/estado

Body: { "activo": boolean (required) }

Response 200: { "success": true, "data": ICliente }
```

**A6 -- Delete Client (Soft)**
```
DELETE /v1/api/admin/clientes/:clienteId

Response 200: { "success": true, "message": "Cliente desactivado" }
```

#### 4.2.2 Operadores CRUD

| # | Method | Path | Purpose |
|---|---|---|---|
| B1 | GET | `/v1/api/admin/operadores` | List operators (paginated) |
| B2 | GET | `/v1/api/admin/operadores/:operadorId` | Get operator by ID |
| B3 | POST | `/v1/api/admin/operadores` | Create operator |
| B4 | PATCH | `/v1/api/admin/operadores/:operadorId` | Update operator |
| B5 | PATCH | `/v1/api/admin/operadores/:operadorId/estado` | Enable/disable/maintenance |
| B6 | PUT | `/v1/api/admin/operadores/:operadorId/cobertura` | Update coverage |

**B1 -- List Operators**
```
GET /v1/api/admin/operadores?plataforma=correios&habilitado=true&pais=BR&busqueda=&pagina=1&limite=25

Query params:
  plataforma: string (optional)
  habilitado: boolean (optional)
  pais: string, max 2, uppercase (optional)
  busqueda: string, max 100 (optional)
  pagina: integer >= 1 (default: 1)
  limite: integer 1-100 (default: 25)

Response 200:
{
  "success": true,
  "data": IOperadorLogistico[],
  "total": number,
  "pagina": number,
  "limite": number,
  "totalPaginas": number
}
```

**B3 -- Create Operator**
```
POST /v1/api/admin/operadores

Body:
{
  "nombre": string (required, max 200),
  "codigo": string (required, uppercase, max 50),
  "plataforma": string (required, lowercase),
  "razonSocial": string (required, max 200),
  "pais": string (required, 2 chars, uppercase),
  "descripcion": string (optional, max 500),
  "numeroDocumento": string (optional),
  "regiones": string[] (optional),
  "website": string (optional, URI),
  "logoUrl": string (optional, URI),
  "configuracion": {
    "baseUrl": string (optional, URI),
    "authType": "API_KEY" | "BASIC" | "OAUTH" | "CUSTOM" (required),
    "credenciales": object (required),
    "timeout": number 1000-300000 (default 30000),
    "maxReintentos": number 0-10 (default 3),
    "headerCustom": object (optional),
    "versionAPI": string (optional)
  },
  "tipoIntegracion": "API" | "TABLA_PRECIOS" | "MANUAL" | "EDI" (required),
  "documentacionAPI": string (optional, URI),
  "cobertura": {
    "nacional": boolean (optional, default true),
    "internacional": boolean (optional, default false),
    "zonasCubiertas": string[] (optional),
    "zonasExcluidas": string[] (optional),
    "cepCubiertos": string[] (optional),
    "cepExcluidos": string[] (optional)
  },
  "contacto": { "nombre": string, "email": string, "telefono": string } (optional),
  "formasPago": ("POSTPAGO"|"PREPAGO"|"CREDITO"|"DEBITO"|"CONTRATO")[] (optional)
}

Response 201: { "success": true, "data": IOperadorLogistico, "message": "Operador creado" }
```

**B5 -- Change Operator Status**
```
PATCH /v1/api/admin/operadores/:operadorId/estado

Body: { "habilitado": boolean, "enMantenimiento": boolean }
At least one of the two fields required.

Response 200: { "success": true, "data": result }
```

**B6 -- Update Coverage**
```
PUT /v1/api/admin/operadores/:operadorId/cobertura

Body:
{
  "cobertura": {
    "nacional": boolean (optional),
    "internacional": boolean (optional),
    "zonasCubiertas": string[] (optional),
    "zonasExcluidas": string[] (optional),
    "cepCubiertos": string[] (optional),
    "cepExcluidos": string[] (optional)
  }
}

Response 200: { "success": true, "data": result }
```

#### 4.2.3 Servicios CRUD

| # | Method | Path | Purpose |
|---|---|---|---|
| C1 | GET | `/v1/api/admin/operadores/:operadorId/servicios` | List services of an operator |
| C2 | GET | `/v1/api/admin/servicios/:servicioId` | Get service by ID |
| C3 | POST | `/v1/api/admin/operadores/:operadorId/servicios` | Create service for operator |
| C4 | PATCH | `/v1/api/admin/servicios/:servicioId` | Update service |
| C5 | PATCH | `/v1/api/admin/servicios/:servicioId/estado` | Change service status/priority |

**C3 -- Create Service**
```
POST /v1/api/admin/operadores/:operadorId/servicios

Body:
{
  "codigoServicio": string (required, max 50),
  "nombre": string (required, max 200),
  "segmento": "EXPRESS" | "STANDARD" | "ECONOMICO" | "PREMIUM" | "OVERNIGHT" (required),
  "tiempoEntregaMin": number (required, integer >= 0),
  "tiempoEntregaMax": number (required, integer >= tiempoEntregaMin),
  "codigoExterno": string (optional),
  "descripcion": string (optional, max 500),
  "corteSolicitud": string (optional),
  "pesoMinimo": number >= 0 (optional),
  "pesoMaximo": number >= 0 (optional),
  "shippingConstraints": object (optional),
  "dimensionesMaximas": object (optional),
  "reversa": "S" | "N" (optional),
  "codigoServicioReversa": string (optional),
  "cobrosAdicionales": CobroAdicional[] (optional),
  "entregaDomicilio": boolean (optional),
  "entregaSabado": boolean (optional),
  "entregaDomingo": boolean (optional),
  "entregaFeriados": boolean (optional),
  "requiereRecogida": boolean (optional),
  "requiereAgendamiento": boolean (optional),
  "soportaLogisticaReversa": boolean (optional),
  "soportaCambioDestino": boolean (optional),
  "soportaReentrega": boolean (optional),
  "requiereSeguro": boolean (optional),
  "aceptaFragil": boolean (optional),
  "aceptaPeligrosos": boolean (optional)
}

Response 201: { "success": true, "data": IServicioOperador, "message": "Servicio creado" }
```

**C5 -- Change Service Status**
```
PATCH /v1/api/admin/servicios/:servicioId/estado

Body: { "activo": boolean, "prioridadUso": number 1-10 }
At least one required.

Response 200: { "success": true, "data": result }
```

#### 4.2.4 Cliente-Operador Relationships

| # | Method | Path | Purpose |
|---|---|---|---|
| D1 | GET | `/v1/api/admin/clientes/:clienteId/operadores` | List assigned operators |
| D2 | POST | `/v1/api/admin/clientes/:clienteId/operadores` | Assign operator to client |
| D3 | PATCH | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId` | Update relationship config |
| D4 | DELETE | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId` | Unassign operator |

**D2 -- Assign Operator**
```
POST /v1/api/admin/clientes/:clienteId/operadores

Body:
{
  "operadorId": string (required, ObjectId),
  "config": {
    "prioridadGeneral": number 1-100 (required),
    "creditoLimite": number >= 0 (optional, default 0),
    "formaPagoPreferida": string (optional),
    "facturacionEspecial": boolean (optional),
    "contactoComercial": { "nombre": string, "email": string, "telefono": string } (optional),
    "contrato": string (optional),
    "numeroCliente": string (optional),
    "descuentoGeneral": number 0-100 (optional),
    "condicionesPago": string (optional)
  }
}

Response 201: { "success": true, "data": result, "message": "Operador asignado al cliente" }
```

**D4 -- Unassign Operator**
```
DELETE /v1/api/admin/clientes/:clienteId/operadores/:operadorId?hardDelete=false

Query: hardDelete: boolean (optional, default false)

Response 200: { "success": true, ... }
```

#### 4.2.5 Cliente-Servicio Relationships

| # | Method | Path | Purpose |
|---|---|---|---|
| E1 | GET | `/v1/api/admin/clientes/:clienteId/servicios` | List assigned services |
| E2 | POST | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId/servicios` | Assign service to client |
| E3 | PATCH | `/v1/api/admin/clientes/:clienteId/servicios/:servicioId` | Update assignment config |
| E4 | DELETE | `/v1/api/admin/clientes/:clienteId/servicios/:servicioId` | Unassign service |
| E5 | POST | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId/servicios/bulk` | Bulk assign all operator services |

**E1 -- List Client Services**
```
GET /v1/api/admin/clientes/:clienteId/servicios?operadorId=optional

Response 200: { "success": true, "data": assignments[], "total": number }
```

**E2 -- Assign Service**
```
POST /v1/api/admin/clientes/:clienteId/operadores/:operadorId/servicios

Body:
{
  "servicioId": string (required, ObjectId),
  "config": {
    "prioridadCliente": number 1-100 (required),
    "habilitado": boolean (optional, default true)
  }
}

Response 201: { "success": true, "data": result, "message": "Servicio asignado al cliente" }
```

**E5 -- Bulk Assign Services**
```
POST /v1/api/admin/clientes/:clienteId/operadores/:operadorId/servicios/bulk

Body:
{
  "prioridadCliente": number 1-100 (required),
  "overwriteExisting": boolean (optional, default false)
}

Response 200: { "success": true, "data": result }
```

#### 4.2.6 Integraciones CRUD

| # | Method | Path | Purpose |
|---|---|---|---|
| F1 | GET | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId/integraciones` | List integrations |
| F2 | POST | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId/integraciones` | Create integration |
| F3 | PATCH | `/v1/api/admin/clientes/:clienteId/operadores/:operadorId/integraciones/:integracionId` | Update integration |

**F2 -- Create Integration**
```
POST /v1/api/admin/clientes/:clienteId/operadores/:operadorId/integraciones

Body:
{
  "apiKey": string (required),
  "secretKey": string (optional),
  "rateLimitPorMinuto": number >= 0 (optional),
  "rateLimitPorHora": number >= 0 (optional),
  "rateLimitPorDia": number >= 0 (optional),
  "ipPermitidas": string[] (optional),
  "webhook": {
    "url": string (optional, URI),
    "eventos": string[] (optional),
    "activo": boolean (optional, default false),
    "secretWebhook": string (optional)
  }
}

Response 201: { "success": true, "data": result, "message": "Integracion creada" }
```

#### 4.2.7 Compound Operations

| # | Method | Path | Purpose |
|---|---|---|---|
| G1 | GET | `/v1/api/admin/clientes/:clienteId/perfil-completo` | Full client profile with all relations |
| G2 | POST | `/v1/api/admin/clientes/:targetId/clonar-config` | Clone config from another client |
| G3 | GET | `/v1/api/admin/operadores/:operadorId/health` | Health check for operator connectivity |

**G2 -- Clone Configuration**
```
POST /v1/api/admin/clientes/:targetId/clonar-config

Body:
{
  "sourceClienteId": string (required, ObjectId),
  "includeOperadores": boolean (optional, default true),
  "includeServicios": boolean (optional, default true),
  "overwriteExisting": boolean (optional, default false)
}

Response 200: { "success": true, "data": result, "message": "Configuracion clonada" }
```

### 4.3 Cotizacion Endpoints

All require `apiKeyAuth` (x-api-key-hub + Bearer token).

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| H1 | POST | `/v1/api/cotizacion/get-cotizacion-hub` | apiKeyAuth | Get quotes from all carriers |
| H2 | POST | `/v1/api/cotizacion/get-cotizacion-hub-compact` | apiKeyAuth | Compact quote format |
| H3 | POST | `/v1/api/cotizacion/get-cotizacion-by-quote` | apiKeyAuth | Get quote by quote_id |

**H1 -- Get Cotizacion Hub**
```
POST /v1/api/cotizacion/get-cotizacion-hub

Body:
{
  "config": {
    "cepOrigem": string|number (required, 5-8 digits),
    "cepDestino": string|number (required, 5-8 digits)
  },
  "products": [
    {
      "id": string (required),
      "name": string (required),
      "psObjeto": number|string (required, weight),
      "comprimento": number|string (required, length),
      "largura": number|string (required, width),
      "altura": number|string (required, height),
      "vlDeclarado": number|string (required, declared value),
      "quantity": number|string (required, integer),
      "groupable": boolean (required),
      "freeShipping": boolean (required),
      "cost_of_goods": number|string (required, >= 0),
      "type": string (required)
    }
  ]
}
```

### 4.4 Prepostagem Endpoints

All require `apiKeyAuth` unless noted.

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| I1 | POST | `/v1/api/prepostagem/create-prepostagem` | apiKeyAuth | Create prepostagem (supports file upload) |
| I2 | GET | `/v1/api/prepostagem/get-prepostagem` | apiKeyAuth | List prepostagems with filters |
| I3 | GET | `/v1/api/prepostagem/get-prepostagem-local` | apiKeyAuth | List prepostagems from local DB |
| I4 | POST | `/v1/api/prepostagem/get-prepostagemfull` | apiKeyAuth | Get full prepostagem details |
| I5 | POST | `/v1/api/prepostagem/delete-prepostagem` | apiKeyAuth | Delete/cancel prepostagem |

**I2 -- List Prepostagems**
```
GET /v1/api/prepostagem/get-prepostagem?status=POSTADO&tipoObjeto=PACOTE&reversa=N&page=0&size=25

Query params:
  id: string (optional)
  status: "PREPOSTADO" | "POSTADO" | "CANCELADO" | "ENTREGUE" | "TODOS" | "EXPIRADO" (optional)
  tipoObjeto: "TODOS" | "PACOTE" | "CARTA" | "ENCOMENDA" (optional)
  reversa: "S" | "N" (optional)
  page: number >= 0 (optional)
  size: number 1-100 (optional)
```

**I5 -- Delete Prepostagem**
```
POST /v1/api/prepostagem/delete-prepostagem

Body: { "idsPrePostagem": string | string[] (required) }
```

### 4.5 Rastro (Tracking) Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| J1 | POST | `/v1/api/rastro/get-rastro` | apiKeyAuth | Get tracking events |
| J2 | POST | `/v1/api/rastro/get-rastro-pub` | Public | Public tracking (no auth) |
| J3 | POST | `/v1/api/rastro/get-rastro-macro` | apiKeyAuth | Get tracking with macro status |

**J1/J2/J3 -- Get Rastro**
```
POST /v1/api/rastro/get-rastro

Body:
{
  "codigosObjetos": string (optional, tracking code),
  "idPrepostagem": string (optional, prepostagem ID),
  "resultado": string (required, e.g. "T" for all, "U" for last)
}
At least one of codigosObjetos or idPrepostagem required.
```

### 4.6 Rotulo (Label) Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| K1 | POST | `/v1/api/rotulo/get-rotulo` | apiKeyAuth | Get shipping label |
| K2 | POST | `/v1/api/rotulo/get-rotulo-test` | apiKeyAuth | Test label generation |
| K3 | POST | `/v1/api/rotulo/get-rotulo-test2` | apiKeyAuth | Test label generation v2 |

**K1 -- Get Rotulo**
```
POST /v1/api/rotulo/get-rotulo

Body: { "idsPrePostagem": string | string[] (required) }
```

### 4.7 Reversa (Returns) Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| L1 | POST | `/v1/api/reversa/create-reversa` | apiKeyAuth | Create reverse logistics order |
| L2 | POST | `/v1/api/reversa/create-reversa-id` | apiKeyAuth | Create reverse by ID |

### 4.8 Contrato Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| M1 | GET | `/v1/api/contrato/get-transportistas` | Public | List available carriers |
| M2 | GET | `/v1/api/contrato/get-transportistas-reversa` | Public | List carriers with reverse support |
| M3 | POST | `/v1/api/contrato/get-servicios` | Public | Get services for a carrier |

### 4.9 Tabelas Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| N1 | POST | `/v1/api/tabelas/get-cotizacion` | Public | Get cotizacion from price table |

### 4.10 V2 Endpoints

Mirror of V1 endpoints under `/v2` prefix. Same auth requirements, same request/response formats.

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| V2-H1 | POST | `/v1/api/v2/cotizacion/get-cotizacion-hub` | apiKeyAuth | V2 quotes |
| V2-H2 | POST | `/v1/api/v2/cotizacion/get-cotizacion-hub-compact` | apiKeyAuth | V2 compact quotes |
| V2-I1 | POST | `/v1/api/v2/prepostagem/create-prepostagem` | apiKeyAuth | V2 create prepostagem |
| V2-I5 | POST | `/v1/api/v2/prepostagem/delete-prepostagem` | apiKeyAuth | V2 delete prepostagem |
| V2-K1 | POST | `/v1/api/v2/rotulo/get-rotulo` | apiKeyAuth | V2 get label |
| V2-J1 | POST | `/v1/api/v2/rastro/get-rastro` | apiKeyAuth | V2 tracking |
| V2-J2 | POST | `/v1/api/v2/rastro/get-rastro-pub` | Public | V2 public tracking |
| V2-J3 | POST | `/v1/api/v2/rastro/get-rastro-macro` | apiKeyAuth | V2 macro tracking |
| V2-L2 | POST | `/v1/api/v2/reversa/create-reversa-id` | apiKeyAuth | V2 reverse by ID |

### 4.11 Utility Endpoints

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| U1 | GET | `/health` | Public | Gateway health check |
| U2 | POST | `/v1/api/optimized-packager/get-optimized-package` | apiKeyAuth | Optimize package dimensions |

---

## 5. BUSINESS DOMAIN

### Key Terms Glossary

| Portuguese Term | English | Description |
|---|---|---|
| **Prepostagem** | Pre-posting | Registering a shipment with the carrier before physically dropping it off. Gets a tracking code. |
| **Rotulo** | Label | Shipping label (PDF) generated for a prepostagem. |
| **Rastro** | Tracking | Tracking events for a shipped object. Each event has a code (e.g. BDE, OEC) and type. |
| **Reversa** | Reverse logistics | Return shipments -- the recipient sends the item back. |
| **Cotizacion** | Quote | Price quote for shipping between two postal codes. |
| **Operador Logistico** | Logistics Operator | A carrier/shipping company (e.g. Correios, SSW). |
| **Servicio** | Service | A shipping service offered by an operator (e.g. SEDEX, PAC). |
| **CEP** | Postal Code | Brazilian postal code (5-8 digits). |
| **CPF/CNPJ** | Tax ID | Brazilian personal (11 digits) or business (14 digits) tax ID. |
| **NFe / Nota Fiscal** | Invoice | Brazilian electronic fiscal note, identified by a 44-digit key. |
| **Tabela** | Price Table | Static price table for services that don't use API-based pricing. |
| **Lote** | Batch | A batch of prepostagems processed together. |
| **UF** | State | Brazilian state code (2 chars, e.g. SP, RJ, MG). |

### Full Shipment Journey

```
1. COTIZACION (Quote)
   Client sends origin CEP, destination CEP, and product dimensions
   --> System returns available services with prices and delivery times
   
2. PREPOSTAGEM (Pre-posting)
   Client creates a pre-posting with sender, recipient, and package details
   --> System registers with carrier (Correios) and returns a tracking code (codigoObjeto)
   
3. ROTULO (Label)
   Client requests a shipping label for the prepostagem
   --> System generates and returns a PDF label URL
   
4. PHYSICAL POSTING
   Client prints label and drops package at carrier facility
   
5. RASTRO (Tracking)
   System polls carrier API (cron at 04:00 and 16:00) for tracking updates
   --> New events are saved to DB and sent to client's webhook
   
6. REVERSA (Return) [Optional]
   If needed, client creates a reverse logistics order
   --> System generates a return label and tracking code
```

### Entity Relationships

```
                    +------------------+
                    |    usuarios      |
                    +--------+---------+
                             |
                    clienteId|
                             |
                    +--------v---------+
         +--------->    clientes       <-----------+
         |          +--------+---------+           |
         |                   |                     |
         |          +--------v---------+  +--------v---------+
         |          |clientes_operadores|  |clientes_servicios |
         |          +--------+---------+  +--------+---------+
         |                   |                     |
         |          operadorId|            servicioId|
         |                   |                     |
         |          +--------v---------+  +--------v---------+
         |          |operadores_logist.|  |servicios_op_log.  |
         |          +--------+---------+  +--------+---------+
         |                   |                     |
         |                   +------ operadorId ---+
         |
    idCliente
         |
+--------v---------+         +------------------+
|   prepostagems    +-------->|     rastro       |
+--------+---------+  codObj +------------------+
         |
         |          +------------------+
         +--------->|     rotulo       |
         |          +------------------+
         |
         |          +------------------+
         +--------->|   nota_fiscal    |
         |          +------------------+
         |
         |          +------------------+
         +--------->|   info_lotes     |
                    +------------------+

+------------------+         +------------------+
|   cotizacion     +-------->|     quotes       |
+--------+---------+         +------------------+
         |
         |          +------------------+
         +--------->|cotizacion_logs   |
                    +------------------+

+------------------+         +------------------+
|    tabelas       +-------->|servicios_op_log. |
+------------------+ serv_Id +------------------+

+------------------+         +------------------+
|   provinces      |         | rastro_estados   |
| (reference data) |         | (mapping table)  |
+------------------+         +------------------+
```

### Carrier System

| Carrier | Platform Key | Status | Capabilities |
|---|---|---|---|
| **Correios** | `correios` | Active | Cotizacion, Prepostagem, Rotulo, Rastro, Reversa |
| **SSW** | `ssw` | Partial | Cancelacion only (limited integration) |

The carrier orchestrator in the hub selects the appropriate carrier implementation based on the operator's `plataforma` field.

### Cron Job: Rastro Polling

| Setting | Value |
|---|---|
| Schedule | `04:00` and `16:00` daily |
| Process | For each active client with a `sendRastros` webhook: poll Correios for each prepostagem, compare with stored events, send new events via webhook |
| Auto-mapping | Unknown Correios event codes are automatically mapped to `rastro_estados` |
| BullMQ | Configured but **not active** -- jobs run directly via node-cron |

---

## 6. ADMIN PANEL SCREENS (Suggested)

### 6.1 Login

- Username + password form
- Store JWT in localStorage/sessionStorage
- Decode JWT to get user permissions (`perfil`)
- No "forgot password" or "register" -- these don't exist in the backend

### 6.2 Dashboard

- **Stats from `estadisticas`:** totalEnvios, enviosUltimoMes, costoTotalFacturado
- Active clients count, active operators count
- Recent prepostagems
- System health (operator connections status)

### 6.3 Clientes (Clients)

- **List:** Paginated table with filters (activo, tipoCliente, busqueda)
- **Detail:** Full client profile -- contact, billing, permissions, statistics
- **Create/Edit:** Form with all client fields
- **Operators tab:** List assigned operators (D1), assign (D2), configure (D3), unassign (D4)
- **Services tab:** List assigned services (E1), assign (E2), bulk assign (E5), configure (E3), unassign (E4)
- **Integrations tab:** Per operator -- API keys, webhooks, rate limits (F1, F2, F3)
- **Full Profile:** Use G1 endpoint for comprehensive view
- **Clone Config:** Use G2 to copy operator/service assignments from another client

### 6.4 Operadores Logisticos (Carriers)

- **List:** Paginated table with filters (plataforma, habilitado, pais)
- **Detail:** Full operator profile -- contact info, capabilities, metrics
- **Create/Edit:** Form with all operator fields
- **Services tab:** List services (C1), create (C3), edit (C4), toggle (C5)
- **Coverage:** Edit coverage zones (B6)
- **Health Check:** G3 endpoint to test operator connectivity
- **Status:** Enable/disable/maintenance mode (B5)

### 6.5 Servicios (Services)

- Accessed through operator detail, or direct lookup by ID (C2)
- Full service configuration including shipping constraints, delivery capabilities, surcharges

### 6.6 Envios / Prepostagems (Shipments)

- **List:** Paginated with status filter (PREPOSTADO, POSTADO, CANCELADO, ENTREGUE, EXPIRADO)
- **Detail:** Full prepostagem data, tracking timeline, label download
- **Tracking:** Real-time tracking events from rastro collection
- **Label:** Download/view rotulo

### 6.7 Cotizaciones (Quotes)

- Search/list quotes by date range
- Quote details with price breakdown
- Volumes and package optimization results

### 6.8 Rastro Estados (Tracking Status Mapping)

- CRUD table for Correios event code mappings
- Fields: codigo, tipo, descricao, categoria, esEstadoFinal, esProblema
- Categories: Entrega, Transferencia, Correcciones, Etiquetas, Pendiente, Salida, Postado

### 6.9 Usuarios (Users)

- **Note:** No CRUD endpoints exist for users in the current API
- User management would need backend endpoints to be added
- Current data: login only, user profiles stored in `usuarios` collection

### 6.10 Configuracion (Settings)

- System-level configuration
- Webhook management per client
- API key generation
- Price table management (`tabelas`)

---

## 7. TYPESCRIPT INTERFACES

Copy-paste ready interfaces for the frontend.

### 7.1 Authentication

```typescript
// ---- Login ----
interface ILoginRequest {
  username: string;
  password: string;
}

interface ILoginResponse {
  token: string;
}

// ---- JWT Payload (decoded from token) ----
interface IJwtPayload {
  id: string;
  clienteId: string;
  username: string;
  email: string;
  perfil: IPerfilUsuario;
  iat: number;
  exp: number;
}
```

### 7.2 Usuario

```typescript
interface IPerfilUsuario {
  administrador: boolean;
  gestorClientes: boolean;
  gestorOperadores: boolean;
  puedeCrearEnvios: boolean;
  puedeConsultarPrecios: boolean;
  puedeRastrearEnvios: boolean;
  puedeGenerarEtiquetas: boolean;
  puedeVerHistorial: boolean;
  puedeExportarReportes: boolean;
  puedeConfigurearServicios: boolean;   // NOTE: typo preserved from backend
  limiteDiarioEnvios?: number;
  limiteMensualEnvios?: number;
  clientesPermitidos?: string[];
  operadoresPermitidos?: string[];
}

interface ISeguridadUsuario {
  requiere2FA: boolean;
  secret2FA?: string;
  codigosRecuperacion?: string[];
  bloqueadoHasta?: Date;
  intentosFallidosLogin: number;
  ultimoCambioPassword: Date;
  historialPasswords?: string[];
  ipUltimoAcceso?: string;
  dispositivosConfiables?: IDispositivoConfiable[];
}

interface IDispositivoConfiable {
  deviceId: string;
  nombre: string;
  fechaRegistro: Date;
  ultimoUso: Date;
}

interface IConfiguracionUsuario {
  idioma: 'es' | 'pt-BR' | 'en';
  timezone: string;
  notificacionesEmail: boolean;
  notificacionesSMS: boolean;
  notificacionesPush: boolean;
  temaOscuro: boolean;
}

interface ISesion {
  sessionId: string;
  deviceInfo: string;
  ip: string;
  userAgent: string;
  fechaCreacion: Date;
  fechaUltimaActividad: Date;
  activa: boolean;
}

interface IUsuario {
  _id: string;
  email: string;
  username?: string;
  password?: string;          // Only present with +password select
  nombre: string;
  apellido?: string;
  telefono?: string;
  avatar?: string;
  clienteId: string;
  departamento?: string;
  cargo?: string;
  perfil: IPerfilUsuario;
  seguridad: ISeguridadUsuario;
  activo: boolean;
  verificado: boolean;
  tokenVerificacion?: string;
  fechaRegistro: Date;
  fechaUltimoAcceso?: Date;
  fechaUltimaActividad?: Date;
  configuracion: IConfiguracionUsuario;
  sesiones?: ISesion[];
  notas?: string;
  tags?: string[];
  creadoPor?: string;
  ultimaModificacionPor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.3 Cliente

```typescript
interface IWebhookCliente {
  url: string;
  eventos: string[];
  activo: boolean;
  codigo: string;
  secretWebhook?: string;
}

interface IContactoCliente {
  email: string;
  telefono?: string;
  direccion?: string;
  ciudad?: string;
  estado?: string;
  codigoPostal?: string;
  pais?: string;
}

interface IIntegracionCliente {
  apiKey?: string;
  secretKey?: string;
  rateLimitPorMinuto?: number;
  rateLimitPorHora?: number;
  rateLimitPorDia?: number;
  ipPermitidas?: string[];
  webhooks?: IWebhookCliente[];
  fechaCreacionAPI?: Date;
  fechaUltimoUso?: Date;
  requestsRealizados?: number;
  activa?: boolean;
}

interface IConfiguracionEnvios {
  zonaOperacion?: string[];
  tiposProducto?: string[];
  volumenMensualEstimado?: number;
  valorPromedioEnvio?: number;
  requiereSeguroObligatorio?: boolean;
  requiereAprobacionEnvios?: boolean;
  notificacionesEmail?: boolean;
  notificacionesSMS?: boolean;
}

interface IPermisosCliente {
  puedeCrearEnvios?: boolean;
  puedeConsultarPrecios?: boolean;
  puedeRastrearEnvios?: boolean;
  puedeGenerarEtiquetas?: boolean;
  puedeVerHistorial?: boolean;
  puedeExportarReportes?: boolean;
  puedeConfigurearServicios?: boolean;   // NOTE: typo preserved from backend
  limiteDiarioEnvios?: number;
  limiteMensualEnvios?: number;
}

interface IEstadisticasCliente {
  totalEnvios?: number;
  enviosUltimoMes?: number;
  costoTotalFacturado?: number;
  costoUltimoMes?: number;
  operadorMasUsado?: string;
  servicioMasUsado?: string;
  zonaMasUsada?: string;
  satisfaccionPromedio?: number;
}

interface IContactoFacturacion {
  nombre?: string;
  email?: string;
  telefono?: string;
}

interface IFacturacionCliente {
  cicloFacturacion?: TipoFacturacion;
  metodoPago?: TipoMetodoPago;
  monedaPreferida?: string;
  descuentoGeneral?: number;
  recargoAdministrativo?: number;
  condicionesPago?: string;
  contactoFacturacion?: IContactoFacturacion;
}

interface IServicioHabilitado {
  servicioId: string;
  codigoServicio: string;
  nombreServicio: string;
  habilitado: boolean;
  fechaActivacion?: Date;
  ultimoUso?: Date;
}

interface IOperadorHabilitado {
  operadorId: string;
  nombreOperador?: string;
  habilitado: boolean;
  prioridadGeneral: number;
  serviciosHabilitados: IServicioHabilitado[];
  fechaActivacion: Date;
  ultimaActualizacion: Date;
}

interface ICliente {
  _id?: string;
  codigoCliente: string;
  nombre: string;
  razonSocial?: string;
  tipoCliente: TipoCliente;
  contacto: IContactoCliente;
  numeroDocumento?: string;
  website?: string;
  industria?: string;
  logoUrl?: string;
  operadoresHabilitados: IOperadorHabilitado[];
  integracion?: IIntegracionCliente;
  configuracionEnvios?: IConfiguracionEnvios;
  permisos?: IPermisosCliente;
  activo: boolean;
  fechaRegistro?: Date;
  fechaUltimoAcceso?: Date;
  fechaUltimoEnvio?: Date;
  estadisticas?: IEstadisticasCliente;
  facturacion?: IFacturacionCliente;
  notas?: string;
  tags?: string[];
  creadoPor?: string;
  ultimaModificacionPor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.4 Operador Logistico

```typescript
interface IContactoOperador {
  email?: string;
  telefono?: string;
  personaContacto?: string;
  horarioAtencion?: string;
  departamento?: string;
}

interface IConfiguracionAPI {
  baseUrl?: string;
  authType: TipoAuthAPI;
  credenciales: Record<string, any>;
  timeout?: number;
  maxReintentos?: number;
  headerCustom?: Record<string, string>;
  versionAPI?: string;
}

interface ICobertura {
  nacional: boolean;
  internacional: boolean;
  zonasCubiertas?: string[];
  zonasExcluidas?: string[];
  cepCubiertos?: string[];
  cepExcluidos?: string[];
}

interface IMetricasOperador {
  tiempoRespuestaPromedio?: number;
  tasaExitoCotizacion?: number;
  tasaExitoTracking?: number;
  cantidadEnviosUltimoMes?: number;
  costoPromedioPorKg?: number;
  satisfaccionCliente?: number;
}

interface IOperadorLogistico {
  _id?: string;
  id?: string;
  nombre: string;
  codigo: string;
  plataforma?: string;
  descripcion?: string;
  razonSocial: string;
  numeroDocumento?: string;
  pais: string;
  regiones: string[];
  website?: string;
  logoUrl?: string;
  contacto?: IContactoOperador;
  contactoSoporte?: IContactoOperador;
  contactoComercial?: IContactoOperador;
  tieneCotizadorOnline: boolean;
  tieneTrackingOnline: boolean;
  tieneGeneracionEtiquetas: boolean;
  soportaWebhooks: boolean;
  soportaNotificacionesSMS: boolean;
  soportaNotificacionesEmail: boolean;
  formasPago: TipoFormaPago[];
  configuracion: IConfiguracionAPI;
  tipoIntegracion: TipoIntegracion;
  documentacionAPI?: string;
  cobertura: ICobertura;
  habilitado: boolean;
  enMantenimiento: boolean;
  prioridad: number;
  fechaUltimaValidacion?: Date;
  estadoConexion: TipoEstadoConexion;
  mensajeEstado?: string;
  metricas?: IMetricasOperador;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.5 Servicio Operador

```typescript
interface IDimensionesMaximas {
  largo: number;
  ancho: number;
  alto: number;
  peso: number;
  unidadPeso: 'kg' | 'g' | 'lb';
  unidadDimension: 'cm' | 'mm' | 'in';
}

interface IMinMax {
  min: number;
  max: number;
}

interface IShippingConstraints {
  length: IMinMax;
  width: IMinMax;
  height: IMinMax;
  sumDimensions: IMinMax;
  physicalWeight: IMinMax;
  volume: IMinMax;
  maxScaleWeight: number;
  defaultVolumetricFactor: number;
  acceptedShippingType: string[];
}

interface ICobroAdicional {
  concepto: string;
  codigo: string;
  tipo: TipoCobroAdicional;
  valor: number;
  condicion?: string;
  obligatorio: boolean;
  activo: boolean;
}

interface IServicioOperador {
  _id?: string;
  operadorId?: string;
  codigoServicio: string;
  codigoExterno?: string;
  nombre: string;
  descripcion?: string;
  segmento: TipoSegmento;
  tiempoEntregaMin: number;
  tiempoEntregaMax: number;
  corteSolicitud?: string;
  pesoMinimo?: number;
  pesoMaximo?: number;
  dimensionesMaximas?: IDimensionesMaximas;
  valorMaximoDeclarado?: number;
  shippingConstraints?: IShippingConstraints;
  entregaDomicilio: boolean;
  entregaSabado: boolean;
  entregaDomingo: boolean;
  entregaFeriados: boolean;
  requiereRecogida: boolean;
  requiereAgendamiento: boolean;
  soportaLogisticaReversa: boolean;
  soportaCambioDestino: boolean;
  soportaReentrega: boolean;
  requiereSeguro: boolean;
  aceptaFragil: boolean;
  aceptaPeligrosos: boolean;
  prioridadUso: number;
  configuracionEspecial?: Record<string, any>;
  cobrosAdicionales?: ICobroAdicional[];
  reversa: 'S' | 'N';
  codigoServicioReversa?: string;
  fechaCreacion: Date;
  ultimaActualizacion: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.6 Junction Tables

```typescript
// ---- Cliente-Operador ----
interface IConfigCO {
  habilitado: boolean;
  prioridadGeneral: number;
  creditoLimite?: number;
  formaPagoPreferida?: string;
  facturacionEspecial?: boolean;
  contactoComercial?: {
    nombre?: string;
    email?: string;
    telefono?: string;
  };
  contrato?: string;
  numeroCliente?: string;
  descuentoGeneral?: number;
  condicionesPago?: string;
  fechaActivacion: Date;
  ultimaActualizacion: Date;
}

interface IIntegracionCO {
  _id?: string;
  apiKey: string;
  secretKey?: string;
  rateLimitPorMinuto?: number;
  rateLimitPorHora?: number;
  rateLimitPorDia?: number;
  ipPermitidas?: string[];
  webhook?: {
    url?: string;
    eventos?: string[];
    activo?: boolean;
    secretWebhook?: string;
  };
  fechaCreacionAPI: Date;
  fechaUltimoUso?: Date;
  requestsRealizados?: number;
  activa: boolean;
}

interface IClienteOperador {
  _id?: string;
  clienteId: string;
  operadorId: string;
  config: IConfigCO;
  integracion: IIntegracionCO[];
  creadoPor?: string;
  ultimaModificacionPor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ---- Cliente-Servicio ----
interface IConfigCS {
  habilitado: boolean;
  prioridadCliente: number;
  fechaActivacion?: Date;
  ultimoUso?: Date;
}

interface IClienteServicio {
  _id?: string;
  clienteId: string;
  operadorId: string;
  servicioId: string;
  config: IConfigCS[];
  creadoPor?: string;
  ultimaModificacionPor?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.7 Prepostagem

```typescript
interface IAddress {
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  cep: string;
  uf: string;
}

interface IPersona {
  nome: string;
  cpfCnpj: string;
  email?: string;
  endereco: IAddress;
}

type ISNFlag = 'S' | 'N';

interface IPrepostagem {
  _id?: string;
  id: string;
  idCliente?: string;
  idLote?: string;
  idVolume?: string;
  remetente: IPersona;
  destinatario: IPersona;
  codigoObjeto: string;
  codigoServico: string;
  servico: string;
  numeroNotaFiscal: string;
  itensDeclaracaoConteudo: unknown[];
  pesoInformado: number;
  alturaInformada: number;
  larguraInformada: number;
  comprimentoInformado: number;
  statusAtual: number;
  dataHoraStatusAtual: Date;
  descStatusAtual: string;
  codigoFormatoObjetoInformado: string;
  numeroCartaoPostagem: string;
  dataHora: Date;
  cienteObjetoNaoProibido: number;
  tipoRotulo: string;
  modalidadePagamento: number;
  idCorreios: string;
  chaveNFe: string;
  solicitarColeta: ISNFlag;
  reciboSolicitacaoAssincrona: string;
  codigoFormatoObjetoPreAfericao: string;
  alturaPreAfericao: number;
  larguraPreAfericao: number;
  comprimentoPreAfericao: number;
  diametroPreAfericao: number;
  pesoPreAfericao: number;
  dataHoraPreAfericao: Date;
  mcuUnidadePreAfericao: string;
  idBalancaCubagem: string;
  cepDestinoPreAfericao: string;
  tipoObjeto: string;
  logisticaReversa: ISNFlag;
  prazoPostagem: Date;
  prazoEntrega?: number;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.8 Cotizacion

```typescript
interface IServicoAdicional {
  coServAdicional: string;
  tpServAdicional: string;
  pcServicoAdicional: number;
}

interface IPreco {
  pcBase: number;
  pcBaseGeral: number;
  peVariacao: number;
  pcReferencia: number;
  vlBaseCalculoImposto: number;
  inPesoCubico: 'S' | 'N';
  psCobrado: number;
  peAdValorem: number;
  vlSeguroAutomatico: number;
  qtAdicional: number;
  pcFaixa: number;
  pcFaixaVariacao: number;
  pcProduto: number;
  pcFinal: number;
  servicoAdicional?: IServicoAdicional[];
  pcTotalServicosAdicionais?: number;
}

interface IPrazo {
  prazoEntrega: number;
  dataMaxima: string;
  entregaDomiciliar: 'S' | 'N';
  entregaSabado: 'S' | 'N';
  entregaDomingo: 'S' | 'N';
  msgPrazo: string;
}

interface ITransportista {
  codigo: string;
  descricao: string;
  coSegmento: string;
  descSegmento: string;
}

interface ICotizacion {
  _id?: string;
  coProduto: string;
  nuRequisicao: string;
  cepOrigem: string;
  cepDestino: string;
  preco: IPreco;
  prazo: IPrazo | null;
  transportista: ITransportista | null;
  quote_id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.9 Rastro

```typescript
interface IEnderecoRastro {
  cep?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  uf: string;
}

interface IUnidade {
  codSro?: string;
  tipo: string;
  endereco: IEnderecoRastro;
}

interface IEventoRastro {
  _id?: string;
  idsPrePostagem: string;
  codObjeto: string;
  codigo: string;
  tipo: string;
  dtHrCriado: Date;
  descricao: string;
  detalhe?: string;
  comentario?: string;
  unidade: IUnidade;
  unidadeDestino?: IUnidade;
  dtLimiteRetirada?: Date;
  codLista?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.10 Rastro Estado

```typescript
enum CategoriaEstadoRastro {
  ENTREGA = 'Entrega',
  TRANSFERENCIA = 'Transferencia',
  CORRECCIONES = 'Correcciones',
  ETIQUETAS = 'Etiquetas',
  PENDIENTE = 'Pendiente',
  SALIDA = 'Salida',
  POSTADO = 'Postado',
}

interface IRastroEstado {
  _id?: string;
  codigo: string;
  tipo: string;
  descricao: string;
  categoria: CategoriaEstadoRastro;
  codigoMacro?: string;
  retornable?: boolean;
  esEstadoFinal?: boolean;
  esProblema?: boolean;
  prioridad?: number;
  activo: boolean;
  observaciones?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.11 Rotulo

```typescript
interface IRotulo {
  _id?: string;
  idsPrePostagem: string;
  idRecibo: string;
  nome: string;
  link: string;
  tipoRotulo: string;
  formatoRotulo: string;
  valido: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.12 Supporting Types

```typescript
interface INotaFiscal {
  _id?: string;
  name: string;
  idsPrePostagem: string[] | null;
  url: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IQuotes {
  _id?: string;
  clienteId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface IProvinces {
  _id?: string;
  estado_id: string;
  nombre_estado: string;
  region: string;
  cep_inicio: string;
  cep_fin: string;
  codigo_estado: number;
}

interface IRangoPrecio {
  peso_min: number;
  peso_max: number;
  precio: number;
}

interface ICategoriaEnvio {
  _id?: string;
  region: string;
  origen: string[];
  destino: string[];
  codigo_cat: string;
  extra: number;
  precios: IRangoPrecio[];
}

interface ITabelas {
  _id?: string;
  servicio_Id: string;
  categoriaEnvio: ICategoriaEnvio[];
  activo?: boolean;
  version?: string;
  descripcion?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
```

### 7.13 Enums

```typescript
type TipoCliente = 'INTERNO' | 'EXTERNO' | 'PARTNER' | 'CORPORATIVO';

type TipoFacturacion = 'MENSUAL' | 'QUINCENAL' | 'SEMANAL' | 'POR_ENVIO';

type TipoMetodoPago = 'CREDITO' | 'DEBITO' | 'TRANSFERENCIA' | 'EFECTIVO';

type TipoFormaPago = 'POSTPAGO' | 'PREPAGO' | 'CREDITO' | 'DEBITO' | 'CONTRATO';

type TipoAuthAPI = 'API_KEY' | 'BASIC' | 'OAUTH' | 'CUSTOM';

type TipoIntegracion = 'API' | 'TABLA_PRECIOS' | 'MANUAL' | 'EDI';

type TipoEstadoConexion = 'ACTIVA' | 'INACTIVA' | 'ERROR' | 'MANTENIMIENTO';

type TipoSegmento = 'EXPRESS' | 'STANDARD' | 'ECONOMICO' | 'PREMIUM' | 'OVERNIGHT';

type TipoCobroAdicional = 'FIJO' | 'PORCENTUAL' | 'POR_KG' | 'POR_KM' | 'POR_VOLUMEN';

type ISNFlag = 'S' | 'N';

type TipoStatusPrepostagem = 'PREPOSTADO' | 'POSTADO' | 'CANCELADO' | 'ENTREGUE' | 'EXPIRADO' | 'TODOS';

type TipoObjeto = 'TODOS' | 'PACOTE' | 'CARTA' | 'ENCOMENDA';

type TipoFormatoObjeto = '1' | '2' | '3';  // 1=box, 2=cylinder, 3=envelope

type IdiomaUsuario = 'es' | 'pt-BR' | 'en';
```

### 7.14 API Response Wrappers

```typescript
// Standard success response
interface IApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

// Paginated response
interface IPaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

// List response (non-paginated)
interface IListResponse<T> {
  success: true;
  data: T[];
  total: number;
}

// Error response
interface IApiError {
  error: string;
  isInternal?: boolean;
}
```

---

## 8. KNOWN ISSUES & GAPS

### Authentication & Security

1. **Gateway auth middleware is commented out.** Line 135 in gateway app.ts: `//app.use(AuthMiddleware);` with comment `<<<-- arreglar`. The auth middleware exists but is not active -- authentication is handled per-route in the hub.

2. **No password reset endpoint.** Users cannot reset their password via API. Must be done directly in the database.

3. **No user registration endpoint.** Users must be created directly in MongoDB.

4. **No token refresh mechanism.** Token expires after 24h and user must re-login. No refresh token flow.

5. **CORS allows all origins in development.** When `NODE_ENV === 'development'`, CORS origin is set to `true` (all origins allowed).

6. **JWT secret has hardcoded fallback.** Default is `your-secret-key-change-in-production`.

### Data Model

7. **IUsuario interface has fields not in schema.** The interface defines `auditoria`, `notas`, and `tags` fields that don't exist in the Mongoose schema. These will never be populated by the DB.

8. **Typo: `puedeConfigurearServicios`.** Should be `puedeConfigurarServicios`. Present in both usuario and cliente schemas. Must be kept as-is to match backend.

9. **ICliente_Operator.config is typed as array in interface but Object in schema.** The interface says `config: IConfig[]` but the schema uses a single Config subdocument (not an array). The actual behavior is a single config object.

### Infrastructure

10. **BullMQ configured but not active.** Redis/BullMQ is set up in ae-cron but jobs run via direct node-cron scheduling, not through the queue.

11. **SSW carrier has limited integration.** Only cancelation is implemented for SSW; other operations (cotizacion, prepostagem, etc.) are Correios-only.

12. **No user CRUD admin endpoints.** The admin API covers clientes, operadores, and servicios, but there are no endpoints for managing users. User management would need to be added to the backend.

13. **`getMe` and `verifyToken` are dead code.** These functions exist in the auth service but have no routes pointing to them.

14. **Rate limiting is per-IP only.** No per-client or per-API-key rate limiting is implemented (only global gateway-level).

### Cron System

15. **Cron runs on fixed schedule only.** Tracking updates happen twice daily (04:00 and 16:00). There is no on-demand tracking refresh API.

16. **Auto-mapping of unknown Correios events.** New event codes are automatically created in `rastro_estados` if not found. These may need manual review for correct `categoria` and flags.
