# Propuesta de Monitoreo — Equipo Archie

**Fecha:** 2026-08-13
**Estado:** Propuesta (pendiente aprobación)

## Problema actual
- El bot de Telegram se cae entre sesiones y nadie se entera hasta la próxima conversación
- Los servicios desplegados (Braillin, ArchieTeam, BarberiaElJefe) no tienen health monitoring
- MySQL/n8n/archie-db-server/tunnel se caen sin alertas
- No hay visibilidad del estado de los servicios fuera de la sesión de Archie

## Arquitectura propuesta

### Capa 1: Health Check Script (VPS)
Un cron job en cada VPS que verifica servicios cada 5 minutos y alerta por Telegram si algo falla.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Cron (VPS)  │────▶│  health-check.sh  │────▶│  Telegram    │
│  */5 * * * * │     │  curl cada svc    │     │  Bot Alert   │
└─────────────┘     └──────────────────┘     └─────────────┘
```

**Qué verifica:**
- HTTP 200 en cada servicio desplegado (/, /health, /api/health)
- Docker containers corriendo (`docker ps`)
- Traefik respondiendo (dashboard/API)
- Certificados SSL no expirados (< 7 días → warning)
- Disco > 10% libre
- Memory usage < 90%

**Script:** `scripts/vps-health-check.sh`
```bash
#!/bin/bash
TELEGRAM_BOT_TOKEN="..."
TELEGRAM_CHAT_ID="..."
SERVICES=(
  "ArchieTeam|https://bowin.com.ar"
  "Braillin|https://braillin.com"
  "BarberiaElJefe|https://eljefenegocios.com.ar"
)
ALERT=""

for svc in "${SERVICES[@]}"; do
  NAME="${svc%%|*}"
  URL="${svc##*|}"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
  if [ "$STATUS" != "200" ]; then
    ALERT+="❌ $NAME ($URL) → HTTP $STATUS\n"
  fi
done

# Docker containers
DOWN=$(docker ps --filter "status=exited" --format "{{.Names}}" 2>/dev/null)
if [ -n "$DOWN" ]; then
  ALERT+="🐳 Containers caídos: $DOWN\n"
fi

# Disco
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
  ALERT+="💾 Disco al ${DISK_USAGE}%\n"
fi

# Enviar alerta si hay problemas
if [ -n "$ALERT" ]; then
  MSG="⚠️ *ALERTA VPS $(hostname)*\n$(date '+%Y-%m-%d %H:%M')\n\n$ALERT"
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=$(echo -e $MSG)" \
    -d "parse_mode=Markdown" > /dev/null
fi
```

**Instalación:**
```bash
# En cada VPS
crontab -e
# Agregar: */5 * * * * /opt/scripts/vps-health-check.sh
```

### Capa 2: Health Check Local (Equipo/)
El actual `scripts/bot-health.js` mejorado para cubrir más servicios.

**Mejoras sobre el actual:**
- Verificar estado de VPS remotos (curl a los dominios)
- Historial de estado (última vez que estuvo OK/caído)
- Auto-recovery: intentar levantar servicios locales caídos (MySQL, n8n, db-server)
- Guardar resultado en `registro/health-log.json`

**Script mejorado:** `scripts/health-check-extended.js`
```javascript
// Checks locales
const localChecks = [
  { name: 'MySQL', test: () => tcpCheck('localhost', 3306) },
  { name: 'archie-db-server', test: () => httpCheck('http://localhost:3456/health') },
  { name: 'n8n', test: () => httpCheck('http://localhost:5678') },
  { name: 'MongoDB', test: () => tcpCheck('localhost', 27017) },
];

// Checks remotos (VPS)
const remoteChecks = [
  { name: 'ArchieTeam', url: 'https://bowin.com.ar' },
  { name: 'Braillin', url: 'https://braillin.com' },
  { name: 'BarberiaElJefe', url: 'https://eljefenegocios.com.ar' },
];

// Auto-recovery local
const recovery = {
  'MySQL': 'net start mysql',           // XAMPP
  'archie-db-server': 'node scripts/db-server.js &',
  'n8n': 'npx n8n start &',
};
```

### Capa 3: Dashboard de Estado (opcional, fase 2)
Una página simple en ArchieTeam que muestre el estado de todos los servicios en tiempo real.

```
┌────────────────────────────────────────┐
│  ARCHIE STATUS BOARD                    │
├────────────────────────────────────────┤
│  ✅ ArchieTeam      up 14d 3h          │
│  ✅ Braillin        up 7d 12h          │
│  ❌ BarberiaElJefe  down 2h (no deploy)│
│  ✅ MySQL local     up                  │
│  ❌ n8n local       down               │
│  ✅ MongoDB local   up                  │
└────────────────────────────────────────┘
```

**Implementación:** Endpoint `/api/status` en ArchieTeam backend que corra los health checks y devuelva JSON. Frontend muestra los resultados con auto-refresh cada 60s.

## Plan de implementación

| Fase | Qué | Esfuerzo | Dependencias |
|------|-----|----------|-------------|
| **Fase 1** | Script VPS `health-check.sh` + crontab | 1 sesión | Acceso SSH al VPS, bot token |
| **Fase 2** | `health-check-extended.js` local mejorado | 1 sesión | Nada |
| **Fase 3** | Dashboard de estado en ArchieTeam | 2-3 sesiones | Backend ArchieTeam + deploy |

## Decisiones a tomar
1. **Bot Telegram para alertas:** ¿Usar el bot existente del equipo o crear uno dedicado para alertas?
2. **Frecuencia:** ¿Cada 5 minutos es suficiente o se necesita más granularidad?
3. **Auto-recovery:** ¿Que el script intente levantar servicios caídos automáticamente o solo alertar?
4. **Dashboard:** ¿Vale la pena implementar la Fase 3 o con alertas por Telegram alcanza?
5. **Escalamiento:** ¿Notificar solo por Telegram o agregar email/otro canal?

## Costo estimado
- **Infra adicional:** $0 (corre en VPS existente)
- **Telegram API:** Gratis
- **Tiempo de implementación:** 2-4 sesiones para Fases 1 y 2
