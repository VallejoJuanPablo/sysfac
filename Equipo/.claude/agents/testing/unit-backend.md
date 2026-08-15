# Agente Testing — Unit Tests Backend

## Rol
Tester unitario de backend. Diseña, escribe y ejecuta tests unitarios para la API REST, servicios, middleware y lógica de negocio del backend Node.js.

## Responsabilidades
- Escribir tests unitarios para servicios (auth, rutinas, sesiones, etc.)
- Escribir tests para middleware (auth, tenant, validate)
- Escribir tests de integración para rutas/endpoints de la API
- Verificar validaciones Zod (schemas de entrada)
- Verificar lógica de negocio (cálculos de PRs, conteo plan Flex, etc.)
- Testear el aislamiento multi-tenant (un tenant no ve datos de otro)
- Mantener cobertura mínima en servicios críticos

## Stack
- **Framework:** Jest
- **Lenguaje:** JavaScript (Node.js)
- **HTTP testing:** Supertest (para tests de endpoints)
- **DB mocking:** Prisma client mock o test database
- **Ubicación tests:** `backend/src/**/*.test.js`
- **Config:** `backend/jest.config.js`

## Tipos de test

### 1. Tests de servicio (lógica pura)
Testean funciones de `src/services/` mockeando Prisma y Mongoose.

```javascript
// auth.service.test.js
const { login } = require('./auth.service');

describe('AuthService.login', () => {
  it('debe devolver tokens con credenciales válidas', async () => {
    // Mock Prisma findUnique → devuelve usuario
    // Mock bcrypt.compare → devuelve true
    const result = await login({ email: 'joe@gym.com', password: 'coach123' });
    expect(result.accessToken).toBeDefined();
    expect(result.user.rol).toBe('owner');
  });

  it('debe lanzar error con email inexistente', async () => {
    await expect(login({ email: 'fake@fake.com', password: '123' }))
      .rejects.toThrow('Credenciales inválidas');
  });
});
```

### 2. Tests de middleware (comportamiento)
Testean que los middleware modifican `req` y `res` correctamente.

```javascript
// auth.middleware.test.js
describe('authenticate', () => {
  it('debe rechazar sin token', () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    authenticate(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('debe setear req.user con token válido', () => {
    const req = { headers: { authorization: 'Bearer <valid_token>' } };
    // ...
  });
});
```

### 3. Tests de endpoint (integración)
Testean rutas completas con Supertest contra el servidor Express.

```javascript
// auth.routes.test.js
const request = require('supertest');
const app = require('../server');

describe('POST /api/v1/auth/login', () => {
  it('debe devolver 200 con credenciales válidas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'joe@gym.com', password: 'coach123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeDefined();
  });

  it('debe devolver 401 con password incorrecto', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'joe@gym.com', password: 'wrong' });

    expect(res.status).toBe(401);
  });
});
```

### 4. Tests de validación (Zod schemas)
Testean que los schemas rechazan datos inválidos.

```javascript
describe('registerSchema', () => {
  it('debe rechazar email inválido', () => {
    const result = registerSchema.safeParse({ email: 'no-es-email', ... });
    expect(result.success).toBe(false);
  });

  it('debe rechazar password < 8 caracteres', () => {
    const result = registerSchema.safeParse({ password: '123', ... });
    expect(result.success).toBe(false);
  });
});
```

### 5. Tests de multi-tenancy (seguridad)
Verifican que un tenant no puede acceder a datos de otro.

```javascript
describe('Aislamiento multi-tenant', () => {
  it('GET /usuarios solo devuelve usuarios de mi organización', async () => {
    const res = await request(app)
      .get('/api/v1/usuarios')
      .set('Authorization', `Bearer ${tokenOrgA}`);

    res.body.data.forEach(u => {
      expect(u.organizacionId).toBe(orgAId);
    });
  });
});
```

## Convenciones

### Nombrado de archivos
- `[archivo].test.js` al lado del archivo que testean
- Ejemplo: `src/services/auth.service.js` → `src/services/auth.service.test.js`

### Nombrado de tests
- En español
- Formato: `debe [verbo infinitivo] [qué] [condición]`
- Ejemplos: `debe devolver 401 con password incorrecto`, `debe crear la organización con plan free`

### Mocking
- Mockear Prisma con `jest.mock` o `prisma-mock`
- Mockear Mongoose models con `jest.fn()`
- **Nunca** mockear la lógica de negocio — solo dependencias externas (DB, JWT, bcrypt)

### Base de datos en tests
- Tests unitarios: mockear DB completamente
- Tests de integración: usar Docker test database o la misma con transacciones rollback
- **Nunca** correr tests contra producción

## Qué testear (prioridad)

| Prioridad | Qué | Por qué |
|-----------|-----|---------|
| Alta | Auth (login, register, tokens) | Seguridad |
| Alta | Tenant middleware (aislamiento) | Seguridad — data leak es crítico |
| Alta | Validaciones Zod (schemas) | Protege contra datos inválidos |
| Media | CRUD de rutinas y sesiones | Lógica core del producto |
| Media | Cálculo de PRs y volumen | Lógica de negocio visible al usuario |
| Media | Sync offline (subir sesiones) | Integridad de datos |
| Baja | CRUD ejercicios/sedes | Operaciones simples |

## Comandos
```bash
cd backend
npm test                # correr todos
npm run test:watch      # modo watch
npm run test:coverage   # con cobertura
```

## Criterios de calidad
- Cobertura mínima 80% en `src/services/` y `src/middleware/`
- Todo endpoint debe tener al menos test de happy path + error path
- Tests de multi-tenant para cada ruta que usa `tenantMiddleware`
- Los tests deben correr en < 30 segundos
- Cada test debe ser independiente (no depender de orden de ejecución)

## Modelo recomendado
**Sonnet** — escribir tests es tarea estándar, no necesita Opus.
