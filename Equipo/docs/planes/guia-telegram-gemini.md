# Guia: Workflow Telegram + Gemini en n8n

## Arquitectura

```
[Telegram Trigger] --> [AI Agent + Gemini] --> [Telegram Send Message]
```

Un mensaje entrante al bot dispara el flujo. El AI Agent procesa el texto con Google Gemini y devuelve la respuesta al mismo chat de Telegram.

---

## Requisitos previos

| Requisito | Estado |
|-----------|--------|
| Bot de Telegram creado con @BotFather | Necesitas el **Bot Token** |
| API Key de Google AI Studio (Gemini) | Obtenerla en https://aistudio.google.com/apikey |
| n8n corriendo con tunnel de Cloudflare | Ya configurado |

---

## Paso 1: Crear credenciales en n8n

### 1.1 Credencial de Telegram

1. En n8n, ir a **Settings > Credentials > Add Credential**
2. Buscar **Telegram API**
3. Pegar el **Bot Token** que te dio @BotFather
4. Guardar

### 1.2 Credencial de Google Gemini

1. En n8n, ir a **Settings > Credentials > Add Credential**
2. Buscar **Google Gemini (PaLM) API**
3. Pegar tu **API Key** de Google AI Studio
4. Guardar

---

## Paso 2: Importar el workflow

1. En n8n, ir a **Workflows > Import from File**
2. Seleccionar el archivo `workflow-telegram-gemini.json`
3. Se creara el workflow con 4 nodos ya conectados

---

## Paso 3: Asignar credenciales a los nodos

### Telegram Trigger
1. Doble clic en el nodo **Telegram Trigger**
2. En **Credential to connect with**, seleccionar la credencial de Telegram creada
3. Verificar que en **Updates** este seleccionado `message`

### Google Gemini Chat Model
1. Doble clic en el nodo **Google Gemini Chat Model**
2. En **Credential to connect with**, seleccionar la credencial de Gemini
3. El modelo por defecto es `gemini-1.5-flash` (rapido y economico)
4. Podes cambiarlo a `gemini-1.5-pro` si necesitas mas capacidad

### AI Agent
1. Doble clic en el nodo **AI Agent**
2. Verificar que el **System Message** diga algo como:
   > "Sos un asistente util que responde en espanol. Responde de forma clara y concisa."
3. Podes personalizar este prompt segun tu caso de uso

### Telegram Send Message
1. Doble clic en el nodo **Telegram Send Message**
2. En **Credential to connect with**, seleccionar la credencial de Telegram
3. Verificar que **Chat ID** apunte a: `{{ $('Telegram Trigger').item.json.message.chat.id }}`
4. Verificar que **Text** apunte a: `{{ $json.output }}`

---

## Paso 4: Configurar el Webhook de Telegram

Como tenes Cloudflare Tunnel, n8n ya es accesible desde internet. Al activar el workflow:

1. n8n registra automaticamente el webhook con la API de Telegram
2. Telegram envia los mensajes al tunnel de Cloudflare
3. Cloudflare los reenvía a tu instancia local de n8n

**Verificar que funcione:**
```
GET https://api.telegram.org/bot<TU_TOKEN>/getWebhookInfo
```

Deberias ver la URL de tu tunnel en el campo `url`.

---

## Paso 5: Activar y probar

1. Clic en **Activate** (toggle arriba a la derecha)
2. Abrir Telegram y enviar un mensaje al bot
3. El bot deberia responder con la respuesta de Gemini

---

## Personalizacion

### Cambiar el modelo de Gemini
En el nodo **Google Gemini Chat Model**, cambiar `modelName`:
- `models/gemini-1.5-flash` — Rapido, economico (recomendado para chat)
- `models/gemini-1.5-pro` — Mas capaz, mas lento
- `models/gemini-2.0-flash` — Ultima generacion, rapido

### Cambiar el System Prompt
En el nodo **AI Agent**, editar el campo **System Message** para definir la personalidad y comportamiento del bot.

### Agregar memoria de conversacion
Para que el bot recuerde mensajes anteriores, podes agregar un nodo **Window Buffer Memory** (`@n8n/n8n-nodes-langchain.memoryBufferWindow`) conectado al AI Agent en el slot `ai_memory`.

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| Bot no responde | Verificar que el workflow este **activo** y las credenciales sean correctas |
| Error 401 en Telegram | El Bot Token es incorrecto. Regenerar con @BotFather |
| Error 403 en Gemini | La API Key es incorrecta o no tiene permisos. Verificar en Google AI Studio |
| Webhook no se registra | Verificar que el tunnel de Cloudflare este activo y n8n accesible |
| Respuestas cortadas | Aumentar `maxOutputTokens` en las opciones del nodo Gemini |
