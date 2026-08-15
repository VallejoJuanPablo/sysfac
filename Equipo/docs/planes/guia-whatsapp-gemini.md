# Guia: WhatsApp + Gemini AI via Evolution API + n8n

## Arquitectura

```
WhatsApp (mensaje) --> Evolution API --> Webhook n8n --> AI Agent (Gemini) --> Evolution API --> WhatsApp (respuesta)
```

## Infraestructura Docker

| Contenedor | Puerto | Red | Funcion |
|------------|--------|-----|---------|
| `n8n` | 5678 | bridge + evolution-net | Orquestador de workflows |
| `evolution-api` | 8080 | evolution-net | Gateway WhatsApp (Baileys) |
| `evolution-postgres` | 5432 (interno) | evolution-net | Base de datos de Evolution API |

## Credenciales

| Servicio | Dato |
|----------|------|
| Evolution API Key | `evo_archie_2026` |
| Evolution Manager | http://localhost:8080/manager |
| n8n | http://localhost:5678 |
| Webhook URL (n8n) | https://[tunnel-cloudflare]/webhook/whatsapp-gemini |

## Workflow n8n: WhatsApp + Gemini AI Bot

### Nodos

1. **WhatsApp Webhook** — Recibe POST de Evolution API en `/webhook/whatsapp-gemini`
2. **Filter Messages** — Filtra solo mensajes de texto (type: `conversation`)
3. **AI Agent** — Procesa el mensaje con Gemini 1.5 Flash
4. **Google Gemini Chat Model** — LLM conectado al AI Agent
5. **Send WhatsApp Reply** — HTTP POST a Evolution API para enviar la respuesta

### Flujo de datos

```
Webhook recibe:
  body.data.message.conversation  -->  texto del usuario
  body.data.key.remoteJid         -->  numero del remitente (ej: 5491112345678@s.whatsapp.net)

AI Agent procesa:
  input: texto del usuario
  output: respuesta de Gemini

Send Reply envia:
  POST http://evolution-api:8080/message/sendText/whatsapp-bot
  body: { number: "5491112345678", text: "respuesta de gemini" }
```

## Como vincular WhatsApp

1. Abrir http://localhost:8080/manager
2. Login con API Key: `evo_archie_2026`
3. Clic en instancia `whatsapp-bot`
4. Escanear QR con WhatsApp (Ajustes > Dispositivos vinculados)
5. Esperar a que el estado cambie a `open`

## Como activar el workflow

1. Abrir n8n en http://localhost:5678
2. Ir al workflow "WhatsApp + Gemini AI Bot"
3. Activar el toggle (arriba derecha)
4. Enviar un mensaje por WhatsApp al numero vinculado

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| QR no aparece | Reiniciar contenedor: `docker restart evolution-api` |
| Bot no responde | Verificar workflow activo en n8n y WhatsApp conectado |
| Error conexion entre contenedores | Verificar red: `docker network inspect evolution-net` |
| Evolution API se cae | `docker logs evolution-api --tail 30` para ver errores |
| Webhook no llega | Verificar tunnel Cloudflare activo y URL correcta |

## Comandos utiles

```bash
# Ver estado de contenedores
docker ps --filter name=evolution --filter name=n8n

# Ver logs
docker logs evolution-api --tail 30
docker logs n8n --tail 30

# Reiniciar Evolution API
docker restart evolution-api

# Ver instancias de WhatsApp
curl -s http://localhost:8080/instance/fetchInstances -H "apikey: evo_archie_2026"

# Ver estado de conexion
curl -s http://localhost:8080/instance/connectionState/whatsapp-bot -H "apikey: evo_archie_2026"
```
