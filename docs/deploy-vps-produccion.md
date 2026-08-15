# Deploy SysFac — VPS Produccion

> **Dominio:** sysfac.bowin.com.ar
> **Servidor:** Server 2 (mismo que ArchieTeam, n8n)
> **Stack:** Angular 19 + Node.js/Express + MySQL 8 + Puppeteer
> **Infra:** Docker + Traefik (ya configurado en Server 2)

---

## Indice

1. [Prerequisitos](#1-prerequisitos)
2. [Configurar DNS](#2-configurar-dns)
3. [Estructura en el VPS](#3-estructura-en-el-vps)
4. [Variables de entorno (.env)](#4-variables-de-entorno-env)
5. [Dockerfile Backend](#5-dockerfile-backend)
6. [Dockerfile Frontend](#6-dockerfile-frontend)
7. [Nginx config (frontend)](#7-nginx-config-frontend)
8. [Docker Compose](#8-docker-compose)
9. [Subir archivos al VPS](#9-subir-archivos-al-vps)
10. [Levantar y verificar](#10-levantar-y-verificar)
11. [Seed de la base de datos](#11-seed-de-la-base-de-datos)
12. [Verificacion final](#12-verificacion-final)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisitos

El Server 2 ya tiene la infra base:
- Docker + Docker Compose
- Traefik v3.x como reverse proxy (red `proxy`)
- Portainer en portainer.server2.bowin.com.ar
- UFW con puertos 80/443 abiertos

**Verificar en el VPS:**
```bash
docker --version          # Docker 24+
docker compose version    # v2.x
docker network ls | grep proxy  # Red 'proxy' debe existir
```

---

## 2. Configurar DNS

Agregar un registro **A** en el panel DNS de bowin.com.ar:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | sysfac | IP_DEL_SERVER_2 | 300 |

> Si ya tenes un wildcard `*.bowin.com.ar` apuntando al Server 2, este paso no es necesario. Verificar con `nslookup sysfac.bowin.com.ar`.

---

## 3. Estructura en el VPS

```bash
mkdir -p /opt/docker/sysfac/{backend,frontend}
cd /opt/docker/sysfac
```

Estructura final:
```
/opt/docker/sysfac/
├── docker-compose.yml
├── .env
├── backend/
│   ├── Dockerfile
│   ├── src/
│   ├── prisma/
│   ├── assets/
│   │   └── modelo-vacio.jpg
│   ├── package.json
│   ├── package-lock.json
│   └── tsconfig.json
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   └── .postcssrc.json
```

---

## 4. Variables de entorno (.env)

Crear `/opt/docker/sysfac/.env`:

```bash
# === GENERAR PASSWORDS SEGURAS ===
# IMPORTANTE: usar hex, NO base64 (base64 genera / y + que rompen URLs)
# openssl rand -hex 32

# MySQL
MYSQL_ROOT_PASSWORD=<openssl rand -hex 32>
MYSQL_DATABASE=sysfac
MYSQL_USER=sysfac_user
MYSQL_PASSWORD=<openssl rand -hex 32>

# Backend
DATABASE_URL=mysql://sysfac_user:MYSQL_PASSWORD_AQUI@sysfac-db:3306/sysfac
JWT_SECRET=<openssl rand -hex 64>
PORT=3000
NODE_ENV=production

# Dominio
DOMAIN=sysfac.bowin.com.ar
```

> **CRITICO:** Reemplazar `MYSQL_PASSWORD_AQUI` en DATABASE_URL con el valor real generado para MYSQL_PASSWORD. Copiar el valor exacto, sin espacios.

> **ANOTAR:** Las credenciales del login admin son `pituco / pituco`. Se crean con el seed.

---

## 5. Dockerfile Backend

Crear `/opt/docker/sysfac/backend/Dockerfile`:

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
    libappindicator3-1 \
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

> **IMPORTANTE:** Puppeteer en Docker NO descarga Chromium. Instalamos el Chromium del sistema con `apt-get` y le decimos a Puppeteer que lo use via `PUPPETEER_EXECUTABLE_PATH`.

---

## 6. Dockerfile Frontend

Crear `/opt/docker/sysfac/frontend/Dockerfile`:

```dockerfile
# ---- Build stage ----
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npx ng build --configuration=production

# ---- Production stage ----
FROM nginx:alpine

COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 7. Nginx config (frontend)

Crear `/opt/docker/sysfac/frontend/nginx.conf`:

```nginx
server {
    listen 80;
    server_name sysfac.bowin.com.ar;
    root /usr/share/nginx/html;
    index index.html;

    # Angular SPA: rutas al index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy al backend API
    location /api/ {
        proxy_pass http://sysfac-api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # PDF puede tardar — timeout generoso
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Cache para assets estaticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_min_length 1000;
}
```

---

## 8. Docker Compose

Crear `/opt/docker/sysfac/docker-compose.yml`:

```yaml
services:
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
      - sysfac_db_data:/var/lib/mysql
    networks:
      - internal
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  sysfac-api:
    build: ./backend
    container_name: sysfac-api
    restart: unless-stopped
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - PORT=3000
      - NODE_ENV=production
    networks:
      - internal
    depends_on:
      sysfac-db:
        condition: service_healthy

  sysfac-web:
    build: ./frontend
    container_name: sysfac-web
    restart: unless-stopped
    networks:
      - internal
      - proxy
    depends_on:
      - sysfac-api
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.sysfac.rule=Host(`sysfac.bowin.com.ar`)"
      - "traefik.http.routers.sysfac.entrypoints=websecure"
      - "traefik.http.routers.sysfac.tls.certresolver=letsencrypt"
      - "traefik.http.services.sysfac.loadbalancer.server.port=80"

networks:
  proxy:
    external: true
  internal:
    driver: bridge

volumes:
  sysfac_db_data:
```

---

## 9. Subir archivos al VPS

Desde tu maquina local:

```bash
# Opcion A: rsync (recomendado)
rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.angular' \
  /c/xampp/htdocs/Personal/SysFac/backend/ \
  usuario@IP_SERVER2:/opt/docker/sysfac/backend/

rsync -avz --exclude='node_modules' --exclude='dist' --exclude='.angular' \
  /c/xampp/htdocs/Personal/SysFac/frontend/ \
  usuario@IP_SERVER2:/opt/docker/sysfac/frontend/

# Opcion B: scp
scp -r backend/ usuario@IP_SERVER2:/opt/docker/sysfac/backend/
scp -r frontend/ usuario@IP_SERVER2:/opt/docker/sysfac/frontend/
```

> **NO subir:** `node_modules/`, `dist/`, `.angular/`, `.env` local (crear uno nuevo en el VPS con passwords de produccion).

---

## 10. Levantar y verificar

```bash
cd /opt/docker/sysfac

# Construir y levantar (primera vez tarda ~5 min por Chromium)
docker compose up -d --build

# Ver logs en tiempo real
docker compose logs -f

# Verificar que los 3 containers esten UP
docker compose ps
```

Resultado esperado:
```
NAME          STATUS
sysfac-db     Up (healthy)
sysfac-api    Up
sysfac-web    Up
```

---

## 11. Seed de la base de datos

Despues de que MySQL este healthy, ejecutar las migraciones y el seed:

```bash
# Ejecutar migraciones de Prisma
docker compose exec sysfac-api npx prisma migrate deploy

# Ejecutar seed (crea usuario pituco + config empresa + servicios ejemplo)
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

## 12. Verificacion final

### Checklist

```bash
# 1. DNS resuelve
nslookup sysfac.bowin.com.ar

# 2. HTTPS funciona (Traefik + Let's Encrypt)
curl -I https://sysfac.bowin.com.ar

# 3. API responde
curl https://sysfac.bowin.com.ar/api/health

# 4. Login funciona
curl -X POST https://sysfac.bowin.com.ar/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"pituco","password":"pituco"}'
```

### Resultado esperado
- DNS → IP del Server 2
- HTTPS → 200 con certificado Let's Encrypt
- /api/health → `{"status":"ok"}`
- Login → token JWT

### Probar en browser
1. Abrir `https://sysfac.bowin.com.ar`
2. Login con `pituco / pituco`
3. Ver dashboard con KPIs
4. Crear un presupuesto de prueba
5. Descargar el PDF

---

## 13. Troubleshooting

### Container no levanta
```bash
docker compose logs sysfac-api    # Ver error del backend
docker compose logs sysfac-db     # Ver error de MySQL
docker compose logs sysfac-web    # Ver error de Nginx
```

### MySQL no arranca
```bash
# Verificar que el volume no este corrupto
docker volume ls | grep sysfac
# Si es necesario, borrar y recrear
docker compose down -v
docker compose up -d --build
```

### Puppeteer falla al generar PDF
```bash
# Verificar que Chromium esta instalado en el container
docker compose exec sysfac-api which chromium
# Debe retornar: /usr/bin/chromium

# Si no encuentra Chromium, el Dockerfile del backend necesita rebuild
docker compose build sysfac-api --no-cache
```

### Traefik no rutea / no genera SSL
```bash
# Verificar que el container esta en la red proxy
docker network inspect proxy | grep sysfac

# Verificar labels
docker inspect sysfac-web | grep traefik

# Ver logs de Traefik
docker logs traefik 2>&1 | grep sysfac
```

### Error "client version too old" en Traefik
```bash
# Ver version de Docker API
docker version --format '{{.Server.APIVersion}}'
# Agregar DOCKER_API_VERSION en el docker-compose de Traefik
```

### Frontend muestra pagina en blanco
```bash
# Verificar que el build Angular se hizo correctamente
docker compose exec sysfac-web ls /usr/share/nginx/html
# Debe tener: index.html, main-*.js, styles-*.css, etc.
```

### Password con caracteres especiales rompe DATABASE_URL
```bash
# Regenerar con hex (solo 0-9, a-f, sin caracteres especiales)
openssl rand -hex 32
# Actualizar .env y docker-compose restart
```

---

## Comandos utiles

```bash
# Reiniciar todo
docker compose restart

# Rebuild sin cache (despues de cambios grandes)
docker compose build --no-cache && docker compose up -d

# Ver uso de recursos
docker stats sysfac-db sysfac-api sysfac-web

# Backup de la base de datos
docker compose exec sysfac-db mysqldump -u root -p$MYSQL_ROOT_PASSWORD sysfac > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T sysfac-db mysql -u root -p$MYSQL_ROOT_PASSWORD sysfac < backup.sql
```

---

## Resumen de containers

| Container | Imagen | Puerto interno | Expuesto |
|-----------|--------|---------------|----------|
| sysfac-db | mysql:8.0 | 3306 | No (solo red interna) |
| sysfac-api | node:22-slim + Chromium | 3000 | No (via Nginx) |
| sysfac-web | nginx:alpine | 80 | Si (via Traefik → HTTPS) |

**Flujo de red:**
```
Internet → Traefik (:443 SSL) → sysfac-web (Nginx :80)
                                    ├── / → Angular SPA
                                    └── /api/* → proxy → sysfac-api (:3000)
                                                            └── → sysfac-db (:3306)
```
