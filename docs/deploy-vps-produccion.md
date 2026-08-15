# Deploy SysFac — VPS Produccion

> **Dominio:** sysfac.bowin.com.ar
> **Servidor:** Server 2 (mismo que ArchieTeam, n8n)
> **Repo:** https://github.com/VallejoJuanPablo/sysfac.git
> **Stack:** Angular 19 + Node.js/Express + MySQL 8 + Puppeteer
> **Infra:** Docker + Traefik (ya configurado en Server 2)

---

## Indice

1. [Prerequisitos](#1-prerequisitos)
2. [Configurar DNS](#2-configurar-dns)
3. [Clonar el repositorio](#3-clonar-el-repositorio)
4. [Variables de entorno (.env)](#4-variables-de-entorno-env)
5. [Levantar y verificar](#5-levantar-y-verificar)
6. [Seed de la base de datos](#6-seed-de-la-base-de-datos)
7. [Verificacion final](#7-verificacion-final)
8. [Actualizar (deploy de nueva version)](#8-actualizar-deploy-de-nueva-version)
9. [Troubleshooting](#9-troubleshooting)
10. [Comandos utiles](#10-comandos-utiles)

---

## 1. Prerequisitos

El Server 2 ya tiene la infra base:
- Docker + Docker Compose
- Traefik v3.x como reverse proxy (red `proxy`)
- Portainer en portainer.server2.bowin.com.ar
- UFW con puertos 80/443 abiertos
- Git instalado

**Verificar en el VPS:**
```bash
docker --version          # Docker 24+
docker compose version    # v2.x
docker network ls | grep proxy  # Red 'proxy' debe existir
git --version             # Git 2.x
```

---

## 2. Configurar DNS

Agregar un registro **A** en el panel DNS de bowin.com.ar:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | sysfac | IP_DEL_SERVER_2 | 300 |

> Si ya tenes un wildcard `*.bowin.com.ar` apuntando al Server 2, este paso no es necesario. Verificar con `nslookup sysfac.bowin.com.ar`.

---

## 3. Clonar el repositorio

```bash
cd /opt/docker
git clone https://github.com/VallejoJuanPablo/sysfac.git sysfac
cd sysfac
```

El repo ya contiene todo lo necesario:
```
/opt/docker/sysfac/
├── docker-compose.yml
├── backend/
│   ├── Dockerfile
│   ├── src/
│   ├── prisma/
│   ├── assets/modelo-vacio.jpg
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/
│   ├── angular.json
│   ├── package.json
│   └── .postcssrc.json
└── docs/
```

---

## 4. Variables de entorno (.env)

Crear el `.env` en la raiz del proyecto (no se commitea al repo):

```bash
cd /opt/docker/sysfac

# Generar passwords seguras
MYSQL_PASS=$(openssl rand -hex 32)
JWT_SEC=$(openssl rand -hex 64)

cat > .env << EOF
# MySQL
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 32)
MYSQL_DATABASE=sysfac
MYSQL_USER=sysfac_user
MYSQL_PASSWORD=${MYSQL_PASS}

# Backend
DATABASE_URL=mysql://sysfac_user:${MYSQL_PASS}@sysfac-db:3306/sysfac
JWT_SECRET=${JWT_SEC}
PORT=3000
NODE_ENV=production

# Dominio
DOMAIN=sysfac.bowin.com.ar
EOF

echo "=== .env generado ==="
cat .env
```

> **ANOTAR:** Las credenciales del login admin son `pituco / pituco`. Se crean con el seed.

---

## 5. Levantar y verificar

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

## 6. Seed de la base de datos

Despues de que MySQL este healthy, ejecutar migraciones y seed:

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

## 7. Verificacion final

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

## 8. Actualizar (deploy de nueva version)

Cuando se pushean cambios al repo, actualizar en el VPS:

```bash
cd /opt/docker/sysfac

# Traer cambios
git pull origin master

# Rebuild y restart
docker compose up -d --build

# Si hay migraciones nuevas de Prisma
docker compose exec sysfac-api npx prisma migrate deploy
```

> Los datos de la base de datos se mantienen (volume persistente `sysfac_db_data`).

---

## 9. Troubleshooting

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
# Si es necesario, borrar y recrear (PIERDE DATOS)
docker compose down -v
docker compose up -d --build
```

### Puppeteer falla al generar PDF
```bash
# Verificar que Chromium esta instalado en el container
docker compose exec sysfac-api which chromium
# Debe retornar: /usr/bin/chromium

# Si no encuentra Chromium, rebuild sin cache
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
# Actualizar .env y docker compose restart
```

---

## 10. Comandos utiles

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

# Ver logs de un container especifico
docker compose logs -f sysfac-api --tail 100
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
