# Guia de Infraestructura — Server 2 (VPS nuevo)

> Montar infra base IDENTICA a Server 1: Docker + Traefik + Portainer + UFW.
> Al terminar esta guia, el server esta listo para recibir proyectos.

---

## Indice

1. [Arquitectura general (2 servidores)](#1-arquitectura-general-2-servidores)
2. [Requisitos del VPS](#2-requisitos-del-vps)
3. [Acceso inicial y seguridad](#3-acceso-inicial-y-seguridad)
4. [Instalar Docker y Docker Compose](#4-instalar-docker-y-docker-compose)
5. [Estructura de directorios](#5-estructura-de-directorios)
6. [Configurar Traefik (reverse proxy global)](#6-configurar-traefik-reverse-proxy-global)
7. [Configurar Portainer](#7-configurar-portainer)
8. [Configurar firewall (UFW)](#8-configurar-firewall-ufw)
9. [Reconfigurar Portainer en Server 1](#9-reconfigurar-portainer-en-server-1)
10. [Configurar DNS](#10-configurar-dns)
11. [Verificacion](#11-verificacion)

---

## 1. Arquitectura general (2 servidores)

```
                         DNS bowin.com.ar
                              |
              +---------------+------------------+
              |                                  |
        portainer.server1                  portainer.server2
        .bowin.com.ar                      .bowin.com.ar
              |                                  |
              v                                  v
   ┌──────────────────┐             ┌──────────────────┐
   │   SERVER 1        │             │   SERVER 2        │
   │   IP: X.X.X.X     │             │   IP: Y.Y.Y.Y     │
   │                   │             │                   │
   │ [ Traefik ]       │             │ [ Traefik ]       │
   │   |-- braillin    │             │   |-- bowin.com.ar│
   │   |   .com.ar     │             │   |   (ArchieTeam)│
   │   |               │             │   |               │
   │   |-- eljefe      │             │   |-- (futuros    │
   │   |   negocios    │             │   |   proyectos   │
   │   |   .com.ar     │             │   |   bajo bowin) │
   │   |               │             │   |               │
   │   |-- portainer   │             │   |-- portainer   │
   │       .server1    │             │       .server2    │
   │       .bowin...   │             │       .bowin...   │
   │                   │             │                   │
   │ [ Portainer ]     │             │ [ Portainer ]     │
   └──────────────────┘             └──────────────────┘
```

### Dominios por servidor

| Servidor | Dominio | Proyecto |
|----------|---------|----------|
| Server 1 | braillin.com.ar | Braillin |
| Server 1 | eljefenegocios.com.ar | BarberiaElJefe |
| Server 1 | portainer.server1.bowin.com.ar | Portainer Server 1 |
| Server 2 | bowin.com.ar / *.bowin.com.ar | ArchieTeam + futuros |
| Server 2 | portainer.server2.bowin.com.ar | Portainer Server 2 |

---

## 2. Requisitos del VPS

| Recurso | Minimo | Recomendado |
|---------|--------|-------------|
| CPU | 1 vCPU | 2 vCPU |
| RAM | 1 GB (solo SPAs) | 2+ GB (si va a tener backends) |
| Disco | 20 GB SSD | 40 GB SSD |
| SO | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |

> Si solo va a hospedar ArchieTeam (SPA pura), 1 GB de RAM alcanza. Si planeás agregar proyectos con backend/DB, ir a 2 GB+.

---

## 3. Acceso inicial y seguridad

### 3.1 Conectar por primera vez

```bash
ssh root@IP_SERVER_2
```

### 3.2 Actualizar el sistema

```bash
apt update && apt upgrade -y
```

### 3.3 Crear usuario de deploy

```bash
adduser deploy
usermod -aG sudo deploy

# Copiar clave SSH
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

### 3.4 Configurar SSH seguro

```bash
nano /etc/ssh/sshd_config
```

Cambiar/agregar:

```
Port 2222
PermitRootLogin no
PasswordAuthentication no
MaxAuthTries 3
AllowUsers deploy
```

```bash
systemctl restart sshd
```

> **IMPORTANTE:** Antes de cerrar esta sesion, verificar desde OTRA terminal:
> ```bash
> ssh -p 2222 deploy@IP_SERVER_2
> ```
> Si conecta, recien ahi cerrar la sesion root.

### 3.5 Timezone

```bash
sudo timedatectl set-timezone America/Argentina/Buenos_Aires
```

---

## 4. Instalar Docker y Docker Compose

Desde ahora todo se ejecuta como el usuario `deploy`.

### 4.1 Instalar Docker Engine

```bash
# Dependencias
sudo apt install -y ca-certificates curl gnupg

# Agregar repositorio oficial de Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar
docker --version         # Docker 27.x+
docker compose version   # Docker Compose v2.x+
```

### 4.2 Agregar usuario al grupo docker

```bash
sudo usermod -aG docker deploy

# Cerrar sesion y volver a entrar para que tome efecto
exit
ssh -p 2222 deploy@IP_SERVER_2

# Verificar (sin sudo)
docker ps
```

### 4.3 Instalar herramientas utiles

```bash
sudo apt install -y git htop curl wget
```

---

## 5. Estructura de directorios

```bash
sudo mkdir -p /opt/docker
sudo chown deploy:deploy /opt/docker

mkdir -p /opt/docker/traefik
mkdir -p /opt/docker/portainer
```

Estructura final:

```
/opt/docker/
├── traefik/
│   ├── docker-compose.yml
│   ├── traefik.yml
│   └── acme.json
├── portainer/
│   └── docker-compose.yml
├── archieteam/              <-- Primer proyecto (migrado)
│   └── ...
└── (futuros proyectos)/
```

---

## 6. Configurar Traefik (reverse proxy global)

### 6.1 Crear la red compartida

```bash
docker network create proxy
```

### 6.2 Verificar la version de la API Docker

```bash
docker version --format '{{.Server.APIVersion}}'
# Anotar este valor (ej: 1.45, 1.47, etc.)
# Se usa en el docker-compose de Traefik
```

### 6.3 Crear la configuracion de Traefik

```bash
nano /opt/docker/traefik/traefik.yml
```

```yaml
# === Traefik — Configuracion estatica (Server 2) ===

api:
  dashboard: true

entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"
    http:
      tls:
        certResolver: letsencrypt

providers:
  docker:
    endpoint: "unix:///var/run/docker.sock"
    exposedByDefault: false
    network: proxy

certificatesResolvers:
  letsencrypt:
    acme:
      email: desarrollo@idoneo.com
      storage: /acme.json
      httpChallenge:
        entryPoint: web

log:
  level: WARN
```

### 6.4 Crear el archivo de certificados

```bash
touch /opt/docker/traefik/acme.json
chmod 600 /opt/docker/traefik/acme.json
```

### 6.5 Docker Compose de Traefik

```bash
nano /opt/docker/traefik/docker-compose.yml
```

```yaml
services:
  traefik:
    image: traefik:v3.4
    container_name: traefik
    restart: unless-stopped
    environment:
      - DOCKER_API_VERSION=1.45    # <-- CAMBIAR al valor del paso 6.2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./traefik.yml:/traefik.yml:ro
      - ./acme.json:/acme.json
    networks:
      - proxy
    labels:
      # Dashboard de Traefik protegido
      - "traefik.enable=true"
      - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.server2.bowin.com.ar`)"
      - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
      - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
      - "traefik.http.routers.traefik-dashboard.service=api@internal"
      - "traefik.http.routers.traefik-dashboard.middlewares=traefik-auth"
      - "traefik.http.middlewares.traefik-auth.basicauth.users=admin:$$2y$$10$$HASH_AQUI"

networks:
  proxy:
    external: true
```

### 6.6 Generar password para el dashboard de Traefik

```bash
sudo apt install -y apache2-utils

# Generar hash (cambiar 'TU_PASSWORD')
htpasswd -nbB admin TU_PASSWORD
# Output: admin:$2y$05$xxxxx...

# Copiar el output y pegarlo en la label basicauth.users
# IMPORTANTE: en docker-compose, escapar cada $ con $$ (duplicar)
# Ejemplo: admin:$2y$05$abc → admin:$$2y$$05$$abc
```

> **Si no queres dashboard de Traefik**, borra todas las labels del servicio. El proxy sigue funcionando igual.

### 6.7 Levantar Traefik

```bash
cd /opt/docker/traefik
docker compose up -d

# Verificar
docker compose logs -f
# Debe mostrar: "Configuration loaded from file: /traefik.yml"
# Ctrl+C para salir
```

---

## 7. Configurar Portainer

### 7.1 Docker Compose de Portainer

```bash
nano /opt/docker/portainer/docker-compose.yml
```

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.server2.bowin.com.ar`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    external: true

volumes:
  portainer_data:
```

### 7.2 Levantar Portainer

```bash
cd /opt/docker/portainer
docker compose up -d
```

### 7.3 Setup inicial

1. Abrir `https://portainer.server2.bowin.com.ar` en el navegador
2. Crear el usuario admin (primera vez)
3. Seleccionar "Docker" como entorno
4. Listo

> **Nota:** Portainer tiene un timeout de 5 minutos para crear el usuario admin la primera vez. Si ves "Portainer instance timed out", reiniciar el container:
> ```bash
> cd /opt/docker/portainer
> docker compose restart
> ```

---

## 8. Configurar firewall (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH
sudo ufw allow 2222/tcp comment 'SSH'

# HTTP y HTTPS (solo Traefik los usa)
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

sudo ufw enable
sudo ufw status verbose
```

Resultado esperado:
```
To                         Action      From
--                         ------      ----
2222/tcp                   ALLOW       Anywhere      # SSH
80/tcp                     ALLOW       Anywhere      # HTTP
443/tcp                    ALLOW       Anywhere      # HTTPS
```

---

## 9. Reconfigurar Portainer en Server 1

El Portainer de Server 1 actualmente responde en algun subdominio. Hay que cambiarlo a `portainer.server1.bowin.com.ar`.

### 9.1 Conectar a Server 1

```bash
ssh -p 2222 deploy@IP_SERVER_1
```

### 9.2 Editar el docker-compose de Portainer

```bash
nano /opt/docker/portainer/docker-compose.yml
```

Cambiar la label del dominio:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:lts
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - portainer_data:/data
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.portainer.rule=Host(`portainer.server1.bowin.com.ar`)"
      - "traefik.http.routers.portainer.entrypoints=websecure"
      - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
      - "traefik.http.services.portainer.loadbalancer.server.port=9000"

networks:
  proxy:
    external: true

volumes:
  portainer_data:
```

### 9.3 Recrear el container

```bash
cd /opt/docker/portainer
docker compose up -d
```

> Traefik detecta el cambio de label y genera el certificado SSL para el nuevo dominio automaticamente.

---

## 10. Configurar DNS

En el panel DNS de **bowin.com.ar**, crear estos registros:

| Tipo | Nombre | Valor | TTL | Donde apunta |
|------|--------|-------|-----|--------------|
| A | `portainer.server1` | `IP_SERVER_1` | 300 | Portainer del Server 1 |
| A | `portainer.server2` | `IP_SERVER_2` | 300 | Portainer del Server 2 |
| A | `traefik.server2` | `IP_SERVER_2` | 300 | Dashboard Traefik Server 2 (opcional) |

> Los registros de los proyectos (bowin.com.ar, archie.bowin.com.ar, etc.) se configuran en la guia de migracion.

### Verificar propagacion

```bash
# Desde cualquier maquina
dig portainer.server1.bowin.com.ar +short
# Debe mostrar IP_SERVER_1

dig portainer.server2.bowin.com.ar +short
# Debe mostrar IP_SERVER_2
```

> La propagacion DNS puede tardar entre 5 minutos y 24 horas. Si usas Cloudflare o similar, suele ser casi instantaneo.

---

## 11. Verificacion

### Checklist final

```
[ ] Server 2 accesible por SSH en puerto 2222
[ ] Docker instalado y funcionando (docker ps sin errores)
[ ] Red "proxy" creada (docker network ls | grep proxy)
[ ] Traefik corriendo (docker ps | grep traefik)
[ ] Traefik sin errores en logs
[ ] Portainer corriendo (docker ps | grep portainer)
[ ] UFW activo con reglas correctas (sudo ufw status)
[ ] DNS portainer.server2.bowin.com.ar apunta a IP_SERVER_2
[ ] https://portainer.server2.bowin.com.ar carga y tiene SSL
[ ] DNS portainer.server1.bowin.com.ar apunta a IP_SERVER_1
[ ] https://portainer.server1.bowin.com.ar carga y tiene SSL
[ ] Ambos Portainer accesibles desde el navegador
```

### Resultado

Al completar esta guia tenes:
- Server 2 con infra identica a Server 1
- Ambos Portainer accesibles bajo subdominios de bowin.com.ar
- Server 2 listo para recibir proyectos (seguir con la guia de migracion)

---

## Referencia rapida — Comandos post-setup

```bash
# === Server 2 ===
ssh -p 2222 deploy@IP_SERVER_2

# Estado general
docker ps -a
docker stats --no-stream

# Logs Traefik
docker logs traefik --tail 50

# Logs Portainer
cd /opt/docker/portainer && docker compose logs -f

# Espacio en disco
df -h
docker system df
```
