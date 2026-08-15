# /health — Health check completo (local + VPS)

Verificar el estado de todos los servicios del ecosistema Archie.

## Pasos

1. **Servicios locales:**
   - MySQL (puerto 3306)
   - MongoDB (puerto 27017)
   - archie-db-server (puerto 3456)
   - n8n (puerto 5678)
   - Tunnel Cloudflare

2. **Bot Telegram:**
   - Ejecutar `node scripts/bot-health.js`
   - Reportar estado de cada componente

3. **Servicios remotos (VPS):**
   - Verificar https://bowin.com.ar (ArchieTeam)
   - Verificar https://braillin.com (Braillin)
   - Verificar https://eljefenegocios.com.ar (BarberiaElJefe)

4. **Pendientes en DB:**
   - Consultar tabla `pendientes` en `archie_team` si MySQL está disponible

## Output
Tabla de estado con ✅/❌ para cada servicio + acciones sugeridas para los caídos.

## Si algo está caído
- Ofrecer levantar servicios locales automáticamente
- Para VPS: sugerir `ssh` o verificar en Portainer
