# /deploy — Checklist de deploy para el proyecto activo

Preparar y verificar un proyecto para deploy a producción.

## Pasos

1. **Leer** el perfil del agente `infra/devops` en `.claude/agents/infra/devops.md`
2. **Leer** el `docs/archie-context.md` del proyecto activo
3. **Verificar** el checklist de deploy:
   - [ ] Dockerfile con multi-stage build
   - [ ] .dockerignore actualizado
   - [ ] Variables de entorno documentadas (.env.example)
   - [ ] Healthcheck endpoint (/health o /api/health)
   - [ ] docker-compose.yml con labels Traefik (si aplica)
   - [ ] Dominio/subdominio configurado en DNS
   - [ ] SSL automático verificado
   - [ ] Backup de BD configurado
   - [ ] Monitoreo/alertas activas
   - [ ] Build de producción sin errores (`npm run build`)
   - [ ] Tests pasando (si hay)
   - [ ] docs/deploy.md actualizado
4. **Correr** la skill `harden` para verificar edge cases
5. **Generar checkpoint** pre-deploy: `node scripts/checkpoint.js <ruta> "pre-deploy"`
6. **Reportar** estado: qué está listo, qué falta, bloqueantes

## Output
Checklist visual con ✅/❌ + acciones requeridas antes de deploy.
