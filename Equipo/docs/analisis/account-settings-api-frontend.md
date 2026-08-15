# Account Settings (AccountSetting) — API Frontend

Guía para el equipo de **Frontend**. Describe los endpoints del módulo de configuraciones de cuenta y envío de correos con marca propia. Todos los endpoints son exclusivos para usuarios con el rol **Admin** de su cuenta.

---

## 1. Convenciones generales

### Autenticación y autorización

- **JWT Bearer**: enviar el token en el header `Authorization: Bearer <token>`.
- **Rol requerido**: `Admin` — el middleware `role:Admin` valida el rol del usuario antes de llegar al controlador. Usuarios sin ese rol reciben **401** (no 403; así está configurado el `RoleMiddleware` del proyecto).
- **Scope de cuenta**: todas las operaciones están automáticamente limitadas a la cuenta (`account_id`) del usuario autenticado. No existe forma de operar settings de otra cuenta.
- **Header obligatorio**: enviar siempre `Accept: application/json`. Sin este header, los errores de dominio devuelven HTML en lugar del envelope JSON.

### Envelope de respuesta exitosa

```json
{
  "success": true,
  "data": { ... },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.<clave>",
      "param": ""
    }
  }
}
```

Para listados paginados, se agregan `links` y `meta` al nivel raíz:

```json
{
  "success": true,
  "data": [ ... ],
  "message": { "account_settings": { "msg": "...", "param": "" } },
  "links": {
    "first": "https://api.example.com/account-settings?page=1",
    "last":  "https://api.example.com/account-settings?page=3",
    "prev":  null,
    "next":  "https://api.example.com/account-settings?page=2"
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 25,
    "total": 52,
    "per_page": 25,
    "last_page": 3
  }
}
```

Cuando la lista está vacía, se devuelve igual `200` (no `404`) con `data: []` y `meta.total: 0`. La clave en `message` será `swal_messages.account_settings.not_found` en ese caso.

### Envelope de error de dominio

```json
{
  "success": false,
  "errors": {
    "account_settings": [
      {
        "msg": "swal_messages.account_settings.<clave>",
        "param": ""
      }
    ]
  }
}
```

### Envelope de error de validación (422)

Las validaciones de campos devuelven errores indexados por nombre de campo (con notación de punto para campos anidados):

```json
{
  "success": false,
  "errors": {
    "value.primary_color": [
      { "msg": "swal_messages.validation.regex", "param": "" }
    ],
    "client_references.0": [
      { "msg": "swal_messages.validation.uuid", "param": "" }
    ]
  }
}
```

### Parámetros de paginación (GET de listado)

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `page` | integer | `1` | Número de página |
| `pageSize` | integer | `25` | Registros por página |
| `sortColumn` | string | `id` | Columna de ordenamiento |
| `sortDirection` | string | `desc` | `asc` o `desc` |

---

## 2. Modelo de datos

### Ejemplo JSON (AccountSettingResource)

```json
{
  "reference":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "key":        "mail_config",
  "role":       null,
  "value": {
    "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
    "primary_color":   "#1a4fa0",
    "secondary_color": "#f5a623",
    "header_html":     "<p>Bienvenido a <strong>Mi Empresa</strong></p>",
    "letterhead_html": "<p>Ref: {reference}</p>",
    "signature_html":  "<p>Saludos,<br>El equipo comercial</p>"
  },
  "created_at": "2026-01-15T10:23:44.000000Z",
  "updated_at": "2026-03-20T08:11:02.000000Z"
}
```

### Tabla de campos

| Campo | Tipo | Carácter | Descripción |
|---|---|---|---|
| `reference` | UUID string | **Inmutable** | Identificador público del setting. Se usa en rutas. Generado por el servidor. |
| `key` | string | **Inmutable post-creación** | Nombre lógico del setting (p. ej. `mail_config`). No se puede cambiar con `PUT`. |
| `role` | string \| null | Editable | Rol de Spatie al que aplica este setting. `null` = aplica a toda la cuenta. |
| `value` | object | Editable | Contenido del setting. Estructura libre salvo cuando `key = "mail_config"` (ver sección 3). |
| `created_at` | ISO 8601 | Derivado | Timestamp de creación. |
| `updated_at` | ISO 8601 | Derivado | Timestamp de última modificación. |

**Campos no expuestos en la respuesta** (forzados server-side, no enviar en body):

- `account_id`: siempre derivado del usuario autenticado. Cualquier valor que se envíe en el body es ignorado.

---

## 3. Estructura `mail_config`

Cuando `key = "mail_config"`, el campo `value` sigue esta forma. Todos los campos son opcionales (nullable):

| Campo en `value` | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `logo_url` | string \| null | URL válida, max 2048 chars | URL pública de la imagen de logo. Obtenerla previamente con `POST /account-settings/mail/logo`. |
| `primary_color` | string \| null | Hex `#RGB` o `#RRGGBB` | Color primario de la marca. |
| `secondary_color` | string \| null | Hex `#RGB` o `#RRGGBB` | Color secundario de la marca. |
| `header_html` | string \| null | HTML libre, max 20 000 chars | HTML del encabezado del correo. |
| `letterhead_html` | string \| null | HTML libre, max 20 000 chars | HTML del membrete (alias de `header_html`). |
| `signature_html` | string \| null | HTML libre, max 20 000 chars | HTML de la firma del correo. |

Colores válidos: `#0a5`, `#0a5f2c`. Inválidos: `0a5f2c` (sin `#`), `#GGGGGG` (caracteres fuera de hex).

---

## 4. Endpoints

### 4.1. Listar account settings

```
GET /account-settings
```

**Auth**: JWT Bearer + rol `Admin`.

#### Parámetros de query

| Parámetro | Tipo | Requerido | Descripción |
|---|---|---|---|
| `key` | string | No | Filtra por nombre exacto del setting (p. ej. `mail_config`). |
| `role` | string \| vacío | No | Si se envía el parámetro (aunque sea vacío), filtra por ese rol. String vacío o `null` → filtra por el slot de cuenta (`role IS NULL`). No enviar el parámetro → no filtra por rol. |
| `page` | integer | No | Default: 1. |
| `pageSize` | integer | No | Default: 25. |
| `sortColumn` | string | No | Default: `id`. |
| `sortDirection` | string | No | Default: `desc`. |

#### Respuesta 200 — lista con resultados

```json
{
  "success": true,
  "data": [
    {
      "reference":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "key":        "mail_config",
      "role":       null,
      "value": {
        "logo_url":      "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
        "primary_color": "#1a4fa0"
      },
      "created_at": "2026-01-15T10:23:44.000000Z",
      "updated_at": "2026-03-20T08:11:02.000000Z"
    }
  ],
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.account_setting_found",
      "param": ""
    }
  },
  "links": {
    "first": "https://api.example.com/account-settings?page=1",
    "last":  "https://api.example.com/account-settings?page=1",
    "prev":  null,
    "next":  null
  },
  "meta": {
    "current_page": 1,
    "from": 1,
    "to": 1,
    "total": 1,
    "per_page": 25,
    "last_page": 1
  }
}
```

#### Respuesta 200 — lista vacía

Devuelve `200` (no 404) con `data: []`, `meta.total: 0` y clave `not_found`.

#### Códigos de error

| HTTP | `errors.account_settings[0].msg` | Cuándo |
|---|---|---|
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |

---

### 4.2. Obtener un setting

```
GET /account-settings/{reference}
```

**Auth**: JWT Bearer + rol `Admin`.

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|---|---|---|
| `reference` | UUID | Reference del setting a recuperar. |

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "reference":  "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "key":        "mail_config",
    "role":       null,
    "value": {
      "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
      "primary_color":   "#1a4fa0",
      "secondary_color": "#f5a623",
      "header_html":     "<p>Bienvenido a <strong>Mi Empresa</strong></p>",
      "letterhead_html": null,
      "signature_html":  "<p>Saludos,<br>El equipo comercial</p>"
    },
    "created_at": "2026-01-15T10:23:44.000000Z",
    "updated_at": "2026-03-20T08:11:02.000000Z"
  },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.account_setting_found",
      "param": ""
    }
  }
}
```

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 400 | `swal_messages.general.reference_format` | `{reference}` no es un UUID válido. |
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 404 | `swal_messages.account_settings.account_setting_not_found` | No existe un setting con ese `reference` en la cuenta del usuario autenticado. Un setting de otra cuenta devuelve igualmente 404 (no hay leak de existencia). |

---

### 4.3. Crear un setting

```
POST /account-settings/new
```

**Auth**: JWT Bearer + rol `Admin`.

**Content-Type**: `application/json`

#### Body

```json
{
  "key":  "mail_config",
  "role": null,
  "value": {
    "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
    "primary_color":   "#1a4fa0",
    "secondary_color": "#f5a623",
    "header_html":     "<p>Bienvenido a <strong>Mi Empresa</strong></p>",
    "letterhead_html": null,
    "signature_html":  "<p>Saludos,<br>El equipo comercial</p>"
  }
}
```

#### Reglas de validación

| Campo | Regla | Notas |
|---|---|---|
| `key` | required, string, max:255 | Nombre lógico del setting. |
| `role` | nullable, string, debe existir en tabla `roles` | `null` = setting de cuenta completa. |
| `value` | required, array/object | Estructura libre en general. |
| `value.logo_url` | nullable, URL, max:2048 | Solo validado cuando `key = "mail_config"`. |
| `value.primary_color` | nullable, string, regex hex | Solo validado cuando `key = "mail_config"`. Formato `#RGB` o `#RRGGBB`. |
| `value.secondary_color` | nullable, string, regex hex | Idem. |
| `value.header_html` | nullable, string, max:20000 | Idem. |
| `value.letterhead_html` | nullable, string, max:20000 | Idem. |
| `value.signature_html` | nullable, string, max:20000 | Idem. |

**Campos inmutables / forzados**: `account_id` — siempre tomado del usuario autenticado. No enviarlo; si se envía, se ignora.

#### Respuesta 201

```json
{
  "success": true,
  "data": {
    "reference":  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "key":        "mail_config",
    "role":       null,
    "value": {
      "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
      "primary_color":   "#1a4fa0",
      "secondary_color": "#f5a623",
      "header_html":     "<p>Bienvenido a <strong>Mi Empresa</strong></p>",
      "letterhead_html": null,
      "signature_html":  "<p>Saludos,<br>El equipo comercial</p>"
    },
    "created_at": "2026-06-11T09:00:00.000000Z",
    "updated_at": "2026-06-11T09:00:00.000000Z"
  },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.account_setting_created",
      "param": ""
    }
  }
}
```

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 409 | `swal_messages.account_settings.account_setting_duplicate` | Ya existe un setting con el mismo `(account_id, role, key)`. |
| 422 | errores indexados por campo | Falló la validación (campo requerido ausente, color hex inválido, etc.). |

---

### 4.4. Actualizar un setting

```
PUT /account-settings/{reference}/update
```

**Auth**: JWT Bearer + rol `Admin`.

**Content-Type**: `application/json`

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|---|---|---|
| `reference` | UUID | Reference del setting a modificar. |

#### Body

```json
{
  "role": null,
  "value": {
    "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
    "primary_color":   "#2b5bb5",
    "secondary_color": "#e8941f",
    "header_html":     "<p>Encabezado actualizado</p>",
    "letterhead_html": null,
    "signature_html":  "<p>Nuevo equipo comercial</p>"
  }
}
```

#### Reglas de validación

| Campo | Regla | Notas |
|---|---|---|
| `role` | nullable, string, debe existir en tabla `roles` | Opcional. Si no se envía, se conserva el rol actual. |
| `value` | required, array/object | |
| `value.logo_url` | nullable, URL, max:2048 | Solo validado si el setting es `mail_config`. |
| `value.primary_color` | nullable, string, regex hex | Idem. |
| `value.secondary_color` | nullable, string, regex hex | Idem. |
| `value.header_html` | nullable, string, max:20000 | Idem. |
| `value.letterhead_html` | nullable, string, max:20000 | Idem. |
| `value.signature_html` | nullable, string, max:20000 | Idem. |

**Campos inmutables**: `key` y `account_id` no se pueden modificar. Si se envía `key` en el body, se ignora.

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "reference":  "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "key":        "mail_config",
    "role":       null,
    "value": {
      "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
      "primary_color":   "#2b5bb5",
      "secondary_color": "#e8941f",
      "header_html":     "<p>Encabezado actualizado</p>",
      "letterhead_html": null,
      "signature_html":  "<p>Nuevo equipo comercial</p>"
    },
    "created_at": "2026-06-11T09:00:00.000000Z",
    "updated_at": "2026-06-11T14:30:00.000000Z"
  },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.account_setting_updated",
      "param": ""
    }
  }
}
```

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 400 | `swal_messages.general.reference_format` | `{reference}` no es un UUID válido. |
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 404 | `swal_messages.account_settings.account_setting_not_found` | No existe el setting en la cuenta del usuario. |
| 409 | `swal_messages.account_settings.account_setting_duplicate` | El cambio de `role` colisionaría con un setting existente para el mismo `(account_id, key, nuevo_role)`. |
| 422 | errores indexados por campo | Falló la validación. |

---

### 4.5. Eliminar un setting

```
DELETE /account-settings/{reference}/delete
```

**Auth**: JWT Bearer + rol `Admin`.

#### Parámetros de ruta

| Parámetro | Tipo | Descripción |
|---|---|---|
| `reference` | UUID | Reference del setting a eliminar. |

La eliminación es **soft delete**: el registro no se borra físicamente de la base de datos.

#### Respuesta 200

```json
{
  "success": true,
  "data": null,
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.account_setting_deleted",
      "param": ""
    }
  }
}
```

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 400 | `swal_messages.general.reference_format` | `{reference}` no es un UUID válido. |
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 404 | `swal_messages.account_settings.account_setting_not_found` | No existe el setting en la cuenta del usuario. |

---

### 4.6. Subir logo de correo

```
POST /account-settings/mail/logo
```

**Auth**: JWT Bearer + rol `Admin`.

**Content-Type**: `multipart/form-data`

Sube una imagen a S3 y devuelve la URL pública. Esa URL se usa luego en `value.logo_url` al crear o actualizar un `mail_config` setting.

#### Campos del formulario

| Campo | Tipo | Requerido | Restricciones |
|---|---|---|---|
| `file` | archivo de imagen | Sí | Formatos: `jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`. Tamaño máximo: **4 MB** (4096 KB). |

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "url":  "https://s3.amazonaws.com/bucket/mail-logos/42/9c3f4a98-1234-5678-abcd-9b2c6f1d3a01.png",
    "path": "mail-logos/42/9c3f4a98-1234-5678-abcd-9b2c6f1d3a01.png"
  },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.mail_logo_uploaded",
      "param": ""
    }
  }
}
```

- `url`: URL pública del logo en S3. Usar este valor como `value.logo_url` en la configuración `mail_config`.
- `path`: ruta interna en S3 (generalmente no se necesita en el FE, pero se expone por si se necesita referencia).

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 422 | errores indexados por campo | Archivo ausente, formato no aceptado, o supera 4 MB. El campo en el error es `file`. |

---

### 4.7. Enviar correo con marca propia

```
POST /account-settings/mail/send
```

**Auth**: JWT Bearer + rol `Admin`.

**Content-Type**: `application/json`

Envía un correo HTML a los clientes indicados, envuelto en el branding de la cuenta. El branding puede venir de un setting guardado (usando su `reference`) o de un objeto inline.

**Regla exclusiva**: se debe enviar `setting_reference` **o** `branding`, pero no los dos. Si se envían ambos, `setting_reference` tiene precedencia.

#### Body — opción A: usando un setting guardado

```json
{
  "setting_reference": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "subject":           "Novedades de su proceso de financiación",
  "body_html":         "<p>Estimado cliente, le comunicamos que su expediente ha avanzado.</p>",
  "client_references": [
    "c1d2e3f4-a5b6-7890-cdef-123456789012",
    "d2e3f4a5-b6c7-8901-defa-234567890123"
  ]
}
```

#### Body — opción B: branding inline

```json
{
  "branding": {
    "logo_url":        "https://cdn.example.com/mail-logos/42/9c3f4a98-...-9b2c6f1d.png",
    "primary_color":   "#1a4fa0",
    "secondary_color": "#f5a623",
    "header_html":     "<p>Bienvenido a <strong>Mi Empresa</strong></p>",
    "letterhead_html": null,
    "signature_html":  "<p>Saludos,<br>El equipo comercial</p>"
  },
  "subject":           "Oferta especial para usted",
  "body_html":         "<p>Le presentamos nuestra nueva oferta de financiación.</p><ul><li>TAE 4,9%</li></ul>",
  "client_references": [
    "c1d2e3f4-a5b6-7890-cdef-123456789012"
  ]
}
```

#### Reglas de validación

| Campo | Regla | Notas |
|---|---|---|
| `setting_reference` | required_without:`branding`, nullable, UUID | Exactamente uno de los dos campos de branding debe estar presente. |
| `branding` | required_without:`setting_reference`, nullable, array/object | Idem. |
| `branding.logo_url` | nullable, URL, max:2048 | Solo validado si `branding` es un array. |
| `branding.primary_color` | nullable, string, regex hex | Idem. |
| `branding.secondary_color` | nullable, string, regex hex | Idem. |
| `branding.header_html` | nullable, string, max:20000 | Idem. |
| `branding.letterhead_html` | nullable, string, max:20000 | Idem. |
| `branding.signature_html` | nullable, string, max:20000 | Idem. |
| `subject` | required, string, max:255, sin saltos de línea | No se permiten `\r` ni `\n`. |
| `body_html` | required, string, max:50000 | El servidor sanitiza el HTML: elimina `<script>`, atributos `on*` y URLs `javascript:`. |
| `client_references` | required, array, min:1, max:200 | Array de UUIDs de clientes. |
| `client_references.*` | UUID | Cada elemento debe ser un UUID válido. |

**Comportamiento de sanitización del body**: el servidor limpia el `body_html` antes de enviarlo. Las etiquetas `<script>`, todos los atributos de eventos (`onclick`, `onload`, etc.) y URLs con protocolo `javascript:` son eliminados. El FE no necesita pre-sanitizar, pero debe informar al usuario que ese contenido no se renderizará.

**Filtrado de destinatarios**: el servidor resuelve los emails de los clientes indicados en `client_references` en una sola consulta, filtrando por `account_id` del usuario autenticado y excluyendo clientes sin email. Si ningún `reference` resuelve a un destinatario válido, se devuelve 422.

#### Respuesta 200

```json
{
  "success": true,
  "data": {
    "sent":       2,
    "recipients": [
      "cliente1@ejemplo.com",
      "cliente2@ejemplo.com"
    ]
  },
  "message": {
    "account_settings": {
      "msg": "swal_messages.account_settings.mail_sent",
      "param": ""
    }
  }
}
```

- `sent`: cantidad de correos efectivamente enviados.
- `recipients`: lista de emails a los que se envió (puede ser menor que el total de `client_references` si algunos no tenían email o no pertenecían a la cuenta).

#### Códigos de error

| HTTP | `errors.<type>[0].msg` | Cuándo |
|---|---|---|
| 401 | — | Token ausente, inválido o usuario sin rol `Admin`. |
| 404 | `swal_messages.account_settings.account_setting_not_found` | El `setting_reference` no existe o no pertenece a la cuenta del usuario. |
| 422 | `swal_messages.account_settings.mail_no_recipients` | Ninguno de los `client_references` tiene email válido en la cuenta del usuario autenticado. |
| 422 | `swal_messages.account_settings.mail_invalid_config` | El `setting_reference` apunta a un setting cuya `key` no es `mail_config`, o el `value` no es un array válido. |
| 422 | errores indexados por campo | Falló la validación de campos del request. |

---

## 5. Integración con otras entidades

### Clientes (Clients)

El endpoint `POST /account-settings/mail/send` consume `client_references` (UUIDs de `Client`). El servidor resuelve el email de cada cliente en una sola consulta, filtrando por `account_id` del usuario autenticado. Clientes de otra cuenta son silenciosamente ignorados — no se expone su existencia.

### Roles (Spatie Roles)

El campo `role` en settings acepta únicamente nombres de roles existentes en la tabla `roles` del proyecto (roles Spatie). Si el FE necesita listar los roles disponibles para poblar un selector, debe consultar el endpoint de roles de usuarios (`GET /users/roles` o equivalente) — no existe un endpoint dedicado en este módulo.

### Flujo recomendado para configurar y usar un mail_config

1. `POST /account-settings/mail/logo` — subir imagen, guardar la `url` devuelta.
2. `POST /account-settings/new` con `key: "mail_config"` y `value` incluyendo la `logo_url` del paso anterior.
3. Guardar el `reference` del setting creado.
4. `POST /account-settings/mail/send` con `setting_reference` del paso anterior, el `subject`, `body_html` y los `client_references`.

---

## 6. Resumen de claves `swal_messages.*`

### Claves de éxito

| Clave completa | Endpoint | HTTP |
|---|---|---|
| `swal_messages.account_settings.account_setting_found` | `GET /account-settings` | 200 |
| `swal_messages.account_settings.account_setting_found` | `GET /account-settings/{reference}` | 200 |
| `swal_messages.account_settings.account_setting_created` | `POST /account-settings/new` | 201 |
| `swal_messages.account_settings.account_setting_updated` | `PUT /account-settings/{reference}/update` | 200 |
| `swal_messages.account_settings.account_setting_deleted` | `DELETE /account-settings/{reference}/delete` | 200 |
| `swal_messages.account_settings.mail_logo_uploaded` | `POST /account-settings/mail/logo` | 200 |
| `swal_messages.account_settings.mail_sent` | `POST /account-settings/mail/send` | 200 |

Nota: cuando el listado está vacío, el tipo `account_settings` usa la clave `not_found` (también con HTTP 200). El FE puede ignorar esa clave si ya trata `data: []` como estado vacío sin necesidad de mostrar un toast de error.

### Claves de error de dominio

| Clave completa | Endpoint(s) | HTTP |
|---|---|---|
| `swal_messages.account_settings.account_setting_not_found` | `GET /{ref}`, `PUT /{ref}/update`, `DELETE /{ref}/delete`, `POST mail/send` | 404 |
| `swal_messages.account_settings.account_setting_duplicate` | `POST /new`, `PUT /{ref}/update` | 409 |
| `swal_messages.account_settings.mail_no_recipients` | `POST /account-settings/mail/send` | 422 |
| `swal_messages.account_settings.mail_invalid_config` | `POST /account-settings/mail/send` | 422 |
| `swal_messages.general.reference_format` | `GET /{ref}`, `PUT /{ref}/update`, `DELETE /{ref}/delete` | 400 |

---

## 7. Quick reference — tabla de rutas

| Método | Path | Auth | Body / Params | Respuesta exitosa |
|---|---|---|---|---|
| `GET` | `/account-settings` | JWT + Admin | Query: `key`, `role`, `page`, `pageSize`, `sortColumn`, `sortDirection` | 200 — array paginado de `AccountSettingResource` |
| `GET` | `/account-settings/{reference}` | JWT + Admin | Path: UUID | 200 — `AccountSettingResource` |
| `POST` | `/account-settings/new` | JWT + Admin | JSON: `key`, `role?`, `value` | 201 — `AccountSettingResource` |
| `PUT` | `/account-settings/{reference}/update` | JWT + Admin | Path: UUID. JSON: `value`, `role?` | 200 — `AccountSettingResource` |
| `DELETE` | `/account-settings/{reference}/delete` | JWT + Admin | Path: UUID | 200 — `data: null` |
| `POST` | `/account-settings/mail/logo` | JWT + Admin | `multipart/form-data`: campo `file` (imagen, max 4 MB) | 200 — `{ url, path }` |
| `POST` | `/account-settings/mail/send` | JWT + Admin | JSON: `setting_reference` o `branding`, `subject`, `body_html`, `client_references[]` | 200 — `{ sent, recipients[] }` |

---

## Notas importantes para el FE

- **`role:Admin` devuelve 401, no 403.** El middleware del proyecto rechaza a usuarios sin el rol requerido con HTTP 401 y el mensaje "No autorizado". El FE debe manejar este 401 como denegación de acceso por rol insuficiente, además del 401 por token inválido.
- **Enviar siempre `Accept: application/json`.** Sin este header, cualquier error de dominio no capturado devuelve una página HTML en lugar del envelope JSON, lo que rompe el parsing de la respuesta.
- **El `key` es inmutable post-creación.** Si se necesita cambiar la clave de un setting, hay que eliminarlo y crear uno nuevo.
- **El `account_id` siempre lo determina el servidor.** No incluirlo en el body bajo ninguna circunstancia.
- **La URL del logo (S3) debe obtenerse antes de crear el `mail_config`.** El flujo correcto es: subir logo → obtener URL → usar URL en `value.logo_url` del setting.
- **`body_html` es sanitizado server-side.** Scripts y manejadores de eventos son eliminados antes del envío. El contenido renderizado en el correo puede diferir del enviado si incluye esos elementos.
- **Los UUIDs en `client_references` que no pertenecen a la cuenta son ignorados silenciosamente.** Si todos los referencias son ajenos o sin email, se recibe 422 `mail_no_recipients`.
