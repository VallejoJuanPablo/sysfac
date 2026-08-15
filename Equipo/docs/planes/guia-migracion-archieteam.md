# Guia de Migracion — ArchieTeam a Server 2

> Mover ArchieTeam de Server 1 a Server 2 y configurar dominios bowin.com.ar.
>
> **Prerequisito:** Haber completado la guia de infraestructura de Server 2 (guia-infra-server2.md).

---

## Indice

1. [Plan de migracion](#1-plan-de-migracion)
2. [Configurar DNS de bowin.com.ar](#2-configurar-dns-de-bowincom-ar)
3. [Desplegar ArchieTeam en Server 2](#3-desplegar-archieteam-en-server-2)
4. [Verificacion en Server 2](#4-verificacion-en-server-2)
5. [Limpiar ArchieTeam de Server 1](#5-limpiar-archieteam-de-server-1)
6. [Verificacion final](#6-verificacion-final)
7. [Troubleshooting](#7-troubleshooting)

---

## 1. Plan de migracion

### Estado actual

```
SERVER 1 (IP: X.X.X.X)
├── Braillin         → braillin.com.ar        (SE QUEDA)
├── BarberiaElJefe   → eljefenegocios.com.ar   (SE QUEDA)
└── ArchieTeam       → archie.bowin.com.ar     (SE MUEVE)
```

### Estado final

```
SERVER 1 (IP: X.X.X.X)                    SERVER 2 (IP: Y.Y.Y.Y)
├── Braillin         → braillin.com.ar     ├── ArchieTeam  → bowin.com.ar
├── BarberiaElJefe   → eljefenegocios...   │                  (o archie.bowin...)
├── Portainer        → portainer.server1   ├── Portainer   → portainer.server2
│                      .bowin.com.ar       │                  .bowin.com.ar
└── (Traefik)                              └── (Traefik)
```

### Riesgo

**Bajo.** ArchieTeam es una SPA estatica sin base de datos ni uploads. No hay datos que migrar — solo se clona el repo y se buildea en el nuevo server. Downtime: solo el tiempo que tarde en propagarse el DNS (segundos a minutos si es Cloudflare).

### Orden de operaciones

1. Configurar DNS (apuntar bowin.com.ar a Server 2)
2. Desplegar ArchieTeam en Server 2
3. Verificar que funciona
4. Bajar ArchieTeam de Server 1
5. Limpiar

---

## 2. Configurar DNS de bowin.com.ar

En el panel DNS de **bowin.com.ar**, actualizar/crear estos registros:

### Registros que apuntan a Server 2 (IP: Y.Y.Y.Y)

| Tipo | Nombre | Valor | TTL | Proposito |
|------|--------|-------|-----|-----------|
| A | `@` | `IP_SERVER_2` | 300 | bowin.com.ar (raiz) |
| A | `www` | `IP_SERVER_2` | 300 | www.bowin.com.ar |
| A | `archie` | `IP_SERVER_2` | 300 | archie.bowin.com.ar |
| A | `portainer.server2` | `IP_SERVER_2` | 300 | Portainer Server 2 |

### Registros que apuntan a Server 1 (IP: X.X.X.X)

| Tipo | Nombre | Valor | TTL | Proposito |
|------|--------|-------|-----|-----------|
| A | `portainer.server1` | `IP_SERVER_1` | 300 | Portainer Server 1 |

> **Nota:** Si `bowin.com.ar` tenia registros A apuntando a Server 1, hay que CAMBIARLOS a Server 2. Solo `portainer.server1` sigue apuntando a Server 1.

### Verificar propagacion

```bash
dig bowin.com.ar +short
# Debe mostrar IP_SERVER_2

dig archie.bowin.com.ar +short
# Debe mostrar IP_SERVER_2

dig portainer.server1.bowin.com.ar +short
# Debe mostrar IP_SERVER_1

dig portainer.server2.bowin.com.ar +short
# Debe mostrar IP_SERVER_2
```

---

## 3. Desplegar ArchieTeam en Server 2

### 3.1 Conectar a Server 2

```bash
ssh -p 2222 deploy@IP_SERVER_2
```

### 3.2 Crear la carpeta del proyecto

```bash
mkdir -p /opt/docker/archieteam
cd /opt/docker/archieteam
```

### 3.3 Clonar el repositorio

```bash
# Si el repo es publico:
git clone https://github.com/VallejoJuanPablo/archieteam.git repo

# Si es privado, configurar deploy key:
ssh-keygen -t ed25519 -f ~/.ssh/archieteam_deploy -N ""
cat ~/.ssh/archieteam_deploy.pub
# Copiar → GitHub → repo Settings → Deploy Keys → Add

nano ~/.ssh/config
```
```
Host github-archieteam
    HostName github.com
    User git
    IdentityFile ~/.ssh/archieteam_deploy
```
```bash
git clone git@github-archieteam:VallejoJuanPablo/archieteam.git repo
```

### 3.4 Verificar que los archivos de deploy existen

```bash
ls repo/Dockerfile repo/nginx.conf repo/docker-compose.prod.yml
# Los 3 deben existir (fueron creados en la rama docs/deploy-manual)
```

> Si los archivos estan en la rama `docs/deploy-manual` y no en `master`:
> ```bash
> cd repo
> git checkout docs/deploy-manual
> cd ..
> ```

### 3.5 Verificar/ajustar el dominio en docker-compose.prod.yml

```bash
nano repo/docker-compose.prod.yml
```

Verificar que las labels de Traefik apunten al dominio correcto. Debe verse asi:

```yaml
services:
  archieteam-web:
    build: .
    container_name: archieteam-web
    restart: unless-stopped
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.archieteam.rule=Host(`bowin.com.ar`) || Host(`www.bowin.com.ar`) || Host(`archie.bowin.com.ar`)"
      - "traefik.http.routers.archieteam.entrypoints=websecure"
      - "traefik.http.routers.archieteam.tls.certresolver=letsencrypt"
      - "traefik.http.services.archieteam.loadbalancer.server.port=80"
      # Redirigir www → sin www (opcional)
      - "traefik.http.routers.archieteam-www.rule=Host(`www.bowin.com.ar`)"
      - "traefik.http.routers.archieteam-www.entrypoints=websecure"
      - "traefik.http.routers.archieteam-www.tls.certresolver=letsencrypt"
      - "traefik.http.routers.archieteam-www.middlewares=archieteam-redirect-www"
      - "traefik.http.middlewares.archieteam-redirect-www.redirectregex.regex=^https://www\\.(.+)"
      - "traefik.http.middlewares.archieteam-redirect-www.redirectregex.replacement=https://$${1}"
      - "traefik.http.middlewares.archieteam-redirect-www.redirectregex.permanent=true"

networks:
  proxy:
    external: true
```

> **Decidir dominio principal:** La regla `Host()` acepta los 3 subdominios (`bowin.com.ar`, `www.bowin.com.ar`, `archie.bowin.com.ar`). Si solo queres usar uno, simplificar la regla. Ejemplos:
> - Solo raiz: `Host(\`bowin.com.ar\`)`
> - Solo archie: `Host(\`archie.bowin.com.ar\`)`
> - Ambos: como esta arriba

### 3.6 Opcion A: Build en el servidor

```bash
cd /opt/docker/archieteam/repo
docker compose -f docker-compose.prod.yml up -d --build
```

### 3.6 Opcion B: Build local (recomendado si el VPS tiene poca RAM)

Desde tu maquina local (Git Bash):

```bash
cd C:/xampp/htdocs/Personal/ArchieTeam

# Buildear imagen para linux
docker build --platform linux/amd64 -t archieteam-web:latest .

# Exportar
docker save archieteam-web:latest | gzip > archieteam-web.tar.gz

# Subir al server
scp -P 2222 archieteam-web.tar.gz deploy@IP_SERVER_2:/tmp/
```

En Server 2:

```bash
# Cargar imagen
docker load < /tmp/archieteam-web.tar.gz

# Levantar con la imagen pre-buildeada
cd /opt/docker/archieteam/repo
docker compose -f docker-compose.server.yml up -d

# Limpiar
rm /tmp/archieteam-web.tar.gz
```

### 3.7 Verificar que el container esta corriendo

```bash
docker ps | grep archieteam
# Debe mostrar archieteam-web con status "Up"

# Logs
cd /opt/docker/archieteam/repo
docker compose -f docker-compose.prod.yml logs -f archieteam-web
```

---

## 4. Verificacion en Server 2

### Checklist

```
[ ] https://bowin.com.ar carga (si configuraste la raiz)
[ ] https://archie.bowin.com.ar carga la home (PRESS START)
[ ] Navegar a /agents funciona
[ ] Navegar a /skills funciona
[ ] Navegar a /rules funciona
[ ] Navegar a /projects funciona
[ ] Navegar a /methodologies funciona
[ ] Refresh en /agents NO da 404 (SPA routing)
[ ] http:// redirige a https://
[ ] Certificado SSL valido (candado verde)
[ ] Estilos retro 8-bit se ven correctamente
[ ] https://portainer.server2.bowin.com.ar funciona
```

### Verificar SSL

```bash
curl -I https://archie.bowin.com.ar
# Debe responder 200
```

> Si el SSL no se genera inmediatamente, esperar 1-2 minutos. Traefik pide el certificado a Let's Encrypt cuando llega el primer request.

---

## 5. Limpiar ArchieTeam de Server 1

**Solo hacer esto DESPUES de verificar que todo funciona en Server 2.**

### 5.1 Conectar a Server 1

```bash
ssh -p 2222 deploy@IP_SERVER_1
```

### 5.2 Bajar el container

```bash
cd /opt/docker/archieteam/repo
docker compose -f docker-compose.prod.yml down
# O si usa docker-compose.server.yml:
docker compose -f docker-compose.server.yml down
```

### 5.3 Eliminar la carpeta (opcional)

```bash
# Verificar que los otros proyectos siguen corriendo
docker ps
# Debe mostrar: traefik, portainer, braillin-*, barberia-*

# Si todo esta bien, eliminar archieteam
rm -rf /opt/docker/archieteam
```

### 5.4 Limpiar imagenes no usadas

```bash
docker image prune -a
# Responder 'y' para eliminar imagenes huerfanas
```

### 5.5 Verificar que Server 1 sigue funcionando

```bash
# Verificar que los otros proyectos no se afectaron
curl -s https://braillin.com.ar | head -5
curl -s https://eljefenegocios.com.ar | head -5
curl -I https://portainer.server1.bowin.com.ar
```

---

## 6. Verificacion final

### Checklist completo (ambos servidores)

```
SERVER 1:
[ ] https://braillin.com.ar funciona
[ ] https://eljefenegocios.com.ar funciona
[ ] https://portainer.server1.bowin.com.ar funciona
[ ] ArchieTeam ya no corre (docker ps sin archieteam)

SERVER 2:
[ ] https://archie.bowin.com.ar funciona (o bowin.com.ar)
[ ] https://portainer.server2.bowin.com.ar funciona
[ ] SPA routing funciona (refresh en /agents no da 404)
[ ] SSL valido en ambos dominios

DNS:
[ ] bowin.com.ar → IP_SERVER_2
[ ] archie.bowin.com.ar → IP_SERVER_2
[ ] portainer.server1.bowin.com.ar → IP_SERVER_1
[ ] portainer.server2.bowin.com.ar → IP_SERVER_2
```

---

## 7. Troubleshooting

### SSL no se genera en Server 2

```bash
# Verificar que el DNS ya propago
dig archie.bowin.com.ar +short
# Debe mostrar IP_SERVER_2

# Verificar que puerto 80 esta abierto
sudo ufw status | grep 80

# Verificar logs de Traefik
docker logs traefik 2>&1 | grep -i "acme\|certificate\|error"

# Si el DNS aun apunta al Server 1, Traefik de Server 2 no puede
# completar el challenge HTTP-01 porque Let's Encrypt va al server viejo.
# Solucion: esperar a que el DNS propague.
```

### El sitio sigue mostrando la version vieja

```bash
# Si el DNS aun apunta al Server 1, el browser va al server viejo.
# Forzar resolver local para probar:
# En tu maquina local, editar hosts:
# Windows: C:\Windows\System32\drivers\etc\hosts
# Agregar:
# IP_SERVER_2   archie.bowin.com.ar
# Probar en el browser. Si funciona, es solo cuestion de esperar propagacion DNS.
# Acordarse de borrar la linea de hosts despues.
```

### 502 Bad Gateway en Server 2

```bash
# Verificar que el container esta en la red proxy
docker network inspect proxy | grep archieteam

# Si no esta, recrear:
cd /opt/docker/archieteam/repo
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

### Portainer de Server 1 no carga con el nuevo dominio

```bash
# En Server 1:
# Verificar que el DNS apunta a Server 1
dig portainer.server1.bowin.com.ar +short
# Debe mostrar IP_SERVER_1

# Verificar que Portainer esta corriendo
docker ps | grep portainer

# Verificar labels
docker inspect portainer | grep portainer.server1

# Forzar recreacion
cd /opt/docker/portainer
docker compose down && docker compose up -d

# Verificar que Traefik detecto el cambio
docker logs traefik --tail 30
```

### Certificado SSL invalido o mezclado

```bash
# Si Traefik tiene un certificado viejo cacheado:
cd /opt/docker/traefik

# Borrar certificados y regenerar
docker compose down
rm acme.json
touch acme.json
chmod 600 acme.json
docker compose up -d

# Traefik regenera todos los certificados automaticamente
```

---

## Actualizaciones futuras de ArchieTeam

### Desde tu maquina local (recomendado)

```bash
cd C:/xampp/htdocs/Personal/ArchieTeam
./deploy-local.sh
```

> Recordar actualizar `SERVER_HOST` en `deploy-local.sh` con la IP de Server 2.

### Desde el servidor

```bash
ssh -p 2222 deploy@IP_SERVER_2
cd /opt/docker/archieteam/repo
git pull origin master
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Resumen del flujo

```
 ANTES DE EMPEZAR
 ─────────────────────────────────
 1. Completar guia-infra-server2.md
 2. Tener IP de ambos servidores a mano

 DNS (hacer primero)
 ─────────────────────────────────
 3. Configurar registros A en bowin.com.ar
 4. Esperar propagacion (dig para verificar)

 DEPLOY EN SERVER 2
 ─────────────────────────────────
 5. Clonar repo en /opt/docker/archieteam
 6. Verificar/ajustar dominios en docker-compose
 7. Build + levantar
 8. Verificar checklist

 LIMPIEZA EN SERVER 1
 ─────────────────────────────────
 9. Bajar container archieteam
 10. Eliminar carpeta
 11. Limpiar imagenes
 12. Verificar que braillin + barberia siguen OK

 VERIFICACION FINAL
 ─────────────────────────────────
 13. Ambos portainers accesibles
 14. Todos los proyectos funcionando
 15. DNS correcto para todo
```
