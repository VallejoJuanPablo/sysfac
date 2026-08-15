# Guia de Deploy — n8n en VPS (mismo servidor que Braillin)

> Agregar n8n al VPS que ya tiene Traefik + Portainer funcionando.
> Incluye: MySQL para archie_team + coach, archie-db-server, n8n con dominio fijo y SSL automatico.
> Se elimina la dependencia de Cloudflare Tunnel — Traefik maneja todo.

---

## Indice

1. [Arquitectura en el VPS](#1-arquitectura-en-el-vps)
2. [Prerequisitos](#2-prerequisitos)
3. [Elegir dominio para n8n](#3-elegir-dominio-para-n8n)
4. [Estructura de archivos](#4-estructura-de-archivos)
5. [Crear el .env](#5-crear-el-env)
6. [Crear el schema SQL](#6-crear-el-schema-sql)
7. [Crear el Dockerfile del db-server](#7-crear-el-dockerfile-del-db-server)
8. [Crear el docker-compose.yml](#8-crear-el-docker-composeyml)
9. [Configurar DNS](#9-configurar-dns)
10. [Levantar todo](#10-levantar-todo)
11. [Importar workflows de n8n](#11-importar-workflows-de-n8n)
12. [Configurar credenciales en n8n](#12-configurar-credenciales-en-n8n)
13. [Actualizar webhook de Telegram](#13-actualizar-webhook-de-telegram)
14. [Verificacion post-deploy](#14-verificacion-post-deploy)
15. [Mantenimiento](#15-mantenimiento)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. Arquitectura en el VPS

```
Internet
    |
    v
[ Traefik :80/:443 ]  (ya instalado)
    |
    |── braillin.com.ar ────> [ braillin-web + api + db ]  (ya funcionando)
    |
    |── n8n.bowin.com.ar ─> [ n8n ]          n8n (workflows + webhooks)
    |                               |
    |                          [ archie-db-srv ] Node.js API intermedia
    |                               |
    |                          [ archie-db ]     MySQL 8 (archie_team + coach)
    |
    |── portainer.xxx ────────> [ portainer ]    (ya funcionando)
```

### Que cambia respecto al setup local

| Aspecto | Local (actual) | VPS (produccion) |
|---------|---------------|-----------------|
| Acceso publico | Cloudflare Quick Tunnel (URL cambia cada vez) | Dominio fijo con SSL (Traefik) |
| MySQL | XAMPP local :3306 | Container Docker propio |
| archie-db-server | Proceso Node.js manual | Container Docker |
| n8n | `docker run` manual | docker-compose con restart |
| Webhook URL | Hay que actualizar cada reinicio | Fija, nunca cambia |

### Ventaja principal

**Se elimina Cloudflare Tunnel.** Con un dominio fijo, el webhook de Telegram apunta siempre al mismo lugar. No hay que actualizar la URL nunca mas.

---

## 2. Prerequisitos

Antes de empezar, verificar que esto ya existe en el VPS:

```bash
# Docker funcionando
docker ps

# Traefik corriendo
docker ps | grep traefik

# Red proxy creada
docker network ls | grep proxy
```

Si algo falla, seguir primero la guia de deploy de Braillin (secciones 3-6).

---

## 3. Elegir dominio para n8n

Necesitas un subdominio para n8n. Opciones:

| Subdominio | Notas |
|------------|-------|
| `n8n.bowin.com.ar` | Si usas el dominio de Braillin |
| `auto.tu-dominio.com` | Si tenes otro dominio |

**Decidi el dominio ahora** — se usa en el `.env`, en las labels de Traefik, y en el webhook de Telegram.

> **Recordatorio:** Verificar el TLD real del dominio (`.com`, `.com.ar`, etc.) antes de configurar.

---

## 4. Estructura de archivos

```bash
mkdir -p /opt/docker/n8n
mkdir -p /opt/docker/n8n/db-server
mkdir -p /opt/docker/n8n/init-sql
```

Estructura final:

```
/opt/docker/n8n/
├── docker-compose.yml
├── .env
├── init-sql/
│   ├── 01-schema.sql          <-- Tablas archie_team + coach
│   └── 02-seed.sql            <-- Datos iniciales (proyectos)
└── db-server/
    ├── Dockerfile
    ├── package.json
    └── server.js              <-- archie-db-server adaptado para Docker
```

---

## 5. Crear el .env

```bash
nano /opt/docker/n8n/.env
```

```env
# === DOMINIO (cambiar al real) ===
N8N_DOMAIN=n8n.bowin.com.ar

# === MySQL ===
MYSQL_ROOT_PASSWORD=GENERAR_CON_openssl_rand_hex_32
MYSQL_USER=archie_prod
MYSQL_PASSWORD=GENERAR_CON_openssl_rand_hex_32

# === n8n ===
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=PASSWORD_PARA_LOGIN_N8N
N8N_ENCRYPTION_KEY=GENERAR_CON_openssl_rand_hex_32
GENERIC_TIMEZONE=America/Argentina/Buenos_Aires

# === Telegram Bot ===
TELEGRAM_BOT_TOKEN=8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA
```

Generar las passwords:

```bash
# Ejecutar 3 veces (root MySQL, user MySQL, encryption key)
openssl rand -hex 32
```

> **Importante:** Usar `openssl rand -hex 32` (no base64) para evitar caracteres especiales que rompan URLs.

Proteger el archivo:

```bash
chmod 600 /opt/docker/n8n/.env
```

---

## 6. Crear el schema SQL

### 6.1 Schema de tablas

```bash
nano /opt/docker/n8n/init-sql/01-schema.sql
```

```sql
-- ============================================
-- Base: archie_team (pendientes + chat states)
-- ============================================
CREATE DATABASE IF NOT EXISTS archie_team
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE archie_team;

CREATE TABLE IF NOT EXISTS proyectos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        CHAR(6)      NOT NULL UNIQUE,
  nombre        VARCHAR(100) NOT NULL,
  ruta          VARCHAR(300) NOT NULL,
  stack         VARCHAR(300) DEFAULT NULL,
  estado        VARCHAR(100) DEFAULT 'Registrado',
  ultima_sesion DATE         DEFAULT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pendientes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id   INT          NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  descripcion   TEXT,
  tipo          ENUM('spec','fix','mejora','investigacion') DEFAULT 'spec',
  prioridad     ENUM('alta','media','baja') DEFAULT 'media',
  estado        ENUM('pendiente','en_curso','completado','descartado') DEFAULT 'pendiente',
  fuente        VARCHAR(50)  DEFAULT 'manual',
  spec_id       VARCHAR(20)  DEFAULT NULL,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pendientes_proyecto FOREIGN KEY (proyecto_id) REFERENCES proyectos(id)
);

CREATE TABLE IF NOT EXISTS chat_states (
  chat_id       BIGINT PRIMARY KEY,
  proyecto_id   INT,
  titulo        VARCHAR(200),
  descripcion   TEXT,
  step          VARCHAR(20),
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- Base: coach (ejercicios diarios)
-- ============================================
CREATE DATABASE IF NOT EXISTS coach
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE coach;

CREATE TABLE IF NOT EXISTS coach_users (
  chat_id       BIGINT PRIMARY KEY,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coach_log (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  chat_id       BIGINT NOT NULL,
  ejercicio     VARCHAR(100) NOT NULL,
  fecha         DATE NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_fecha (chat_id, fecha)
);

-- Dar permisos al usuario de produccion sobre ambas bases
GRANT ALL PRIVILEGES ON archie_team.* TO 'archie_prod'@'%';
GRANT ALL PRIVILEGES ON coach.* TO 'archie_prod'@'%';
FLUSH PRIVILEGES;
```

### 6.2 Seed de proyectos

```bash
nano /opt/docker/n8n/init-sql/02-seed.sql
```

```sql
USE archie_team;

INSERT IGNORE INTO proyectos (codigo, nombre, ruta, stack, estado, ultima_sesion) VALUES
('7G4P1S', 'GymPulse',          '../Personal/GymPulse',                       'Angular 18 + Node/Express + MySQL + MongoDB', 'En desarrollo', '2026-05-27'),
('L2V8RO', 'LavaderoOs',        '../Personal/LavaderoOs',                     'Angular 17 + Node/Express + MySQL',           'En análisis',   '2026-06-20'),
('D3B9MF', 'IL017-broker',      '../Idoneo/IL017-broker-manager-frontend',    'Angular 17 + Material + SSR',                 'Activo',        '2026-07-10'),
('A4E6NV', 'AgroEnvios',        '../Macro/ECO AGROENVIOS',                    'Node 22 + TS + Express + MongoDB + AWS',      'Registrado',    '2026-06-25'),
('B5R1LN', 'Braillin',          '../Personal/Braillin',                       'Angular 18 + Node/Express + MySQL + PrimeNG', 'Produccion',    '2026-07-12'),
('M6T3LC', 'microTelco',        '../Personal/microTelco',                     'NestJS + Angular 19 + MongoDB + Socket.IO',   '7 fases',       '2026-06-08'),
('F7K8IT', 'FrontKit',          '../Personal/FrontKit',                       'Angular 20 + Tailwind CSS 4',                 '271 componentes','2026-06-26'),
('A8P2NL', 'AgroEnvioPanel',    '../Macro/AgroEnvioPanel',                    'Angular 19 + Tailwind CSS 4',                 '7 fases + RBAC','2026-06-26'),
('R9C4TM', 'ArchieTeam',        '../Personal/ArchieTeam',                     'Angular 19 + Tailwind CSS 4',                 'MVP completo',  '2026-06-10'),
('D0N7TS', 'Dentos',            '../Personal/Dentos',                         'Angular 18 + Material / Laravel 10',          'Registrado',    '2026-06-18');
```

---

## 7. Crear el Dockerfile del db-server

### 7.1 package.json

```bash
nano /opt/docker/n8n/db-server/package.json
```

```json
{
  "name": "archie-db-server",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "mysql2": "^3.14.0"
  }
}
```

### 7.2 server.js (adaptado para Docker)

```bash
nano /opt/docker/n8n/db-server/server.js
```

```javascript
/**
 * Archie DB Server — version Docker
 * Conecta con MySQL via variables de entorno
 * Puerto: 3456
 */

const http = require('http');
const mysql = require('mysql2/promise');

const PORT = 3456;

const MYSQL_HOST = process.env.MYSQL_HOST || 'archie-db';
const MYSQL_USER = process.env.MYSQL_USER || 'archie_prod';
const MYSQL_PASS = process.env.MYSQL_PASSWORD || '';

const pool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASS,
  database: 'archie_team',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

const coachPool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASS,
  database: 'coach',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});

async function handleAction(body) {
  const { action } = body;

  switch (action) {
    case 'read_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const [stateRows] = await pool.query('SELECT step, proyecto_id, titulo, IFNULL(descripcion,"") AS descripcion FROM chat_states WHERE chat_id = ?', [chatId]);
      const [projRows] = await pool.query('SELECT id, codigo, nombre FROM proyectos ORDER BY nombre');
      return { state: stateRows[0] || null, projects: projRows };
    }

    case 'save_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const projId = parseInt(body.proyecto_id) || 0;
      const step = body.step || '';
      await pool.query('REPLACE INTO chat_states (chat_id, proyecto_id, step) VALUES (?, ?, ?)', [chatId, projId, step]);
      return { ok: true };
    }

    case 'update_state': {
      const chatId = parseInt(body.chat_id) || 0;
      const sets = [];
      const vals = [];
      if (body.titulo !== undefined) { sets.push('titulo = ?'); vals.push(body.titulo); }
      if (body.descripcion !== undefined) { sets.push('descripcion = ?'); vals.push(body.descripcion); }
      if (body.step !== undefined) { sets.push('step = ?'); vals.push(body.step); }
      if (sets.length > 0) {
        vals.push(chatId);
        await pool.query(`UPDATE chat_states SET ${sets.join(', ')} WHERE chat_id = ?`, vals);
      }
      return { ok: true };
    }

    case 'insert_pendiente': {
      const projId = parseInt(body.proyecto_id) || 0;
      const titulo = body.titulo || '';
      const descripcion = body.descripcion || '';
      const tipo = body.tipo || 'spec';
      const prioridad = body.prioridad || 'media';
      const fuente = body.fuente || 'telegram';
      const chatId = parseInt(body.chat_id) || 0;
      const [result] = await pool.query(
        'INSERT INTO pendientes (proyecto_id, titulo, descripcion, tipo, prioridad, fuente) VALUES (?, ?, ?, ?, ?, ?)',
        [projId, titulo, descripcion, tipo, prioridad, fuente]
      );
      if (chatId) {
        await pool.query('DELETE FROM chat_states WHERE chat_id = ?', [chatId]);
      }
      return { ok: true, id: result.insertId };
    }

    case 'delete_state': {
      const chatId = parseInt(body.chat_id) || 0;
      await pool.query('DELETE FROM chat_states WHERE chat_id = ?', [chatId]);
      return { ok: true };
    }

    // ---- Coach ----
    case 'coach_panel': {
      const chatId = parseInt(body.chat_id) || 0;
      await coachPool.query('INSERT IGNORE INTO coach_users (chat_id) VALUES (?)', [chatId]);
      const [rows] = await coachPool.query(
        'SELECT ejercicio FROM coach_log WHERE chat_id = ? AND fecha = CURDATE()',
        [chatId]
      );
      return { done: rows.map(r => r.ejercicio) };
    }

    case 'coach_toggle': {
      const chatId = parseInt(body.chat_id) || 0;
      const ejercicio = body.ejercicio || '';
      const [existing] = await coachPool.query(
        'SELECT id FROM coach_log WHERE chat_id = ? AND ejercicio = ? AND fecha = CURDATE()',
        [chatId, ejercicio]
      );
      if (existing.length > 0) {
        await coachPool.query('DELETE FROM coach_log WHERE id = ?', [existing[0].id]);
      } else {
        await coachPool.query(
          'INSERT INTO coach_log (chat_id, ejercicio, fecha) VALUES (?, ?, CURDATE())',
          [chatId, ejercicio]
        );
      }
      const [rows] = await coachPool.query(
        'SELECT ejercicio FROM coach_log WHERE chat_id = ? AND fecha = CURDATE()',
        [chatId]
      );
      return { done: rows.map(r => r.ejercicio) };
    }

    case 'coach_summary': {
      const chatId = parseInt(body.chat_id) || 0;
      const [rows] = await coachPool.query(
        `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') as fecha, GROUP_CONCAT(ejercicio) as ejercicios
         FROM coach_log
         WHERE chat_id = ? AND fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY fecha ORDER BY fecha`,
        [chatId]
      );
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const fecha = d.toISOString().split('T')[0];
        const row = rows.find(r => r.fecha === fecha);
        days.push({ fecha, ejercicios: row ? row.ejercicios.split(',') : [] });
      }
      return { days };
    }

    case 'coach_get_users_today': {
      const [rows] = await coachPool.query(
        `SELECT u.chat_id, GROUP_CONCAT(l.ejercicio) as ejercicios
         FROM coach_users u
         LEFT JOIN coach_log l ON u.chat_id = l.chat_id AND l.fecha = CURDATE()
         GROUP BY u.chat_id`
      );
      const reminders = rows.map(r => ({
        chat_id: r.chat_id,
        done: r.ejercicios ? r.ejercicios.split(',') : []
      }));
      return { reminders };
    }

    default:
      return { error: 'Unknown action: ' + action };
  }
}

const server = http.createServer((req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  let data = '';
  req.on('data', chunk => data += chunk);
  req.on('end', async () => {
    try {
      const body = JSON.parse(data);
      const result = await handleAction(body);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result));
    } catch (e) {
      console.error('[DB-Server Error]', e.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

server.listen(PORT, () => {
  console.log(`[Archie DB Server] Corriendo en http://0.0.0.0:${PORT}`);
});
```

### 7.3 Dockerfile

```bash
nano /opt/docker/n8n/db-server/Dockerfile
```

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY server.js ./

EXPOSE 3456

CMD ["node", "server.js"]
```

---

## 8. Crear el docker-compose.yml

```bash
nano /opt/docker/n8n/docker-compose.yml
```

```yaml
services:
  # === MySQL para Archie (archie_team + coach) ===
  archie-db:
    image: mysql:8.0
    container_name: archie-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - archie_db_data:/var/lib/mysql
      - ./init-sql:/docker-entrypoint-initdb.d:ro
    networks:
      - internal
    command: --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p${MYSQL_ROOT_PASSWORD}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s

  # === archie-db-server (API intermedia Node.js) ===
  archie-db-srv:
    build:
      context: ./db-server
      dockerfile: Dockerfile
    container_name: archie-db-srv
    restart: unless-stopped
    environment:
      MYSQL_HOST: archie-db
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    networks:
      - internal
    depends_on:
      archie-db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3456/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # === n8n ===
  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    environment:
      # Dominio y webhook
      - WEBHOOK_URL=https://${N8N_DOMAIN}
      - N8N_HOST=${N8N_DOMAIN}
      - N8N_PROTOCOL=https
      - N8N_PORT=5678
      # Timezone
      - GENERIC_TIMEZONE=${GENERIC_TIMEZONE}
      - TZ=${GENERIC_TIMEZONE}
      # Seguridad
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      # DB interna de n8n (SQLite por defecto, suficiente)
      - DB_TYPE=sqlite
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - internal
      - proxy
    depends_on:
      archie-db-srv:
        condition: service_healthy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`${N8N_DOMAIN}`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
      - "traefik.http.services.n8n.loadbalancer.server.port=5678"

networks:
  proxy:
    external: true
  internal:
    driver: bridge

volumes:
  archie_db_data:
  n8n_data:
```

---

## 9. Configurar DNS

En el panel de tu registrador de dominio, agregar:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | `n8n` | `149.50.153.32` |

Verificar propagacion:

```bash
dig n8n.bowin.com.ar +short
# Debe mostrar: 149.50.153.32
```

---

## 10. Levantar todo

```bash
cd /opt/docker/n8n

# Buildear y levantar
docker compose up -d --build

# Ver que los 3 containers arranquen
docker compose ps

# Ver logs
docker compose logs -f
```

Verificar:

```bash
# MySQL healthy
docker compose ps archie-db
# Debe decir: healthy

# DB server responde
docker compose exec archie-db-srv wget -qO- http://localhost:3456/health
# Debe decir: {"status":"ok"}

# n8n responde
curl -I https://n8n.bowin.com.ar
# Debe dar 200 (pagina de login de n8n)
```

### Primera vez: crear usuario admin en n8n

1. Abrir `https://n8n.bowin.com.ar` en el navegador
2. Completar el setup wizard (nombre, email, password)
3. Anotar las credenciales — son para acceder a n8n

---

## 11. Importar workflows de n8n

### 11.1 Exportar workflows desde tu n8n local

En tu maquina local:

```bash
# Exportar todos los workflows via API
curl -s http://localhost:5678/api/v1/workflows \
  -H "X-N8N-API-KEY: TU_API_KEY_LOCAL" \
  | python -m json.tool > workflows-export.json
```

O desde la UI de n8n local:
1. Abrir cada workflow → Menu (3 puntos) → **Download**
2. Guardar cada `.json` exportado

### 11.2 Importar en n8n de produccion

Desde la UI de n8n en produccion (`https://n8n.bowin.com.ar`):
1. Click en **Add workflow** → **Import from file**
2. Subir cada workflow exportado

Workflows a importar:

| Workflow | Funcion |
|----------|---------|
| Archie Bot - Menu | Router principal del bot Telegram |
| Archie Pendientes Bot | Sub-workflow de pendientes |
| Archie SSL Check | Sub-workflow de SSL |
| SSL - Alerta Vencimiento | Cron de alertas SSL |
| Coach | Sub-workflow de ejercicios |
| Coach Reminder | Cron de recordatorios |

---

## 12. Configurar credenciales en n8n

Despues de importar, los workflows van a mostrar errores de credenciales. Hay que recrearlas.

### 12.1 Credencial de Telegram

1. En n8n → **Credentials** → **Add credential** → **Telegram**
2. Bot token: `8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA`
3. Guardar
4. Asignar esta credencial a todos los nodos Telegram de los workflows

### 12.2 URLs del archie-db-server

En los workflows, los nodos HTTP que llaman al db-server usan `http://host.docker.internal:3456`. Hay que cambiarlos a la URL interna de Docker:

**Cambiar en todos los nodos HTTP Request:**

| Antes (local) | Despues (produccion) |
|----------------|---------------------|
| `http://host.docker.internal:3456` | `http://archie-db-srv:3456` |
| `http://localhost:3456` | `http://archie-db-srv:3456` |

> Los containers estan en la misma red `internal`, asi que n8n puede llegar al db-server por su nombre de container.

### 12.3 Credencial SSH (para SSL Check)

Si usas el modulo de SSL Check:
1. **Credentials** → **Add credential** → **SSH**
2. Configurar con las credenciales del VPS o del servidor que quieras monitorear

---

## 13. Actualizar webhook de Telegram

Con el dominio fijo, hay que registrar el webhook una sola vez y nunca mas cambia.

### 13.1 Activar el workflow del Menu

En n8n, abrir "Archie Bot - Menu" → click en **Active** (toggle arriba a la derecha).

Esto registra automaticamente el webhook en la URL:
```
https://n8n.bowin.com.ar/webhook/XXXXX
```

### 13.2 Verificar que Telegram esta conectado

```bash
curl -s "https://api.telegram.org/bot8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA/getWebhookInfo"
```

Debe mostrar:
```json
{
  "ok": true,
  "result": {
    "url": "https://n8n.bowin.com.ar/webhook/...",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

### 13.3 Si el webhook no se registro automaticamente

Forzarlo manualmente:

```bash
# Obtener la URL del webhook desde n8n (abrir el Telegram Trigger node, copiar la "Webhook URL")
# Luego registrarlo:
curl -s "https://api.telegram.org/bot8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA/setWebhook?url=https://n8n.bowin.com.ar/webhook/XXXXX"
```

---

## 14. Verificacion post-deploy

### Checklist

```
[ ] https://n8n.bowin.com.ar carga el login de n8n
[ ] SSL valido (candado verde)
[ ] Login con las credenciales creadas en el setup
[ ] Los 6 workflows estan importados
[ ] Las credenciales de Telegram estan asignadas
[ ] Los nodos HTTP apuntan a http://archie-db-srv:3456
[ ] El workflow "Archie Bot - Menu" esta activo
[ ] Enviar /start al bot en Telegram → responde con el menu
[ ] Crear un pendiente desde Telegram → se guarda en la DB
[ ] Verificar en DB: docker compose exec archie-db mysql -u archie_prod -p archie_team -e "SELECT * FROM pendientes;"
[ ] Coach funciona (si lo usas)
[ ] SSL Check funciona (si lo usas)
```

---

## 15. Mantenimiento

### 15.1 Comandos frecuentes

```bash
cd /opt/docker/n8n

# Estado
docker compose ps

# Logs
docker compose logs -f n8n
docker compose logs -f archie-db-srv
docker compose logs -f archie-db

# Reiniciar
docker compose restart n8n
docker compose restart archie-db-srv

# Entrar a MySQL
docker compose exec archie-db mysql -u archie_prod -p archie_team

# Ver pendientes
docker compose exec archie-db mysql -u archie_prod -p archie_team -e "SELECT p.titulo, pr.nombre as proyecto, p.prioridad, p.estado FROM pendientes p JOIN proyectos pr ON p.proyecto_id = pr.id ORDER BY p.created_at DESC LIMIT 10;"
```

### 15.2 Backup de n8n (workflows + credenciales)

```bash
# Backup del volumen de n8n (incluye SQLite con workflows, credenciales, ejecuciones)
docker run --rm \
  -v n8n_n8n_data:/data:ro \
  -v /opt/docker/n8n/backups:/backup \
  alpine tar czf /backup/n8n_data_$(date +%Y%m%d).tar.gz -C /data .

# Backup de MySQL
docker compose exec -T archie-db mysqldump -u root -p"${MYSQL_ROOT_PASSWORD}" --databases archie_team coach \
  | gzip > /opt/docker/n8n/backups/archie_db_$(date +%Y%m%d).sql.gz
```

Agregar al crontab para backup diario:

```bash
mkdir -p /opt/docker/n8n/backups
crontab -e
```

```
# Backup n8n + MySQL diario a las 4 AM
0 4 * * * docker run --rm -v n8n_n8n_data:/data:ro -v /opt/docker/n8n/backups:/backup alpine tar czf /backup/n8n_data_$(date +\%Y\%m\%d).tar.gz -C /data . && cd /opt/docker/n8n && docker compose exec -T archie-db mysqldump -u root -pROOT_PASSWORD --databases archie_team coach | gzip > /opt/docker/n8n/backups/archie_db_$(date +\%Y\%m\%d).sql.gz
```

### 15.3 Actualizar n8n

```bash
cd /opt/docker/n8n

# Bajar ultima version
docker compose pull n8n

# Recrear con la nueva version
docker compose up -d n8n

# Verificar
docker compose logs -f n8n
```

### 15.4 Limpiar backups viejos

```bash
# Eliminar backups de mas de 30 dias
find /opt/docker/n8n/backups -name "*.tar.gz" -mtime +30 -delete
find /opt/docker/n8n/backups -name "*.sql.gz" -mtime +30 -delete
```

---

## 16. Troubleshooting

### n8n no carga (502)

```bash
docker compose ps n8n
docker compose logs --tail 30 n8n

# Si esta reiniciando, verificar que archie-db este healthy
docker compose ps archie-db
```

### El bot no responde en Telegram

```bash
# 1. Verificar que el workflow esta activo en n8n
# 2. Verificar webhook
curl -s "https://api.telegram.org/bot8422677171:AAEA-ifRMSjJpsDQLd-uxPvC0tFEvGh_9wA/getWebhookInfo"

# 3. Si el webhook URL no es la correcta, re-activar el workflow en n8n
# (desactivar y volver a activar)
```

### Error de conexion a la base de datos

```bash
# Verificar que db-server conecta a MySQL
docker compose logs --tail 20 archie-db-srv

# Verificar que MySQL esta corriendo
docker compose exec archie-db mysqladmin ping -u root -p

# Test manual del db-server
docker compose exec n8n wget -qO- http://archie-db-srv:3456/health
```

### Las credenciales de Telegram no funcionan

1. Verificar el bot token con: `curl https://api.telegram.org/botTU_TOKEN/getMe`
2. Si devuelve info del bot, el token es correcto
3. Recrear la credencial en n8n y reasignarla a los nodos

### n8n no genera certificado SSL

```bash
# Verificar que el DNS apunta al VPS
dig n8n.bowin.com.ar +short

# Verificar logs de Traefik
docker logs traefik 2>&1 | grep -i "n8n\|acme\|certificate"

# El puerto 80 debe estar abierto (para el challenge HTTP-01)
sudo ufw status | grep 80
```

---

## Resumen del flujo

```
 PREREQUISITO: Traefik + red proxy ya funcionando (guia Braillin)

 1. Crear carpeta /opt/docker/n8n con estructura
 2. Crear .env con passwords (openssl rand -hex 32)
 3. Crear schema SQL (archie_team + coach)
 4. Crear db-server (Dockerfile + server.js)
 5. Crear docker-compose.yml con labels de Traefik
 6. Apuntar DNS: n8n.bowin.com.ar → IP del VPS
 7. docker compose up -d --build
 8. Crear usuario admin en n8n (primera vez)
 9. Importar workflows desde n8n local
 10. Recrear credenciales (Telegram, SSH)
 11. Cambiar URLs de db-server a http://archie-db-srv:3456
 12. Activar workflow del Menu → webhook se registra automaticamente
 13. Testear bot en Telegram
```
