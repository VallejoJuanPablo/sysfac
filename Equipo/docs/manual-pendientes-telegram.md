# Manual de Instalación — Sistema de Pendientes con Telegram

## Qué es

Sistema que permite crear pendientes para el equipo Archie desde Telegram. Un bot conversacional guía paso a paso (proyecto → título → descripción → tipo → prioridad) y almacena el pendiente en MySQL. Archie lo lee con `/pendientes`.

## Arquitectura

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌───────────┐
│ Telegram  │◄───►│  n8n (Docker)   │◄───►│ archie-db-server │◄───►│   MySQL   │
│   Bot     │     │  :5678          │     │  (Node.js :3456) │     │  (Docker) │
└──────────┘     └────────┬────────┘     └──────────────────┘     └───────────┘
                          │
                 ┌────────┴────────┐
                 │ Cloudflare      │
                 │ Tunnel          │
                 │ (URL pública)   │
                 └─────────────────┘
```

### Componentes

| Componente | Qué hace | Dónde corre |
|-----------|----------|-------------|
| **Bot Telegram** | Interfaz conversacional paso a paso | Telegram (cloud) |
| **n8n** | Workflow: recibe webhook → lógica → DB → responde | Docker, puerto 5678 |
| **Cloudflare Tunnel** | Expone n8n a internet para que Telegram llegue | Proceso local |
| **archie-db-server** | API HTTP que conecta n8n con MySQL | Node.js, puerto 3456 |
| **MySQL** | Base de datos `archie_team` (proyectos, pendientes) | Docker (recomendado) o XAMPP |

---

## Paso 1 — Base de datos MySQL (Docker)

### 1.1 Crear docker-compose.yml

Crear el archivo `Equipo/docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  mysql:
    image: mysql:8.0
    container_name: archie-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: archie2026
      MYSQL_DATABASE: archie_team
      MYSQL_CHARSET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci
    ports:
      - "3307:3306"        # Puerto 3307 para no chocar con XAMPP (3306)
    volumes:
      - archie_mysql_data:/var/lib/mysql
      - ./init:/docker-entrypoint-initdb.d   # Scripts de inicialización
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

  n8n:
    image: n8nio/n8n
    container_name: n8n
    restart: unless-stopped
    environment:
      - WEBHOOK_URL=${CLOUDFLARE_TUNNEL_URL}    # Se setea antes de levantar
      - DB_TYPE=sqlite                          # n8n usa SQLite interno
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    depends_on:
      - mysql

volumes:
  archie_mysql_data:
  n8n_data:
```

> **Nota:** Si ya tenés n8n corriendo en Docker standalone, podés mantenerlo separado. Lo importante es que `WEBHOOK_URL` apunte al túnel de Cloudflare.

### 1.2 Script de inicialización de la base de datos

Crear `Equipo/docker/init/01-schema.sql`:

```sql
-- Base de datos del equipo Archie
CREATE DATABASE IF NOT EXISTS archie_team
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE archie_team;

-- Proyectos del equipo
CREATE TABLE proyectos (
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

-- Pendientes (alimentados desde Telegram, n8n, o manualmente)
CREATE TABLE pendientes (
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

-- Estado conversacional del bot de Telegram
CREATE TABLE chat_states (
  chat_id       BIGINT PRIMARY KEY,
  proyecto_id   INT,
  titulo        VARCHAR(200),
  descripcion   TEXT,
  step          VARCHAR(20),
  updated_at    DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Crear `Equipo/docker/init/02-seed.sql`:

```sql
USE archie_team;

INSERT INTO proyectos (codigo, nombre, ruta, stack, estado, ultima_sesion) VALUES
('7G4P1S', 'GymPulse',          '../Personal/GymPulse',                       'Angular 18 + Node/Express + MySQL + MongoDB', 'En desarrollo', '2026-05-27'),
('L2V8RO', 'LavaderoOs',        '../Personal/LavaderoOs',                     'Angular 17 + Node/Express + MySQL',           'En análisis',   '2026-06-20'),
('D3B9MF', 'IL017-broker-manager-frontend', '../Idoneo/IL017-broker-manager-frontend', 'Angular 17 + Material + SSR',       'Activo',        '2026-06-19'),
('A4E6NV', 'AgroEnvios',        '../Macro/ECO AGROENVIOS',                    'Node 22 + TS + Express + MongoDB + AWS',      'Registrado',    '2026-06-11'),
('B5R1LN', 'Braillin',          '../Personal/Braillin',                       'Angular 18 + Node/Express + MySQL + PrimeNG', 'Fase 1',        '2026-06-04'),
('M6T3LC', 'microTelco',        '../Personal/microTelco',                     'NestJS + Angular 19 + MongoDB + Socket.IO',   '7 fases',       '2026-06-08'),
('F7K8IT', 'FrontKit',          '../Personal/FrontKit',                       'Angular 20 + Tailwind CSS 4',                 '271 componentes','2026-06-11'),
('A8P2NL', 'AgroEnvioPanel',    '../Macro/AgroEnvioPanel',                    'Angular 19 + Tailwind CSS 4',                 '7 fases + RBAC','2026-06-11'),
('R9C4TM', 'ArchieTeam',        '../Personal/ArchieTeam',                     'Angular 19 + Tailwind CSS 4',                 'MVP completo',  '2026-06-10'),
('D0N7TS', 'Dentos',            '../Personal/Dentos',                         'Angular 18 + Material / Laravel 10',          'Registrado',    '2026-06-18');
```

### 1.3 Levantar

```bash
cd Equipo/docker
docker compose up -d
```

Verificar:
```bash
docker exec archie-mysql mysql -u root -parchie2026 archie_team -e "SELECT COUNT(*) FROM proyectos;"
```

---

## Paso 2 — archie-db-server (API intermedia)

### 2.1 Qué es

Micro-servidor Node.js que expone una API HTTP en el puerto 3456. n8n (desde Docker) lo llama para leer/escribir en MySQL. Usa `mysql2` para conexión directa con UTF-8 correcto.

### 2.2 Configuración

Archivo: `Equipo/scripts/archie-db-server.js`

Si usás MySQL en Docker (paso 1), actualizar la conexión:

```javascript
const pool = mysql.createPool({
  host: 'localhost',
  port: 3307,              // Puerto del Docker MySQL (3307 para no chocar con XAMPP)
  user: 'root',
  password: 'archie2026',  // Password del Docker
  database: 'archie_team',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 5
});
```

Si usás MySQL de XAMPP (sin Docker), dejar `port: 3306` y `password: ''`.

### 2.3 Instalar dependencias

```bash
cd Equipo
npm install mysql2
```

### 2.4 Iniciar

```bash
node scripts/archie-db-server.js
# → Archie DB Server corriendo en http://localhost:3456
```

### 2.5 Verificar

```bash
curl -X POST http://localhost:3456 -H "Content-Type: application/json" -d '{"action":"read_state","chat_id":0}'
# Debe devolver: {"state":null,"projects":[...]}
```

### 2.6 Acciones disponibles

| Acción | Body | Descripción |
|--------|------|-------------|
| `read_state` | `{ chat_id }` | Lee estado del chat + lista de proyectos |
| `save_state` | `{ chat_id, proyecto_id, step }` | Guarda estado inicial del chat |
| `update_state` | `{ chat_id, titulo?, descripcion?, step? }` | Actualiza campos del estado |
| `insert_pendiente` | `{ proyecto_id, titulo, descripcion, tipo, prioridad, fuente, chat_id }` | Inserta pendiente + limpia estado |
| `delete_state` | `{ chat_id }` | Limpia estado del chat |

---

## Paso 3 — Bot de Telegram

### 3.1 Crear bot con BotFather

1. Abrí Telegram, buscá `@BotFather`
2. Mandá `/newbot`
3. Elegí nombre (ej: "Archie Pendientes") y username (ej: `archie_pendientes_bot`)
4. Guardá el **token** que te da BotFather (formato: `123456:ABC-DEF...`)

### 3.2 Configurar credencial en n8n

1. Abrí n8n: http://localhost:5678
2. Ir a **Settings → Credentials → Add Credential**
3. Tipo: **Telegram API**
4. Pegar el token del bot
5. Guardar — anotar el **ID de la credencial** (aparece en la URL)

---

## Paso 4 — Cloudflare Tunnel

### 4.1 Instalar cloudflared

- **Windows:** descargar de https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
- **Linux/Mac:** `brew install cloudflared` o descarga directa

### 4.2 Iniciar túnel

```bash
cloudflared tunnel --url http://localhost:5678
```

Esto genera una URL pública tipo:
```
https://random-words-here.trycloudflare.com
```

> **Importante:** Esta URL cambia cada vez que reiniciás el túnel. n8n necesita reiniciarse con la nueva URL (ver paso 5).

### 4.3 Túnel permanente (opcional)

Para una URL fija, crear un túnel con nombre:
```bash
cloudflared tunnel login
cloudflared tunnel create archie
cloudflared tunnel route dns archie archie-bot.tudominio.com
cloudflared tunnel run archie --url http://localhost:5678
```

---

## Paso 5 — Workflow de n8n

### 5.1 Configurar WEBHOOK_URL en n8n

n8n necesita saber cuál es su URL pública para registrar webhooks con Telegram.

**Si n8n corre con docker-compose (paso 1):**
```bash
# Crear archivo .env junto al docker-compose.yml
echo "CLOUDFLARE_TUNNEL_URL=https://tu-url.trycloudflare.com/" > .env
docker compose up -d
```

**Si n8n corre standalone:**
```bash
docker stop n8n && docker rm n8n
docker run -d --restart unless-stopped \
  --name n8n \
  -p 5678:5678 \
  -v "D:/trabajo/n8n:/home/node/.n8n" \
  -e WEBHOOK_URL="https://tu-url.trycloudflare.com/" \
  n8nio/n8n
```

### 5.2 Crear el workflow

Editar las constantes en `scripts/create-telegram-workflow.js`:

```javascript
const N8N_KEY = 'tu-api-key-de-n8n';          // Settings → API → Create API Key
const BOT_TOKEN = 'tu-token-de-botfather';     // Del paso 3
const TELEGRAM_CRED_ID = 'id-credencial-n8n';  // Del paso 3.2
const DB_URL = 'http://host.docker.internal:3456';  // Fijo (Docker → host)
```

Ejecutar:
```bash
node scripts/create-telegram-workflow.js
# → Workflow creado! ID: xxxxx
# → URL: http://localhost:5678/workflow/xxxxx
```

### 5.3 Activar

1. Abrí la URL del workflow en n8n
2. Click en el **toggle** de arriba a la derecha para activarlo
3. n8n registra automáticamente el webhook con Telegram vía el túnel

### 5.4 Estructura del workflow

```
Telegram Trigger (webhook)
    ↓
Extract (Code) — parsea chatId, texto, callbacks
    ↓
Read DB (HTTP → :3456) — lee estado + proyectos
    ↓
Logic (Code) — toda la lógica del bot
    ↓
Has DB Action? (IF)
  ├── SI → Write DB (HTTP → :3456) → Send Telegram (HTTP)
  └── NO → Send Telegram Direct (HTTP)
    ↓
Is Callback? (IF)
  ├── SI → Answer Callback (HTTP)
  └── NO → fin
```

---

## Paso 6 — Probar

1. Abrí Telegram y buscá tu bot
2. Mandá `/start` — debe responder con mensaje de bienvenida
3. Mandá `/pendiente` — debe mostrar teclado con proyectos
4. Seguí el flujo: proyecto → título → descripción (o Omitir) → tipo → prioridad
5. Verificá en Archie con `/pendientes` que el pendiente apareció

---

## Flujo completo del bot

```
Usuario                          Bot
  │                               │
  ├── /pendiente ──────────────►  │
  │                               ├── 📋 Elegí el proyecto:
  │                               │   [GymPulse] [LavaderoOs]
  │                               │   [AgroEnvios] [Braillin]
  │                               │   [❌ Cancelar]
  ├── click [LavaderoOs] ──────►  │
  │                               ├── ✅ Proyecto: LavaderoOs
  │                               │   ✏️ Escribí el título:
  ├── "Arreglar login" ────────►  │
  │                               ├── ✅ Título: Arreglar login
  │                               │   📝 Escribí descripción:
  │                               │   [⏩ Omitir]
  ├── "El login no valida..." ─►  │
  │                               ├── ✅ Descripción guardada
  │                               │   📂 Elegí el tipo:
  │                               │   [📋 Spec] [🐛 Fix]
  │                               │   [⬆️ Mejora] [🔍 Investigación]
  ├── click [🐛 Fix] ──────────►  │
  │                               ├── ✅ Tipo: Fix
  │                               │   🎯 Elegí la prioridad:
  │                               │   [🔴 Alta] [🟡 Media] [🟢 Baja]
  ├── click [🔴 Alta] ─────────►  │
  │                               ├── ✅ Pendiente creado!
  │                               │   📁 Proyecto: LavaderoOs
  │                               │   📝 Título: Arreglar login
  │                               │   📝 Descripción: El login no valida...
  │                               │   📂 Tipo: fix
  │                               │   🎯 Prioridad: 🔴 Alta
```

---

## Troubleshooting

### "Bad webhook: Failed to resolve host"
- El túnel de Cloudflare no está corriendo, o `WEBHOOK_URL` de n8n apunta a una URL vieja
- **Fix:** reiniciar cloudflared, actualizar `WEBHOOK_URL` en Docker, reiniciar n8n

### "The service refused the connection" en n8n
- `archie-db-server.js` no está corriendo, o n8n no puede llegar al host
- **Fix:** verificar que el servidor esté en puerto 3456, y que la URL en el workflow sea `http://host.docker.internal:3456` (no `localhost`)

### Acentos rotos (á → ?)
- El servidor DB debe usar `mysql2` (conexión directa), no el CLI de MySQL
- **Fix:** verificar que `archie-db-server.js` usa `require('mysql2/promise')` con `charset: 'utf8mb4'`

### Bot no responde
1. Verificar que el workflow está **activo** en n8n (toggle verde)
2. Verificar que cloudflared está corriendo
3. Probar el túnel: abrir la URL de cloudflare en el browser (debe mostrar n8n)
4. Revisar ejecuciones en n8n: http://localhost:5678/executions

### Cambié la URL del túnel
1. Parar n8n: `docker stop n8n`
2. Recrear con nueva URL: `docker run ... -e WEBHOOK_URL="https://nueva-url/" ...`
3. Activar el workflow de nuevo en n8n

---

## Referencia rápida — Arrancar todo

```bash
# 1. MySQL (Docker o XAMPP)
docker compose up -d          # Si usás Docker
# o iniciar XAMPP              # Si usás XAMPP

# 2. archie-db-server
cd Equipo
node scripts/archie-db-server.js &

# 3. Cloudflare tunnel
cloudflared tunnel --url http://localhost:5678 &
# Copiar la URL generada

# 4. n8n (si no está en docker-compose)
docker run -d --name n8n -p 5678:5678 \
  -v "D:/trabajo/n8n:/home/node/.n8n" \
  -e WEBHOOK_URL="https://url-del-tunnel/" \
  n8nio/n8n

# 5. Activar workflow en n8n (si es primera vez)
node scripts/create-telegram-workflow.js
# Luego activar desde http://localhost:5678
```

---

## Conexión Docker entre n8n y MySQL

Si tanto n8n como MySQL corren en Docker (docker-compose), la comunicación es directa por nombre de servicio:

```
n8n → mysql:3306    (red interna de Docker)
```

En ese caso, `archie-db-server.js` debe conectarse al MySQL de Docker:

```javascript
const pool = mysql.createPool({
  host: 'localhost',       // Si corre en el host
  port: 3307,              // Puerto mapeado del Docker MySQL
  // O si corre dentro de Docker:
  // host: 'archie-mysql', // Nombre del servicio en docker-compose
  // port: 3306,           // Puerto interno
  user: 'root',
  password: 'archie2026',
  database: 'archie_team',
  charset: 'utf8mb4'
});
```

Si `archie-db-server` también se dockeriza en el futuro, usar `host: 'archie-mysql'` y `port: 3306` (red interna Docker).

---

*Manual generado el 2026-06-20 — Equipo Archie*
