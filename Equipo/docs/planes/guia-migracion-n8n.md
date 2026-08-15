# Guia de Migracion — n8n a Server 2

> Migrar n8n de Server 1 a Server 2 con TODOS los workflows y credenciales.
> Dominio final: `n8n.bowin.com.ar`
>
> **Prerequisito:** Server 2 con infra base montada (guia-infra-server2.md).

---

## Indice

1. [Que se migra](#1-que-se-migra)
2. [Exportar datos de Server 1](#2-exportar-datos-de-server-1)
3. [Configurar n8n en Server 2](#3-configurar-n8n-en-server-2)
4. [Importar datos en Server 2](#4-importar-datos-en-server-2)
5. [Configurar DNS](#5-configurar-dns)
6. [Post-migracion: ajustes necesarios](#6-post-migracion-ajustes-necesarios)
7. [Verificacion](#7-verificacion)
8. [Limpiar n8n de Server 1](#8-limpiar-n8n-de-server-1)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Que se migra

| Componente | Metodo |
|------------|--------|
| Workflows (5+) | Copia del volumen de datos |
| Credenciales (Telegram, SSH, etc.) | Copia del volumen + misma encryption key |
| Ejecuciones historicas | Copia del volumen (SQLite) |
| Configuracion | Variables de entorno en docker-compose |

### Workflows actuales
- Archie Bot - Menu (router principal)
- Pendientes (sub-workflow)
- SSL Check (sub-workflow)
- Coach (sub-workflow)
- Coach Reminder (cron independiente)

### Que cambia al migrar
- **Ya no se necesita Cloudflare Tunnel** — Traefik da SSL directo
- **Webhook URL cambia** a `https://n8n.bowin.com.ar`
- **archie-db-server** — si usa MySQL del Server 1 o local, hay que resolver la conexion (ver seccion 6)

---

## 2. Exportar datos de Server 1

### 2.1 Conectar a Server 1

```bash
ssh -p 2222 deploy@IP_SERVER_1
```

### 2.2 Encontrar el volumen de datos de n8n

```bash
# Ver donde esta montado el volumen de n8n
docker inspect n8n | grep -A 5 "Mounts"

# O buscar el volumen
docker volume ls | grep n8n
docker volume inspect n8n_data    # (o como se llame)
```

> El volumen contiene la base SQLite (`database.sqlite`) con todos los workflows, credenciales y ejecuciones.

### 2.3 Obtener la encryption key

Las credenciales de n8n (tokens de Telegram, SSH keys, etc.) estan encriptadas con esta clave. **Sin ella, las credenciales no se pueden leer en el nuevo server.**

```bash
# Buscar en el docker-compose o en variables del container
docker inspect n8n | grep -i N8N_ENCRYPTION_KEY

# O en el docker-compose
cat /opt/docker/n8n/docker-compose.yml | grep ENCRYPTION

# O en el .env
cat /opt/docker/n8n/.env | grep ENCRYPTION
```

> **Si no hay encryption key definida**, n8n usa una key autogenerada guardada en el volumen de datos (archivo `.n8n/config`). En ese caso, al copiar todo el volumen se copia tambien la key.

**ANOTAR ESTA CLAVE — es critica para la migracion.**

### 2.4 Copiar el volumen de datos

```bash
# Parar n8n para evitar escrituras durante la copia
cd /opt/docker/n8n    # o donde este el docker-compose
docker compose stop

# Encontrar la ruta del volumen
docker volume inspect n8n_data --format '{{.Mountpoint}}'
# Ejemplo: /var/lib/docker/volumes/n8n_data/_data

# Comprimir los datos
sudo tar czf /tmp/n8n-backup.tar.gz -C /var/lib/docker/volumes/n8n_data/_data .

# Verificar el tamanio
ls -lh /tmp/n8n-backup.tar.gz
```

### 2.5 Transferir al Server 2

```bash
# Desde Server 1, enviar a Server 2
scp -P 2222 /tmp/n8n-backup.tar.gz deploy@IP_SERVER_2:/tmp/

# O desde tu maquina local como puente:
# Desde Server 1 a local:
scp -P 2222 deploy@IP_SERVER_1:/tmp/n8n-backup.tar.gz .
# Desde local a Server 2:
scp -P 2222 n8n-backup.tar.gz deploy@IP_SERVER_2:/tmp/
```

### 2.6 (Alternativa) Exportar via API en vez de volumen

Si preferis exportar solo los workflows sin tocar volumenes:

```bash
# Exportar todos los workflows como JSON
curl -H "X-N8N-API-KEY: TU_API_KEY" \
  http://localhost:5678/api/v1/workflows | jq > /tmp/n8n-workflows.json

# Exportar credenciales
curl -H "X-N8N-API-KEY: TU_API_KEY" \
  http://localhost:5678/api/v1/credentials | jq > /tmp/n8n-credentials.json
```

> **Atencion:** La API exporta credenciales SIN los valores secretos (tokens, passwords). El metodo del volumen es el unico que preserva todo.

---

## 3. Configurar n8n en Server 2

### 3.1 Conectar a Server 2

```bash
ssh -p 2222 deploy@IP_SERVER_2
```

### 3.2 Crear estructura

```bash
mkdir -p /opt/docker/n8n
cd /opt/docker/n8n
```

### 3.3 Crear .env

```bash
nano /opt/docker/n8n/.env
```

```env
# === n8n ===
N8N_HOST=n8n.bowin.com.ar
N8N_PORT=5678
N8N_PROTOCOL=https
WEBHOOK_URL=https://n8n.bowin.com.ar/

# Encryption key — DEBE SER LA MISMA del Server 1
# Sin esto las credenciales migradas no se pueden desencriptar
N8N_ENCRYPTION_KEY=LA_CLAVE_DEL_PASO_2.3

# Timezone
GENERIC_TIMEZONE=America/Argentina/Buenos_Aires
TZ=America/Argentina/Buenos_Aires

# Auth basica (proteger la UI)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=TU_PASSWORD_SEGURA

# Ejecuciones
EXECUTIONS_DATA_PRUNE=true
EXECUTIONS_DATA_MAX_AGE=168

# Logging
N8N_LOG_LEVEL=info
```

```bash
chmod 600 /opt/docker/n8n/.env
```

### 3.4 Docker Compose

```bash
nano /opt/docker/n8n/docker-compose.yml
```

```yaml
services:
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    env_file:
      - .env
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`n8n.bowin.com.ar`)"
      - "traefik.http.routers.n8n.entrypoints=websecure"
      - "traefik.http.routers.n8n.tls.certresolver=letsencrypt"
      - "traefik.http.services.n8n.loadbalancer.server.port=5678"

networks:
  proxy:
    external: true

volumes:
  n8n_data:
```

### 3.5 Levantar n8n (vacio primero, para que cree el volumen)

```bash
cd /opt/docker/n8n
docker compose up -d

# Verificar que arranca
docker compose logs -f n8n
# Esperar a ver "n8n ready on 0.0.0.0, port 5678"
# Ctrl+C

# Parar para cargar los datos migrados
docker compose stop
```

---

## 4. Importar datos en Server 2

### 4.1 Restaurar el volumen

```bash
# Encontrar la ruta del volumen creado
docker volume inspect n8n_n8n_data --format '{{.Mountpoint}}'
# Ejemplo: /var/lib/docker/volumes/n8n_n8n_data/_data

# Limpiar el contenido actual (solo tiene datos vacios del primer arranque)
sudo rm -rf /var/lib/docker/volumes/n8n_n8n_data/_data/*

# Restaurar el backup
sudo tar xzf /tmp/n8n-backup.tar.gz -C /var/lib/docker/volumes/n8n_n8n_data/_data/

# Ajustar permisos (n8n corre como usuario node, UID 1000)
sudo chown -R 1000:1000 /var/lib/docker/volumes/n8n_n8n_data/_data/

# Verificar
sudo ls -la /var/lib/docker/volumes/n8n_n8n_data/_data/
# Debe mostrar: database.sqlite, config, y posiblemente .cache/
```

### 4.2 Levantar n8n con los datos migrados

```bash
cd /opt/docker/n8n
docker compose up -d

# Verificar logs
docker compose logs -f n8n
# Debe arrancar sin errores de encryption
# Debe mostrar los workflows cargados
```

### 4.3 Limpiar backup

```bash
rm /tmp/n8n-backup.tar.gz
```

---

## 5. Configurar DNS

En el panel DNS de **bowin.com.ar**, agregar:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | `n8n` | `IP_SERVER_2` | 300 |

Verificar:
```bash
dig n8n.bowin.com.ar +short
# Debe mostrar IP_SERVER_2
```

---

## 6. Post-migracion: ajustes necesarios

### 6.1 Actualizar Webhook URL del bot de Telegram

El bot de Telegram tiene su webhook apuntando al Cloudflare Tunnel viejo. Hay que actualizarlo al nuevo dominio.

```bash
# Actualizar webhook de Telegram al nuevo dominio
curl -X POST "https://api.telegram.org/botTU_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://n8n.bowin.com.ar/webhook/TU_WEBHOOK_PATH"}'

# Verificar
curl "https://api.telegram.org/botTU_BOT_TOKEN/getWebhookInfo" | jq
```

> **Para encontrar el webhook path:** Abrir el workflow "Archie Bot - Menu" en n8n → nodo Telegram Trigger → copiar el path del webhook.

### 6.2 Resolver conexion al archie-db-server

El n8n viejo se conectaba a `http://host.docker.internal:3456` (archie-db-server local que conectaba a MySQL de XAMPP).

**Opciones:**

**A) Si el MySQL con los pendientes esta en Server 1:**
- Abrir puerto 3456 en Server 1 (o usar un tunnel SSH)
- En los workflows, cambiar `host.docker.internal:3456` por `IP_SERVER_1:3456`
- Asegurar que el firewall de Server 1 permita la conexion

**B) Mover archie-db-server a Server 2 (recomendado):**

Los archivos estan listos en `Equipo/deploy/archie-db/`. Seguir estos pasos:

#### B.1 Subir archivos al servidor

Desde tu maquina local:
```bash
scp -P 2222 -r C:/xampp/htdocs/Equipo/deploy/archie-db deploy@IP_SERVER_2:/opt/docker/
```

#### B.2 Crear el .env

```bash
ssh -p 2222 deploy@IP_SERVER_2
cd /opt/docker/archie-db
cp .env.example .env
nano .env
```

```env
MYSQL_ROOT_PASSWORD=GENERAR_CON_openssl_rand_-hex_32
MYSQL_USER=archie
MYSQL_PASSWORD=GENERAR_CON_openssl_rand_-hex_32
```

```bash
chmod 600 .env
```

#### B.3 Levantar

```bash
cd /opt/docker/archie-db
docker compose up -d --build

# Verificar
docker compose ps
# archie-mysql debe estar "healthy"
# archie-db debe estar "Up"
```

#### B.4 Importar datos existentes (si tenes datos en XAMPP local)

Desde tu maquina local con XAMPP MySQL corriendo:
```bash
# Exportar ambas bases
"C:/xampp/mysql/bin/mysqldump.exe" -u root archie_team > archie_team.sql
"C:/xampp/mysql/bin/mysqldump.exe" -u root coach > coach.sql

# Subir al servidor
scp -P 2222 archie_team.sql coach.sql deploy@IP_SERVER_2:/tmp/
```

En Server 2:
```bash
# Importar
docker exec -i archie-mysql mysql -u root -pTU_ROOT_PASSWORD archie_team < /tmp/archie_team.sql
docker exec -i archie-mysql mysql -u root -pTU_ROOT_PASSWORD coach < /tmp/coach.sql

# Verificar
docker exec archie-mysql mysql -u archie -pTU_ARCHIE_PASSWORD archie_team -e "SELECT * FROM proyectos;"
docker exec archie-mysql mysql -u archie -pTU_ARCHIE_PASSWORD coach -e "SELECT COUNT(*) FROM coach_log;"

# Limpiar
rm /tmp/archie_team.sql /tmp/coach.sql
```

#### B.5 Actualizar URLs en workflows de n8n

En n8n, abrir cada workflow que use archie-db-server y cambiar la URL:

| Antes | Despues |
|-------|---------|
| `http://host.docker.internal:3456` | `http://archie-db:3456` |

Workflows a revisar:
- Archie Bot - Menu (nodos que llaman al db-server)
- Pendientes (sub-workflow)
- Coach (sub-workflow)
- Coach Reminder (cron)

> `archie-db` funciona como hostname porque ambos containers (n8n y archie-db) estan en la red `proxy`.

**C) Si los pendientes se manejan sin DB externa:**
- Desactivar/ajustar los workflows que usen archie-db-server

### 6.3 Actualizar credencial SSH (si usas SSH Check)

Si el workflow de SSL Check se conecta a Server 1 via SSH, verificar que la credencial SSH (`bMa4wXvgRxg07ORl`) sigue funcionando desde Server 2. Si la clave SSH esta en el volumen de n8n, ya se migro.

### 6.4 Activar workflows

Despues de la migracion, los workflows deberian mantener su estado (activos/inactivos). Verificar en la UI de n8n que esten activos los que correspondan:

```
[ ] Archie Bot - Menu → Activo
[ ] Pendientes → Activo
[ ] SSL Check → Activo
[ ] Coach → Activo
[ ] Coach Reminder → Activo
```

---

## 7. Verificacion

### Checklist

```
[ ] https://n8n.bowin.com.ar carga la UI de n8n
[ ] SSL valido (candado verde)
[ ] Login funciona con las credenciales configuradas
[ ] Todos los workflows aparecen en la lista
[ ] Las credenciales se ven (Telegram, SSH, etc.)
[ ] Workflows activos que correspondan
[ ] Bot de Telegram responde al enviar /start
[ ] Webhook del bot apunta a n8n.bowin.com.ar (no al tunnel viejo)
[ ] Cloudflare Tunnel ya no es necesario
```

### Test del bot

1. Abrir Telegram → bot de Archie
2. Enviar `/start` o tocar un boton del menu
3. Verificar que responde correctamente

---

## 8. Limpiar n8n de Server 1

**Solo despues de verificar que todo funciona en Server 2.**

### 8.1 En Server 1

```bash
ssh -p 2222 deploy@IP_SERVER_1

# Parar y eliminar container
cd /opt/docker/n8n    # o donde este
docker compose down

# Eliminar volumen (CUIDADO: esto borra los datos del n8n viejo)
docker compose down -v

# Eliminar carpeta
rm -rf /opt/docker/n8n

# Limpiar imagenes
docker image prune -a
```

### 8.2 Desactivar Cloudflare Tunnel

Si tenias `cloudflared` corriendo en Server 1 o localmente solo para n8n, ya no lo necesitas. El tunnel se puede detener.

```bash
# Si corre como servicio
sudo systemctl stop cloudflared
sudo systemctl disable cloudflared

# Si corre como proceso
# Solo no lo vuelvas a iniciar
```

---

## 9. Troubleshooting

### "Error decrypting credentials"

```bash
# La encryption key no coincide
# Verificar que N8N_ENCRYPTION_KEY en .env es EXACTAMENTE la misma del server viejo
docker compose logs n8n | grep -i "encrypt"

# Si no tenes la key original, no hay forma de recuperar las credenciales
# Tendras que recrearlas manualmente en la UI de n8n
```

### n8n no arranca / crash loop

```bash
docker compose logs n8n --tail 50

# Causas comunes:
# 1. Permisos del volumen (debe ser uid 1000)
sudo chown -R 1000:1000 /var/lib/docker/volumes/n8n_n8n_data/_data/

# 2. database.sqlite corrupto
# Verificar integridad:
docker compose exec n8n sqlite3 /home/node/.n8n/database.sqlite "PRAGMA integrity_check;"
```

### Webhook de Telegram no funciona

```bash
# Verificar que el webhook apunta al nuevo dominio
curl "https://api.telegram.org/botTU_BOT_TOKEN/getWebhookInfo" | jq

# Si apunta al tunnel viejo, actualizar:
curl -X POST "https://api.telegram.org/botTU_BOT_TOKEN/setWebhook" \
  -d "url=https://n8n.bowin.com.ar/webhook/TU_WEBHOOK_PATH"
```

### No puedo conectar al archie-db-server

```bash
# Si el DB server esta en Server 1, verificar conectividad
curl http://IP_SERVER_1:3456/health

# Si no responde, verificar firewall de Server 1
ssh -p 2222 deploy@IP_SERVER_1
sudo ufw status
# Si el puerto 3456 no esta abierto:
sudo ufw allow from IP_SERVER_2 to any port 3456 comment 'archie-db from Server 2'
```

### 502 Bad Gateway

```bash
# Verificar que n8n esta en la red proxy
docker network inspect proxy | grep n8n

# Recrear
docker compose down && docker compose up -d
```

---

## Resumen del flujo

```
 SERVER 1 — EXPORTAR
 ─────────────────────────────────
 1. Anotar N8N_ENCRYPTION_KEY
 2. Parar n8n
 3. Comprimir volumen de datos
 4. Transferir a Server 2

 SERVER 2 — CONFIGURAR
 ─────────────────────────────────
 5. Crear docker-compose + .env (con misma encryption key)
 6. Levantar n8n vacio (crea volumen)
 7. Parar, restaurar backup en el volumen
 8. Levantar con datos migrados

 DNS + AJUSTES
 ─────────────────────────────────
 9. Agregar A record: n8n.bowin.com.ar → IP_SERVER_2
 10. Actualizar webhook de Telegram al nuevo dominio
 11. Ajustar conexion a archie-db-server si aplica
 12. Verificar workflows activos

 LIMPIEZA
 ─────────────────────────────────
 13. Verificar que todo funciona
 14. Bajar n8n de Server 1
 15. Desactivar Cloudflare Tunnel
```
