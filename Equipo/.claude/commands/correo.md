# /correo — Leer correos del equipo

Leé los correos de la cuenta del equipo Archie (`archieteambot@gmail.com`) usando IMAP.

## Instrucciones

Ejecutá el script `scripts/leer-correo.mjs` con los parámetros que el usuario indique.

### Uso básico
```bash
node scripts/leer-correo.mjs
```
Lee los últimos 10 correos de la bandeja de entrada.

### Parámetros disponibles
- **Cantidad:** `node scripts/leer-correo.mjs 20` → lee los últimos 20
- **Solo no leídos:** `node scripts/leer-correo.mjs --no-leidos`
- **Buscar:** `node scripts/leer-correo.mjs --buscar "palabra"` → busca en asunto o remitente
- **Carpeta:** `node scripts/leer-correo.mjs "INBOX"` o `"[Gmail]/Enviados"`
- **Listar carpetas:** `node scripts/leer-correo.mjs --carpetas`
- **Combinados:** `node scripts/leer-correo.mjs 5 --no-leidos --buscar "factura"`

### Después de leer
Presentá los correos al usuario de forma clara y resumida. Si el usuario pide actuar sobre algún correo (responder, reenviar, etc.), informale que por ahora solo está habilitada la lectura y que la función de envío se puede agregar después.

### Errores comunes
- **Autenticación fallida:** el usuario necesita una Contraseña de Aplicación de Google, no la contraseña normal
- **IMAP deshabilitado:** hay que habilitarlo en Gmail → Configuración → Reenvío y POP/IMAP
- **No existe .env:** copiar `.env.example` como `.env` y completar `GMAIL_APP_PASSWORD`
