# Guia de Deploy a Produccion — SysFac (Docker + Multi-proyecto)

> VPS con infraestructura ya montada (Traefik + Portainer). Solo se documenta el deploy del proyecto.
>
> Stack: Docker Compose | Traefik (reverse proxy + SSL) | Node.js + Express + Prisma | MySQL 8 | Angular 19 SPA + Tailwind CSS 4 | Nginx | Puppeteer (PDF)

---

## Indice

1. [Arquitectura del proyecto](#1-arquitectura-del-proyecto)
2. [Pre-requisitos (infraestructura existente)](#2-pre-requisitos-infraestructura-existente)
3. [Estructura en el servidor](#3-estructura-en-el-servidor)
4. [Crear Dockerfile del backend](#4-crear-dockerfile-del-backend)
5. [Crear Dockerfile del frontend (multi-stage)](#5-crear-dockerfile-del-frontend-multi-stage)
6. [Crear config de Nginx interna](#6-crear-config-de-nginx-interna)
7. [Crear .env de produccion](#7-crear-env-de-produccion)
8. [Docker Compose del proyecto](#8-docker-compose-del-proyecto)
9. [Configurar DNS](#9-configurar-dns)
10. [Deploy](#10-deploy)
11. [Seed inicial (solo primera vez)](#11-seed-inicial-solo-primera-vez)
12. [Verificacion post-deploy](#12-verificacion-post-deploy)
13. [Mantenimiento y operaciones](#13-mantenimiento-y-operaciones)
14. [Troubleshooting](#14-troubleshooting)

---

## 1. Arquitectura del proyecto

```
Internet
    |
    v
[ Traefik :80/:443 ]  ─── SSL automatico (Let's Encrypt)
    |
    |── sysfac.bowin.com.ar ──> [ sysfac-web ]   Nginx (Angular 19 SPA + proxy)
    |                               |
    |                          [ sysfac-api ]    Node.js (Express + Prisma + Puppeteer)
    |                               |
    |                          [ sysfac-db ]     MySQL 8
    |
    v
[ Red Docker: proxy ]  ─── Red compartida con Traefik
```

| Componente | Tecnologia | Puerto interno |
|------------|-----------|---------------|
| **Frontend** | Angular 19 + Tailwind CSS 4 servido por Nginx | 80 |
| **Backend** | Node.js + Express 5 + Prisma 6 + Puppeteer (PDF) | 3000 |
| **Base de datos** | MySQL 8 | 3306 |

---

## 2. Pre-requisitos (infraestructura existente)

Estos pasos ya estan hechos en el VPS (documentados en la guia de Braillin):

- [x] VPS con Ubuntu 22/24 LTS
- [x] Usuario `deploy` con SSH (puerto 2222)
- [x] Docker + Docker Compose instalados
- [x] Red Docker `proxy` creada (`docker network create proxy`)
- [x] Traefik corriendo en `/opt/docker/traefik/`
- [x] Portainer corriendo en `/opt/docker/portainer/`
- [x] Firewall UFW configurado (SSH + 80 + 443)

> Si el VPS es nuevo, seguir las secciones 1-8 de la guia de Braillin antes de continuar.

---

## 3. Estructura en el servidor

```bash
# Conectar al servidor
ssh -p 2222 deploy@IP_DEL_VPS

# Crear carpeta del proyecto
mkdir -p /opt/docker/sysfac
cd /opt/docker/sysfac
```

### Clonar el repositorio

```bash
cd /opt/docker/sysfac
git clone https://github.com/VallejoJuanPablo/sysfac.git repo
```

> Si el repo es privado:
> ```bash
> ssh-keygen -t ed25519 -f ~/.ssh/sysfac_deploy -N ""
> cat ~/.ssh/sysfac_deploy.pub
> # Copiar → GitHub → repo Settings → Deploy Keys → Add
>
> # Configurar SSH
> nano ~/.ssh/config
> ```
> ```
> Host github-sysfac
>     HostName github.com
>     User git
>     IdentityFile ~/.ssh/sysfac_deploy
> ```
> ```bash
> git clone git@github-sysfac:VallejoJuanPablo/sysfac.git repo
> ```

Estructura final:

```
/opt/docker/sysfac/
├── docker-compose.yml             ← Copiar desde repo
├── .env                           ← Crear con secrets de produccion
├── deploy.sh                      ← Script de deploy automatizado
├── repo/                          ← Codigo clonado desde GitHub
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── package.json
│   │   ├── src/
│   │   ├── prisma/
│   │   └── assets/modelo-vacio.jpg
│   ├── frontend/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── nginx.conf
│   │   ├── package.json
│   │   └── src/
│   └── docker-compose.yml         ← Template (se copia al nivel superior)
└── backups/                       ← Backups de MySQL
```

### Copiar docker-compose al nivel del proyecto

```bash
cp /opt/docker/sysfac/repo/docker-compose.yml /opt/docker/sysfac/docker-compose.yml
```

---

## 4. Crear Dockerfile del backend

> Ya esta en el repo: `repo/backend/Dockerfile`. No hace falta crearlo manualmente.

```dockerfile
# ---- Build stage ----
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src

RUN npx tsc

# ---- Production stage ----
FROM node:22-slim

# Puppeteer necesita Chromium y sus dependencias
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Decirle a Puppeteer que use el Chromium del sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
COPY assets ./assets

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

> **Nota sobre Puppeteer:** A diferencia de Braillin y BarberiaElJefe, este backend necesita Chromium para generar PDFs. Por eso se usa `node:22-slim` (no `alpine`) y se instala Chromium via `apt-get`. Esto hace que la imagen sea mas grande (~400MB vs ~150MB).

---

## 5. Crear Dockerfile del frontend (multi-stage)

> Ya esta en el repo: `repo/frontend/Dockerfile`. No hace falta crearlo manualmente.

```dockerfile
# === Stage 1: Build de Angular ===
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx ng build --configuration=production

# === Stage 2: Servir con Nginx ===
FROM nginx:alpine

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

> **Nota sobre el path del build:** Angular 19 genera el output en `dist/frontend/browser/` (con subcarpeta `browser`). Verificar con un build local si la estructura difiere.

---

## 6. Crear config de Nginx interna

> Ya esta en el repo: `repo/frontend/nginx.conf`. No hace falta crearlo manualmente.

Este Nginx es INTERNO al proyecto. Traefik rutea el trafico al proyecto, y este Nginx se encarga de:
- Servir los archivos estaticos de Angular
- Proxy de `/api/` al container del backend
- SPA fallback (todas las rutas → `index.html`)

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # === GZIP ===
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1000;
    gzip_vary on;

    # === Assets estaticos con hash (cache agresivo) ===
    location ~* \.(js|css|woff2|woff|ttf|eot|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # === Imagenes ===
    location ~* \.(jpg|jpeg|png|gif|webp)$ {
        expires 30d;
        add_header Cache-Control "public";
        try_files $uri =404;
    }

    # === API (proxy al backend) ===
    location /api/ {
        proxy_pass http://sysfac-api:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
        client_max_body_size 5M;
    }

    # === SPA fallback (Angular routing) ===
    location / {
        try_files $uri $uri/ /index.html;
    }

    # === Seguridad ===
    server_tokens off;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Bloquear archivos ocultos
    location ~ /\. {
        deny all;
    }
}
```

---

## 7. Crear .env de produccion

```bash
nano /opt/docker/sysfac/.env
```

```env
# === BASE DE DATOS ===
MYSQL_ROOT_PASSWORD=GENERAR_PASSWORD_SEGURA
MYSQL_DATABASE=sysfac
MYSQL_USER=sysfac_user
MYSQL_PASSWORD=GENERAR_PASSWORD_SEGURA

# === BACKEND ===
PORT=3000
NODE_ENV=production

# Conexion a MySQL (el host es "sysfac-db", nombre del container en la red Docker)
DATABASE_URL=mysql://sysfac_user:MISMA_PASSWORD@sysfac-db:3306/sysfac

# JWT (generar con: openssl rand -hex 64)
JWT_SECRET=GENERAR_SECRET_AQUI

# === DOMINIO (usado en labels de Traefik) ===
DOMAIN=sysfac.bowin.com.ar
```

**Generar passwords:**

```bash
# IMPORTANTE: usar hex, NO base64 (base64 genera / y + que rompen URLs de Prisma)
openssl rand -hex 32
```

**Proteger el archivo:**

```bash
chmod 600 /opt/docker/sysfac/.env
```

---

## 8. Docker Compose del proyecto

> Ya se copio desde el repo en el paso 3. Verificar que esta en `/opt/docker/sysfac/docker-compose.yml`.

```yaml
services:
  # === BASE DE DATOS ===
  sysfac-db:
    image: mysql:8.0
    container_name: sysfac-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: ${MYSQL_DATABASE}
      MYSQL_USER: ${MYSQL_USER}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - internal
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s

  # === BACKEND (Node.js + Express + Prisma + Puppeteer) ===
  sysfac-api:
    build:
      context: ./repo/backend
      dockerfile: Dockerfile
    container_name: sysfac-api
    restart: unless-stopped
    env_file:
      - .env
    networks:
      - internal
    depends_on:
      sysfac-db:
        condition: service_healthy

  # === FRONTEND (Angular 19 + Tailwind + Nginx) ===
  sysfac-web:
    build:
      context: ./repo/frontend
      dockerfile: Dockerfile
    container_name: sysfac-web
    restart: unless-stopped
    networks:
      - internal
      - proxy
    depends_on:
      - sysfac-api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sysfac.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.sysfac.entrypoints=websecure"
      - "traefik.http.routers.sysfac.tls.certresolver=letsencrypt"
      - "traefik.http.services.sysfac.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
  internal:
    driver: bridge

volumes:
  db_data:
```

---

## 9. Configurar DNS

En el panel del registrador de dominio (bowin.com.ar):

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `sysfac` | `IP_DEL_VPS` | 300 |

> Si ya tenes un wildcard `*.bowin.com.ar` apuntando al Server 2, este paso no es necesario.

Verificar propagacion:

```bash
dig sysfac.bowin.com.ar +short
# Debe mostrar la IP del VPS
```

---

## 10. Deploy

```bash
cd /opt/docker/sysfac

# Buildear y levantar
docker compose up -d --build
```

Esto va a:
1. Crear el container MySQL y esperar a que este healthy
2. Buildear la imagen del backend (instalar deps, compilar TS, instalar Chromium)
3. Buildear la imagen del frontend (instalar deps, build Angular 19, copiar a Nginx)
4. Levantar todo conectado

> **Nota:** La primera vez tarda ~5 minutos por la descarga de Chromium en el backend.

**Verificar:**

```bash
# Ver estado de los 3 containers
docker compose ps

# Ver logs (todos juntos)
docker compose logs -f

# Ver logs de un servicio especifico
docker compose logs -f sysfac-api
```

---

## 11. Seed inicial (solo primera vez)

Despues de que MySQL este healthy:

```bash
cd /opt/docker/sysfac

# Ejecutar migraciones de Prisma
docker compose exec sysfac-api npx prisma migrate deploy

# Ejecutar seed
docker compose exec sysfac-api node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('pituco', 10);
  await prisma.usuario.upsert({
    where: { username: 'pituco' },
    update: {},
    create: { username: 'pituco', password: hash, nombre: 'Administrador', rol: 'admin' }
  });
  console.log('Usuario admin creado: pituco / pituco');

  const config = [
    { clave: 'empresa_nombre', valor: 'MC Soluciones en Frío' },
    { clave: 'empresa_direccion', valor: 'Av. Armenia 2932' },
    { clave: 'empresa_ciudad', valor: 'Corrientes Capital' },
    { clave: 'empresa_email', valor: 'dr.frio@gmail.com' },
    { clave: 'empresa_telefono', valor: '3794-771259' },
    { clave: 'empresa_responsable', valor: 'Centurión Matias' },
  ];
  for (const c of config) {
    await prisma.configuracion.upsert({ where: { clave: c.clave }, update: { valor: c.valor }, create: c });
  }
  console.log('Configuracion de empresa creada');

  const servicios = [
    { nombre: 'Servicio limpieza split 3.500 fr equipo exterior', precioDefault: 95000 },
    { nombre: 'Extensión de cañería', precioDefault: 80000 },
    { nombre: 'Limpieza y pintura de pared', precioDefault: 50000 },
  ];
  for (const s of servicios) {
    await prisma.servicio.upsert({ where: { nombre: s.nombre }, update: {}, create: s });
  }
  console.log('Servicios iniciales creados');
}
main().catch(console.error).finally(() => prisma.\$disconnect());
"
```

> **ANOTAR:** Login admin → `pituco / pituco`

---

## 12. Verificacion post-deploy

### Checklist funcional

```
[ ] https://sysfac.bowin.com.ar carga la pagina de login
[ ] Login con pituco / pituco entra al dashboard
[ ] Dashboard muestra 4 KPIs (total presupuestos, mes, monto, servicios)
[ ] Crear un presupuesto de prueba con 2 servicios
[ ] Total se calcula correctamente
[ ] Descargar PDF del presupuesto creado
[ ] PDF tiene el logo y formato correcto (modelo-vacio.jpg de fondo)
[ ] Refresh en /presupuestos NO da 404
[ ] Logout vuelve a la pagina de login
[ ] http://sysfac.bowin.com.ar redirige a https://
```

### Verificar SSL

```bash
curl -I https://sysfac.bowin.com.ar
# Verificar que responde 200 con headers de seguridad
```

### Verificar API

```bash
# Health check
curl https://sysfac.bowin.com.ar/api/health

# Login
curl -X POST https://sysfac.bowin.com.ar/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pituco","password":"pituco"}'
# Debe retornar token JWT
```

---

## 13. Mantenimiento y operaciones

### 13.1 Comandos frecuentes

```bash
cd /opt/docker/sysfac

# === Estado ===
docker compose ps                        # Ver containers del proyecto
docker compose ps -a                     # Incluir parados

# === Logs ===
docker compose logs -f                   # Logs de todo el proyecto
docker compose logs -f sysfac-api        # Logs solo del backend
docker compose logs --tail 100 sysfac-api # Ultimas 100 lineas

# === Reiniciar ===
docker compose restart sysfac-api        # Reiniciar solo un servicio
docker compose restart                   # Reiniciar todo el proyecto

# === Parar / Levantar ===
docker compose stop                      # Parar todo (datos se conservan)
docker compose start                     # Volver a levantar
docker compose down                      # Parar y eliminar containers (volumenes se conservan)
docker compose down -v                   # PELIGRO: elimina containers Y volumenes (datos)

# === Rebuild ===
docker compose up -d --build             # Rebuild + restart
docker compose up -d --build sysfac-api  # Rebuild solo el backend

# === Shell interactivo ===
docker compose exec sysfac-api sh                                        # Entrar al backend
docker compose exec sysfac-db mysql -u root -p${MYSQL_ROOT_PASSWORD}     # Entrar a MySQL
```

### 13.2 Workflow de deploy (actualizar codigo)

```bash
cd /opt/docker/sysfac

# 1. Traer cambios
cd repo
git pull origin master
cd ..

# 2. Rebuild y restart
docker compose up -d --build

# 3. Si hay migraciones nuevas de Prisma
docker compose exec sysfac-api npx prisma migrate deploy

# 4. Verificar
docker compose ps
docker compose logs --tail 10 sysfac-api
curl -s https://sysfac.bowin.com.ar/api/health
```

### 13.3 Script de deploy automatizado

```bash
nano /opt/docker/sysfac/deploy.sh
```

```bash
#!/bin/bash
set -e

echo "=== Deploying SysFac ==="

cd /opt/docker/sysfac

echo ">>> Pulling latest code..."
cd repo
git pull origin master
cd ..

echo ">>> Building and restarting containers..."
docker compose up -d --build

echo ">>> Waiting for startup..."
sleep 10

echo ">>> Running migrations..."
docker compose exec -T sysfac-api npx prisma migrate deploy 2>/dev/null || echo "(no new migrations)"

echo ">>> Health check..."
curl -sf https://sysfac.bowin.com.ar/api/health || echo "WARNING: health check failed"
echo ""

echo ">>> Container status:"
docker compose ps

echo ""
echo "=== Deploy complete ==="
```

```bash
chmod +x /opt/docker/sysfac/deploy.sh
./deploy.sh
```

### 13.4 Backups de MySQL

#### Backup manual

```bash
cd /opt/docker/sysfac

# Dump de la base de datos
docker compose exec -T sysfac-db mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} sysfac \
  > backups/sysfac_$(date +%Y%m%d_%H%M%S).sql
```

#### Backup automatico diario

```bash
mkdir -p /opt/docker/sysfac/backups
nano /opt/docker/sysfac/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/opt/docker/sysfac/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="sysfac_${TIMESTAMP}.sql.gz"

mkdir -p ${BACKUP_DIR}

# Leer password del .env
source /opt/docker/sysfac/.env

docker compose -f /opt/docker/sysfac/docker-compose.yml \
  exec -T sysfac-db mysqldump \
  -u root -p${MYSQL_ROOT_PASSWORD} sysfac \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# Eliminar backups de mas de 30 dias
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete

echo "$(date): Backup created: ${FILENAME}" >> ${BACKUP_DIR}/backup.log
```

```bash
chmod +x /opt/docker/sysfac/backup-db.sh
```

Agregar al crontab:

```bash
crontab -e
```

```
# Backup diario a las 3 AM
0 3 * * * /opt/docker/sysfac/backup-db.sh
```

#### Restaurar un backup

```bash
cd /opt/docker/sysfac
source .env

# Sin comprimir
docker compose exec -T sysfac-db mysql -u root -p${MYSQL_ROOT_PASSWORD} sysfac < backups/sysfac_20260815.sql

# Comprimido
gunzip -c backups/sysfac_20260815.sql.gz | docker compose exec -T sysfac-db mysql -u root -p${MYSQL_ROOT_PASSWORD} sysfac
```

---

## 14. Troubleshooting

### El sitio no carga / ERR_CONNECTION_REFUSED

```bash
# 1. Verificar que Traefik esta corriendo
docker ps | grep traefik
docker logs traefik --tail 30

# 2. Verificar que los containers del proyecto estan corriendo
cd /opt/docker/sysfac
docker compose ps
# Si algun container esta "Restarting" o "Exited":
docker compose logs sysfac-api --tail 50
docker compose logs sysfac-web --tail 50

# 3. Verificar que el DNS apunta bien
dig sysfac.bowin.com.ar +short
```

### 502 Bad Gateway

```bash
# El container web esta corriendo pero no puede conectar al backend
docker compose logs sysfac-web --tail 30
docker compose logs sysfac-api --tail 30

# Verificar que el backend responde dentro de la red Docker
docker compose exec sysfac-web wget -qO- http://sysfac-api:3000/api/health
```

### MySQL no conecta

```bash
# Verificar que MySQL esta healthy
docker compose ps sysfac-db
# Debe decir "healthy"

# Ver logs de MySQL
docker compose logs sysfac-db --tail 30

# Probar conexion manual
docker compose exec sysfac-db mysql -u root -p

# Verificar DATABASE_URL en .env
# El host debe ser "sysfac-db" (nombre del container), NO "localhost"
```

### Puppeteer falla al generar PDF

```bash
# Verificar que Chromium esta instalado en el container
docker compose exec sysfac-api which chromium
# Debe retornar: /usr/bin/chromium

# Si no encuentra Chromium, rebuild sin cache
docker compose build sysfac-api --no-cache
docker compose up -d
```

### SSL no se genera

```bash
# Verificar logs de Traefik
docker logs traefik 2>&1 | grep -i "acme\|certificate\|error"

# Causas comunes:
# 1. DNS no apunta al VPS → verificar con: dig sysfac.bowin.com.ar +short
# 2. Puerto 80 cerrado → verificar con: sudo ufw status
# 3. acme.json sin permisos → chmod 600 /opt/docker/traefik/acme.json
```

### Refresh en una ruta da 404

```bash
# Verificar la config de Nginx dentro del container
docker compose exec sysfac-web cat /etc/nginx/conf.d/default.conf | grep try_files
# Debe contener: try_files $uri $uri/ /index.html;

# Si no esta, rebuildar
docker compose up -d --build sysfac-web
```

### Rebuild falla por falta de memoria

```bash
# El build de Angular + Chromium necesita RAM. Si el VPS tiene poca:

# Crear swap temporal
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Repetir el build
docker compose up -d --build
```

### Password con caracteres especiales rompe DATABASE_URL

```bash
# Regenerar con hex (solo 0-9, a-f, sin caracteres especiales)
openssl rand -hex 32
# Actualizar .env y docker compose restart
```

---

## Diferencias clave vs otros proyectos

| Aspecto | Braillin | BarberiaElJefe | SysFac |
|---------|----------|----------------|--------|
| **DB** | MySQL 8 + Prisma | MongoDB 7 + Mongoose | MySQL 8 + Prisma |
| **Migraciones** | `npx prisma migrate deploy` | No necesita | `npx prisma migrate deploy` |
| **Backend port** | 3001 | 3200 | 3000 |
| **Frontend** | Angular 20 | Angular 19 + TW 4 | Angular 19 + TW 4 |
| **PDF** | No | No | Puppeteer + Chromium |
| **Imagen Docker** | node:22-alpine | node:22-alpine | node:22-slim (por Chromium) |
| **Uploads** | Volumen compartido | No aplica | No aplica |
| **Healthcheck DB** | `mysqladmin ping` | `mongosh ping` | `mysqladmin ping` |
| **Backup** | `mysqldump` | `mongodump --gzip` | `mysqldump + gzip` |
| **Dominio** | braillin.com.ar | eljefenegocios.com.ar | sysfac.bowin.com.ar |
| **Server** | Server 1 | Server 1 | Server 2 |

---

## Resumen del flujo

```
 INFRAESTRUCTURA (ya hecha — ver guia Braillin secciones 1-8)
 ─────────────────────────────────────
 Traefik + Portainer + UFW + Docker ya corriendo

 DEPLOY DE SYSFAC
 ─────────────────────────────────────
 1.  Crear carpeta /opt/docker/sysfac
 2.  Clonar repo en /opt/docker/sysfac/repo
 3.  Copiar docker-compose.yml al nivel superior
 4.  Crear .env con secrets de produccion
 5.  Apuntar DNS al VPS
 6.  docker compose up -d --build
 7.  prisma migrate deploy
 8.  Seed inicial (usuario pituco + config empresa)
 9.  Verificar checklist
 10. Crear deploy.sh y backup-db.sh

 UPDATES FUTUROS
 ─────────────────────────────────────
 cd repo && git pull && cd .. && docker compose up -d --build
 (o simplemente: ./deploy.sh)
```
