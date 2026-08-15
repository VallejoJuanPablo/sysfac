# Guia Completa de SEO — Paso a Paso

> Guia practica para posicionar un sitio web en los primeros resultados de Google.
> Cada paso incluye que hacer, como hacerlo y como verificar que esta bien.

---

## Indice

1. [Fase 1 — Fundamentos tecnicos](#fase-1--fundamentos-tecnicos)
2. [Fase 2 — Google Search Console y Analytics](#fase-2--google-search-console-y-analytics)
3. [Fase 3 — Investigacion de keywords](#fase-3--investigacion-de-keywords)
4. [Fase 4 — SEO On-Page](#fase-4--seo-on-page)
5. [Fase 5 — Contenido estrategico](#fase-5--contenido-estrategico)
6. [Fase 6 — Datos estructurados (Schema.org)](#fase-6--datos-estructurados-schemaorg)
7. [Fase 7 — SEO Off-Page y autoridad](#fase-7--seo-off-page-y-autoridad)
8. [Fase 8 — SEO Local (si aplica)](#fase-8--seo-local-si-aplica)
9. [Fase 9 — Rendimiento y Core Web Vitals](#fase-9--rendimiento-y-core-web-vitals)
10. [Fase 10 — Monitoreo y mejora continua](#fase-10--monitoreo-y-mejora-continua)
11. [Checklist final](#checklist-final)
12. [Herramientas recomendadas](#herramientas-recomendadas)
13. [Errores comunes a evitar](#errores-comunes-a-evitar)
14. [Cronograma sugerido](#cronograma-sugerido)

---

## Fase 1 — Fundamentos tecnicos

Antes de pensar en contenido o keywords, tu sitio tiene que estar tecnicamente preparado para que Google pueda rastrearlo, entenderlo e indexarlo correctamente.

### Paso 1.1 — Certificado SSL (HTTPS)

**Que:** Tu sitio debe cargar con `https://` en vez de `http://`.

**Como:**
1. Si usas hosting compartido: activa SSL desde el panel (cPanel, Plesk). La mayoria ofrece Let's Encrypt gratis.
2. Si usas VPS: instala Certbot con Let's Encrypt.
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d tudominio.com -d www.tudominio.com
   ```
3. Si usas Cloudflare: activa "Full (Strict)" en SSL/TLS.

**Verificar:**
- Abri `https://tudominio.com` — debe mostrar el candado verde.
- Probalo en [SSL Labs](https://www.ssllabs.com/ssltest/) — debe dar nota A o superior.

**Redireccion obligatoria:**
Toda peticion HTTP debe redirigir a HTTPS. En `.htaccess` (Apache):
```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

En Nginx:
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    return 301 https://$host$request_uri;
}
```

---

### Paso 1.2 — Dominio con y sin www

**Que:** Elegir UNA version canonica (con www o sin www) y redirigir la otra.

**Como:**
1. Decidi: `tudominio.com` o `www.tudominio.com` (la tendencia actual es sin www).
2. Redireccion 301 de la version NO elegida a la elegida.

En `.htaccess` (redirigir www a sin www):
```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^www\.tudominio\.com [NC]
RewriteRule ^(.*)$ https://tudominio.com/$1 [L,R=301]
```

**Verificar:**
- Navega a `www.tudominio.com` — debe redirigir automaticamente a `tudominio.com` (o viceversa).

---

### Paso 1.3 — URLs limpias y amigables

**Que:** Las URLs deben ser legibles, descriptivas y sin parametros innecesarios.

**Buenas URLs:**
```
https://tudominio.com/servicios/envios-nacionales
https://tudominio.com/blog/como-reducir-costos-logisticos
https://tudominio.com/nosotros
```

**Malas URLs:**
```
https://tudominio.com/page?id=23&cat=5
https://tudominio.com/index.php?module=services&action=view
https://tudominio.com/p/12345
```

**Reglas para URLs:**
- Usar guiones `-` para separar palabras (nunca guion bajo `_`)
- Todo en minusculas
- Sin caracteres especiales ni tildes
- Cortas pero descriptivas (3-5 palabras maximo)
- Incluir la keyword principal cuando sea natural

**Como:** Depende de tu stack:
- **Angular:** Configurar rutas con paths descriptivos en `app-routing.module.ts`
- **Express/Node:** Definir rutas con nombres claros
- **WordPress:** Ajustes > Enlaces permanentes > Nombre de la entrada
- **Apache:** Usar `mod_rewrite` en `.htaccess`

---

### Paso 1.4 — Archivo robots.txt

**Que:** Archivo en la raiz del sitio que le dice a Google que puede y que no puede rastrear.

**Como:** Crear `/robots.txt` en la raiz del dominio:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /tmp/
Disallow: /private/

Sitemap: https://tudominio.com/sitemap.xml
```

**Reglas:**
- NO bloquees CSS ni JS (Google necesita renderizar tu pagina)
- NO bloquees imagenes que quieras indexar
- SI bloqueá paneles de admin, APIs internas, paginas de prueba

**Verificar:**
- Navega a `https://tudominio.com/robots.txt` — debe mostrarse el archivo.
- En Google Search Console: Configuracion > robots.txt > Verificar que no haya errores.

---

### Paso 1.5 — Sitemap XML

**Que:** Archivo XML que lista todas las paginas que queres que Google indexe, con prioridad y frecuencia de actualizacion.

**Como:** Crear `/sitemap.xml` en la raiz:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://tudominio.com/</loc>
    <lastmod>2024-01-15</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://tudominio.com/servicios</loc>
    <lastmod>2024-01-10</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://tudominio.com/blog/articulo-ejemplo</loc>
    <lastmod>2024-01-12</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
</urlset>
```

**Prioridades sugeridas:**
| Pagina | Prioridad |
|--------|-----------|
| Home | 1.0 |
| Servicios / Productos | 0.8 |
| Paginas de categorias | 0.7 |
| Blog / Articulos | 0.6 |
| Contacto / Legal | 0.3 |

**Herramientas para generar sitemaps automaticamente:**
- **Node.js:** paquete `sitemap` de npm
- **Angular:** `@ngx-seo/sitemap` o generacion por script post-build
- **WordPress:** plugin Yoast SEO o Rank Math
- **Generadores online:** xml-sitemaps.com

**Verificar:**
- Navega a `https://tudominio.com/sitemap.xml` — debe mostrarse el XML valido.
- Envialo desde Google Search Console (ver Fase 2).

---

### Paso 1.6 — Pagina 404 personalizada

**Que:** Cuando alguien visita una URL que no existe, debe ver una pagina util, no un error generico.

**Como:**
- Disenar una pagina 404 con: mensaje claro, buscador, links a secciones principales, boton para volver al home.
- En `.htaccess`: `ErrorDocument 404 /404.html`
- En Express: middleware catch-all al final de las rutas.

**Verificar:**
- Visita `https://tudominio.com/pagina-que-no-existe` — debe mostrar tu 404 personalizada.
- El servidor debe devolver codigo HTTP 404 (no 200). Verifica con: `curl -I https://tudominio.com/noexiste`

---

### Paso 1.7 — Favicon y Open Graph

**Que:** Favicon es el iconito en la pestana del navegador. Open Graph controla como se ve tu sitio al compartirlo en redes sociales.

**Como:**

Favicon (en `<head>`):
```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

Open Graph (en `<head>`):
```html
<!-- General -->
<meta property="og:title" content="Tu Empresa — Servicios de logistica">
<meta property="og:description" content="Descripcion atractiva de tu negocio en 155 caracteres.">
<meta property="og:image" content="https://tudominio.com/img/og-image.jpg">
<meta property="og:url" content="https://tudominio.com/">
<meta property="og:type" content="website">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Tu Empresa — Servicios de logistica">
<meta name="twitter:description" content="Descripcion atractiva.">
<meta name="twitter:image" content="https://tudominio.com/img/og-image.jpg">
```

**Imagen OG recomendada:** 1200x630px, formato JPG o PNG, menos de 1MB.

**Verificar:**
- Favicon: visible en la pestana del navegador.
- OG: comparti tu URL en WhatsApp, Twitter o Facebook y verifica que muestre titulo, descripcion e imagen.
- Herramienta: [opengraph.xyz](https://opengraph.xyz/)

---

## Fase 2 — Google Search Console y Analytics

### Paso 2.1 — Crear cuenta en Google Search Console

**Que:** Herramienta gratuita de Google para monitorear como ve Google tu sitio.

**Como:**
1. Ir a [search.google.com/search-console](https://search.google.com/search-console)
2. Iniciar sesion con tu cuenta de Google
3. Click en "Agregar propiedad"
4. Elegir tipo de propiedad:
   - **Dominio** (recomendado): cubre todas las variaciones (http, https, www, sin www)
   - **Prefijo de URL**: solo cubre la URL exacta que ingreses

**Verificacion de propiedad (metodo recomendado por tipo):**

Para tipo Dominio:
- Agregar registro TXT en el DNS de tu dominio
- El registro lo proporciona Google Search Console
- Tarda hasta 48hs en propagarse

Para tipo Prefijo de URL (opciones):
- **Archivo HTML:** subir un archivo `.html` que te da Google a la raiz de tu sitio
- **Meta tag:** agregar `<meta name="google-site-verification" content="codigo">` en el `<head>`
- **Google Analytics:** si ya tenes GA configurado, se verifica automaticamente
- **Google Tag Manager:** idem

**Verificar:** En Search Console debe aparecer "Propiedad verificada".

---

### Paso 2.2 — Enviar sitemap en Search Console

**Como:**
1. En Search Console, ir a "Sitemaps" en el menu lateral
2. Escribir `sitemap.xml` en el campo
3. Click en "Enviar"
4. Esperar a que el estado cambie a "Correcto"

**Verificar:** En la seccion Sitemaps, el estado debe ser "Correcto" y mostrar la cantidad de URLs descubiertas.

---

### Paso 2.3 — Solicitar indexacion de paginas clave

**Como:**
1. En Search Console, ir a "Inspeccion de URLs" (barra superior)
2. Pegar la URL de tu pagina principal: `https://tudominio.com/`
3. Si dice "La URL no esta en Google", click en "Solicitar indexacion"
4. Repetir con las 5-10 paginas mas importantes de tu sitio

**Nota:** Google puede tardar desde horas hasta semanas en indexar. No hay forma de acelerarlo mas alla de solicitar.

---

### Paso 2.4 — Configurar Google Analytics 4 (GA4)

**Que:** Herramienta para medir trafico, comportamiento de usuarios y conversiones.

**Como:**
1. Ir a [analytics.google.com](https://analytics.google.com/)
2. Crear cuenta y propiedad
3. Obtener el ID de medicion (formato `G-XXXXXXXXXX`)
4. Agregar el script en el `<head>` de TODAS las paginas:

```html
<!-- Google Analytics 4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**En Angular:** Usar la libreria `ngx-google-analytics` o agregarlo en `index.html`.

**Verificar:**
- Abri tu sitio en el navegador
- En GA4, ir a "Tiempo real" — deberias verte como usuario activo
- Instalar extension [Google Tag Assistant](https://tagassistant.google.com/) para verificar que el tag funciona

---

## Fase 3 — Investigacion de keywords

### Paso 3.1 — Entender tipos de keywords

| Tipo | Ejemplo | Competencia | Conversion |
|------|---------|-------------|------------|
| **Head** (1-2 palabras) | "envios" | Altisima | Baja |
| **Body** (2-3 palabras) | "envios nacionales argentina" | Media | Media |
| **Long-tail** (4+ palabras) | "envios nacionales baratos zona sur" | Baja | Alta |

**Estrategia:** Empezar por long-tail (menos competencia, mas conversion) e ir subiendo.

---

### Paso 3.2 — Investigar keywords con herramientas

**Herramientas gratuitas:**
1. **Google Keyword Planner** (dentro de Google Ads, gratis para buscar)
   - Ir a ads.google.com > Herramientas > Planificador de palabras clave
   - "Descubrir nuevas palabras clave" > ingresar tu tema
   - Filtrar por pais/idioma
   - Anotar: keyword, volumen de busqueda, competencia

2. **Google Suggest (autocompletado)**
   - Escribir tu keyword en Google y ver las sugerencias
   - Probar con: "como + keyword", "keyword + en + ciudad", "mejor + keyword"

3. **Google "Busquedas relacionadas"**
   - Scrollear al final de los resultados de Google
   - Anotar las busquedas relacionadas que muestra

4. **Google "People Also Ask"**
   - Las preguntas desplegables que aparecen en los resultados
   - Cada una es una oportunidad de contenido

5. **Ubersuggest** (ubersuggest.com)
   - Version gratuita limitada pero util
   - Muestra volumen, dificultad SEO, ideas de contenido

6. **AnswerThePublic** (answerthepublic.com)
   - Ingresa tu keyword y genera preguntas que la gente hace
   - Excelente para ideas de blog

**Herramientas pagas (cuando escales):**
- Ahrefs ($99/mes) — la mas completa
- SEMrush ($129/mes) — buena alternativa
- Moz Pro ($99/mes)

---

### Paso 3.3 — Crear un mapa de keywords

**Que:** Asignar 1-2 keywords principales y 3-5 secundarias a cada pagina de tu sitio.

**Formato sugerido:**

| Pagina | URL | Keyword principal | Keywords secundarias | Volumen |
|--------|-----|-------------------|---------------------|---------|
| Home | / | envios nacionales argentina | logistica, transporte, envios baratos | 2400 |
| Servicios | /servicios | servicios de envio | paqueteria, mensajeria, courrier | 1200 |
| Blog post 1 | /blog/como-enviar-paquetes | como enviar paquetes en argentina | enviar paquetes correo, envio puerta a puerta | 800 |

**Reglas:**
- NUNCA asignar la misma keyword principal a dos paginas distintas (canibalizacion)
- Cada pagina debe tener un foco claro
- Las keywords secundarias complementan, no compiten

---

### Paso 3.4 — Analizar la competencia

**Como:**
1. Busca tu keyword principal en Google
2. Abri los primeros 5 resultados
3. Analiza:
   - Que tipo de contenido tienen (articulo, video, lista, guia)
   - Cuantas palabras aproximadamente
   - Que subtemas cubren
   - Que les falta que vos podrias agregar
4. Tu contenido debe ser **mejor, mas completo o con un angulo diferente**

---

## Fase 4 — SEO On-Page

### Paso 4.1 — Title tags

**Que:** El titulo que aparece en la pestana del navegador y en los resultados de Google. Es el factor on-page MAS importante.

**Como:**
```html
<title>Keyword Principal — Tu Marca | Complemento</title>
```

**Reglas:**
- Maximo 60 caracteres (Google corta despues de eso)
- Keyword principal al inicio
- Nombre de marca al final
- Unico para cada pagina
- Atractivo — tiene que generar click

**Ejemplos buenos:**
```
Envios Nacionales en 24hs — LogiExpress | Cotiza Gratis
Como Reducir Costos de Envio en 2024 — Blog LogiExpress
Servicios de Logistica para Empresas — LogiExpress
```

**Ejemplos malos:**
```
Home
Servicios
LogiExpress — Bienvenidos a nuestra pagina web
```

---

### Paso 4.2 — Meta descriptions

**Que:** La descripcion que aparece debajo del titulo en los resultados de Google. No afecta el ranking directamente, pero afecta el CTR (click-through rate).

**Como:**
```html
<meta name="description" content="Tu descripcion atractiva aqui. Maximo 155 caracteres. Incluye keyword y llamada a la accion.">
```

**Reglas:**
- Maximo 155 caracteres
- Incluir keyword principal (Google la resalta en negrita)
- Incluir una llamada a la accion (CTA): "Cotiza gratis", "Descubri como", "Entra y compara"
- Unica para cada pagina
- Describir el beneficio, no solo el contenido

**Ejemplo:**
```html
<meta name="description" content="Envios nacionales en 24hs a todo el pais. Cotiza gratis online y ahorra hasta 40% en logistica. Sin contratos ni minimos.">
```

---

### Paso 4.3 — Encabezados (H1-H6)

**Reglas:**
- **Un solo `<h1>` por pagina** — debe contener la keyword principal
- `<h2>` para secciones principales
- `<h3>` para subsecciones
- Jerarquia logica: nunca saltar de H1 a H3
- Los encabezados deben ser descriptivos, no decorativos

**Ejemplo correcto:**
```html
<h1>Envios Nacionales a Todo el Pais</h1>
  <h2>Nuestros servicios de envio</h2>
    <h3>Envio express en 24 horas</h3>
    <h3>Envio estandar en 3-5 dias</h3>
  <h2>Cobertura y zonas de envio</h2>
  <h2>Preguntas frecuentes sobre envios</h2>
```

**Ejemplo incorrecto:**
```html
<h1>Bienvenidos</h1>
<h1>Servicios</h1>  <!-- dos h1! -->
<h3>Info</h3>       <!-- salto de h1 a h3 -->
```

---

### Paso 4.4 — Contenido de la pagina

**Reglas para cada pagina importante:**
- Minimo 300 palabras (ideal 800-2000 para paginas clave)
- Keyword principal en los primeros 100 caracteres
- Keywords secundarias distribuidas naturalmente
- Parrafos cortos (3-4 lineas maximo)
- Listas, tablas y negritas para facilitar el escaneo
- Contenido original — NUNCA copiar de otros sitios

**Densidad de keyword:**
- No existe un numero magico, pero entre 1-3% es natural
- Si forzas la keyword, Google lo detecta (keyword stuffing = penalizacion)

---

### Paso 4.5 — Imagenes optimizadas

**Nombre de archivo:**
```
BIEN:  envio-express-nacional.jpg
MAL:   IMG_20240115_143022.jpg
MAL:   imagen1.png
```

**Alt text:**
```html
<img src="envio-express.jpg" alt="Paquete siendo entregado por courrier de envio express nacional">
```

**Optimizacion tecnica:**
- Formato: WebP (30% mas liviano que JPG) con fallback a JPG
- Tamano: nunca subir imagenes de mas de 200KB para la web
- Dimensiones: redimensionar al tamano que se muestra (no subir una imagen de 4000px si se muestra a 800px)
- Lazy loading: `<img loading="lazy">` para imagenes debajo del fold

**Herramientas de compresion:**
- [Squoosh](https://squoosh.app/) — gratuita, excelente
- [TinyPNG](https://tinypng.com/) — gratuita con limites
- **Sharp** (npm) — para automatizar en Node.js

---

### Paso 4.6 — Links internos

**Que:** Links de una pagina de tu sitio a otra pagina de tu sitio.

**Por que importa:**
- Distribuye "autoridad" (link juice) entre tus paginas
- Ayuda a Google a descubrir todas tus paginas
- Mejora la navegacion del usuario
- Reduce la tasa de rebote

**Reglas:**
- Usar anchor text descriptivo: `<a href="/servicios">servicios de envio express</a>`
- NO usar "click aqui" o "leer mas" como anchor text
- Cada pagina importante debe recibir al menos 3-5 links internos
- Las paginas mas importantes deben estar a maximo 3 clicks del home
- Linkear desde contenido nuevo a contenido viejo y viceversa

---

### Paso 4.7 — URL canonica

**Que:** Tag que le dice a Google cual es la version "oficial" de una pagina cuando hay duplicados o variaciones.

**Como:**
```html
<link rel="canonical" href="https://tudominio.com/servicios/envios-nacionales">
```

**Cuando usarla:**
- Siempre (incluso si no hay duplicados, como auto-referencia)
- Cuando tenes la misma pagina accesible con y sin trailing slash
- Cuando tenes parametros de URL (filtros, paginacion, UTMs)
- Cuando tenes contenido muy similar en multiples URLs

---

## Fase 5 — Contenido estrategico

### Paso 5.1 — Crear un blog

**Por que:** Google premia sitios que se actualizan regularmente con contenido util. Un blog es la forma mas efectiva de generar trafico organico.

**Estructura sugerida:**
```
/blog/                              ← listado de articulos
/blog/como-reducir-costos-envio     ← articulo individual
/blog/guia-logistica-ecommerce      ← guia completa
/blog/categoria/logistica           ← pagina de categoria
```

---

### Paso 5.2 — Tipos de contenido que posicionan

| Tipo | Ejemplo | Longitud ideal |
|------|---------|---------------|
| **Guias completas** | "Guia completa de logistica para ecommerce" | 2000-5000 palabras |
| **Listas** | "10 formas de reducir costos de envio" | 1500-3000 palabras |
| **Tutoriales** | "Como enviar productos al interior paso a paso" | 1000-2500 palabras |
| **Comparativas** | "Correo Argentino vs OCA vs Andreani: cual elegir" | 1500-3000 palabras |
| **FAQ** | "Preguntas frecuentes sobre envios" | 1000-2000 palabras |
| **Casos de estudio** | "Como X empresa bajo sus costos de envio un 40%" | 1000-2000 palabras |
| **Estadisticas** | "Estadisticas de ecommerce en Argentina 2024" | 1500-2500 palabras |

---

### Paso 5.3 — Estructura de un articulo optimizado

```markdown
# Titulo con Keyword Principal (H1)

Parrafo introductorio (100-150 palabras). Incluir keyword en las primeras 2 oraciones. 
Describir que va a encontrar el lector y por que le importa.

## Tabla de contenidos (opcional pero recomendado para articulos largos)

## Seccion 1 — Subtema (H2, con keyword secundaria)

Contenido de 200-400 palabras. Parrafos cortos.
- Listas cuando sean utiles
- **Negritas** en conceptos clave
- Links internos a paginas relacionadas

### Sub-seccion 1.1 (H3)

Detalle adicional si es necesario.

## Seccion 2 — Subtema (H2)

...

## Conclusion / Resumen

Parrafo de cierre con CTA (llamada a la accion).
"Si necesitas ayuda con X, [contactanos](/contacto)."

## Preguntas frecuentes (opcional, excelente para SEO)

### Pregunta 1?
Respuesta concisa.

### Pregunta 2?
Respuesta concisa.
```

---

### Paso 5.4 — Calendario de publicacion

**Frecuencia minima recomendada:** 2-4 articulos por mes.

**Planificar con un calendario:**

| Semana | Tema | Keyword objetivo | Tipo | Estado |
|--------|------|-----------------|------|--------|
| Sem 1 | Como reducir costos de envio | reducir costos envio | Guia | Borrador |
| Sem 2 | Mejores empresas de logistica | empresas logistica argentina | Comparativa | Pendiente |
| Sem 3 | Envios para ecommerce | envios ecommerce argentina | Tutorial | Pendiente |
| Sem 4 | FAQ envios nacionales | preguntas envios | FAQ | Pendiente |

---

### Paso 5.5 — Actualizar contenido existente

**Cada 3-6 meses:**
1. Revisar articulos existentes en Search Console (clics, impresiones, posicion promedio)
2. Los que estan en posicion 5-20 son candidatos a mejorar
3. Actualizar datos, agregar secciones, mejorar el titulo
4. Cambiar la fecha de `lastmod` en el sitemap

---

## Fase 6 — Datos estructurados (Schema.org)

### Paso 6.1 — Que son y por que importan

Los datos estructurados son codigo JSON-LD que le dice a Google exactamente que tipo de contenido tiene tu pagina. Permiten los **rich snippets**: esas estrellas, precios, FAQs y links adicionales que ves en los resultados de Google.

**NO mejoran el ranking directamente, pero mejoran el CTR significativamente** (hasta 30% mas clicks).

---

### Paso 6.2 — Organization (para el home)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Tu Empresa",
  "url": "https://tudominio.com",
  "logo": "https://tudominio.com/img/logo.png",
  "description": "Descripcion de tu empresa y lo que hace.",
  "foundingDate": "2020",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+54-11-XXXX-XXXX",
    "contactType": "customer service",
    "areaServed": "AR",
    "availableLanguage": "Spanish"
  },
  "sameAs": [
    "https://www.facebook.com/tuempresa",
    "https://www.instagram.com/tuempresa",
    "https://www.linkedin.com/company/tuempresa"
  ]
}
</script>
```

---

### Paso 6.3 — LocalBusiness (si tenes local fisico)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Tu Empresa",
  "image": "https://tudominio.com/img/local.jpg",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Av. Ejemplo 1234",
    "addressLocality": "Buenos Aires",
    "addressRegion": "CABA",
    "postalCode": "C1000",
    "addressCountry": "AR"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": -34.6037,
    "longitude": -58.3816
  },
  "telephone": "+54-11-XXXX-XXXX",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      "opens": "09:00",
      "closes": "18:00"
    }
  ],
  "priceRange": "$$"
}
</script>
```

---

### Paso 6.4 — FAQ (para paginas con preguntas frecuentes)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Cuanto tarda un envio nacional?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Los envios nacionales tardan entre 24 y 72 horas habiles segun la zona de destino."
      }
    },
    {
      "@type": "Question",
      "name": "Cual es el costo de envio?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "El costo depende del peso y destino. Podes cotizar gratis en nuestra calculadora online."
      }
    }
  ]
}
</script>
```

---

### Paso 6.5 — Article (para blog posts)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Como Reducir Costos de Envio en tu Ecommerce",
  "author": {
    "@type": "Person",
    "name": "Nombre del Autor"
  },
  "datePublished": "2024-01-15",
  "dateModified": "2024-06-20",
  "image": "https://tudominio.com/blog/img/costos-envio.jpg",
  "publisher": {
    "@type": "Organization",
    "name": "Tu Empresa",
    "logo": {
      "@type": "ImageObject",
      "url": "https://tudominio.com/img/logo.png"
    }
  }
}
</script>
```

---

### Paso 6.6 — BreadcrumbList (migas de pan)

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://tudominio.com/" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://tudominio.com/blog/" },
    { "@type": "ListItem", "position": 3, "name": "Como reducir costos de envio" }
  ]
}
</script>
```

---

### Paso 6.7 — Verificar datos estructurados

1. [Rich Results Test](https://search.google.com/test/rich-results) — pega tu URL y verifica
2. [Schema Markup Validator](https://validator.schema.org/) — valida el JSON-LD
3. En Google Search Console: Mejoras > Revisar tipos de datos estructurados detectados

---

## Fase 7 — SEO Off-Page y autoridad

### Paso 7.1 — Que es la autoridad de dominio

Google evalua la "confiabilidad" de tu sitio segun cuantos otros sitios de calidad enlazan al tuyo. Esto se mide como **Domain Authority (DA)** o **Domain Rating (DR)**.

- Sitio nuevo: DA 0-10
- Sitio establecido: DA 20-40
- Sitio reconocido: DA 40-60
- Sitio lider: DA 60+

**No se puede comprar ni hackear.** Se construye con tiempo y estrategia.

---

### Paso 7.2 — Estrategias de link building (backlinks)

**Estrategias eticas y efectivas:**

1. **Guest posting**
   - Escribir articulos como invitado en blogs de tu industria
   - Incluir un link a tu sitio en el articulo o bio del autor
   - Buscar: "keyword + escribir para nosotros" o "keyword + guest post"

2. **Directorios de la industria**
   - Registrarte en directorios especificos de tu rubro
   - Camaras de comercio, asociaciones profesionales
   - Google My Business (ver Fase 8)

3. **Menciones sin link**
   - Buscar meniones de tu marca que no tengan link
   - Contactar al sitio y pedir que agreguen el link
   - Herramienta: Google Alerts con el nombre de tu empresa

4. **Contenido linkeable**
   - Crear contenido tan bueno que otros quieran linkearlo
   - Infografias, estudios con datos propios, herramientas gratuitas
   - Guias definitivas sobre un tema

5. **Broken link building**
   - Encontrar links rotos en sitios de tu industria
   - Ofrecer tu contenido como reemplazo
   - Herramienta: Ahrefs o Check My Links (extension Chrome)

6. **Relaciones publicas digitales**
   - Notas de prensa sobre novedades de tu empresa
   - Participar en entrevistas o podcasts
   - Responder consultas de periodistas (HARO, Connectively)

**LO QUE NUNCA HACER:**
- Comprar links (Google lo detecta y penaliza)
- Intercambio masivo de links
- Links desde sitios spam, granjas de links
- Comentarios de blog con links (no sirven, son nofollow)
- PBNs (Private Blog Networks)

---

### Paso 7.3 — Redes sociales

Las redes sociales **no afectan el ranking directamente**, pero si indirectamente:
- Generan trafico a tu sitio
- Aumentan el reconocimiento de marca
- Los contenidos virales atraen backlinks naturales

**Minimo recomendado:**
- Tener perfiles activos en 2-3 redes relevantes para tu industria
- Compartir cada articulo nuevo del blog
- Interactuar con la comunidad

---

## Fase 8 — SEO Local (si aplica)

Si tu negocio atiende clientes en una ubicacion geografica especifica, el SEO local es critico.

### Paso 8.1 — Google Business Profile (ex Google My Business)

**Como:**
1. Ir a [business.google.com](https://business.google.com/)
2. Crear o reclamar tu perfil de negocio
3. Completar TODA la informacion:
   - Nombre exacto del negocio (como aparece en la vida real)
   - Direccion completa
   - Telefono
   - Horarios de atencion
   - Categoria principal y secundarias
   - Descripcion del negocio (750 caracteres, incluir keywords)
   - Fotos de alta calidad (minimo 10): local, equipo, productos, logo
   - Servicios que ofreces
   - Atributos (wifi, estacionamiento, etc.)

4. Verificar el negocio (generalmente por postal o telefono)

---

### Paso 8.2 — Resenas de Google

**Las resenas son el factor #1 de SEO local.**

**Como conseguir resenas:**
1. Crear un link directo para dejar resena:
   - Buscar tu negocio en Google Maps
   - Copiar la URL cuando sale la opcion de resena
   - O generar con: `https://search.google.com/local/writereview?placeid=TU_PLACE_ID`
2. Pedir a clientes satisfechos que dejen resena
3. Responder TODAS las resenas (positivas y negativas)
4. Nunca ofrecer incentivos por resenas (viola las politicas de Google)

---

### Paso 8.3 — NAP consistente

**NAP = Name, Address, Phone.** Debe ser EXACTAMENTE igual en todos lados:
- Tu sitio web
- Google Business Profile
- Redes sociales
- Directorios
- Cualquier mencion online

Inconsistencias (ej: "Av." en un lado y "Avenida" en otro) confunden a Google.

---

### Paso 8.4 — Contenido local

- Crear paginas para cada ubicacion si tenes multiples sucursales
- Incluir el nombre de la ciudad/zona en titles y H1
- Crear contenido relevante para tu area local
- Ejemplo: "Envios express en zona sur de Buenos Aires"

---

## Fase 9 — Rendimiento y Core Web Vitals

### Paso 9.1 — Que son los Core Web Vitals

Google mide 3 metricas de experiencia de usuario:

| Metrica | Que mide | Bueno | Mejorar | Malo |
|---------|----------|-------|---------|------|
| **LCP** (Largest Contentful Paint) | Tiempo de carga del elemento mas grande | < 2.5s | 2.5-4s | > 4s |
| **INP** (Interaction to Next Paint) | Reactividad al interactuar | < 200ms | 200-500ms | > 500ms |
| **CLS** (Cumulative Layout Shift) | Estabilidad visual (que nada "salte") | < 0.1 | 0.1-0.25 | > 0.25 |

---

### Paso 9.2 — Medir rendimiento

1. **PageSpeed Insights:** [pagespeed.web.dev](https://pagespeed.web.dev/)
   - Pegar tu URL
   - Revisar puntuacion mobile y desktop
   - Objetivo: 90+ en ambos

2. **Lighthouse** (en Chrome DevTools)
   - F12 > Lighthouse > Generar informe
   - Mas detallado que PageSpeed

3. **Search Console**
   - Experiencia de pagina > Core Web Vitals
   - Muestra datos reales de usuarios

---

### Paso 9.3 — Optimizaciones comunes

**Para mejorar LCP (velocidad de carga):**
- Comprimir imagenes (WebP, max 200KB)
- Usar CDN (Cloudflare es gratis)
- Habilitar compresion gzip/brotli en el servidor
- Minimizar CSS y JS
- Precargar fuentes: `<link rel="preload" href="font.woff2" as="font">`
- Lazy loading en imagenes: `<img loading="lazy">`
- Priorizar Above the fold: `<link rel="preload" href="hero.webp" as="image">`

**Para mejorar INP (interactividad):**
- Reducir JavaScript pesado
- Dividir tareas largas (code splitting, dynamic imports)
- Evitar handlers costosos en eventos frecuentes (scroll, resize)
- Usar `requestAnimationFrame` para animaciones

**Para mejorar CLS (estabilidad visual):**
- Definir `width` y `height` en todas las imagenes y videos
- Reservar espacio para ads/embeds antes de que carguen
- No insertar contenido dinamico arriba del viewport
- Usar `font-display: swap` para fuentes

**Compresion en servidor (Apache .htaccess):**
```apache
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/javascript application/javascript application/json
</IfModule>

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

**Compresion en Nginx:**
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
gzip_min_length 256;
```

---

### Paso 9.4 — Mobile-first

**Google usa la version mobile de tu sitio para indexar.** Si tu sitio no se ve bien en mobile, perderas posiciones.

**Checklist mobile:**
- [ ] Responsive design (se adapta a cualquier pantalla)
- [ ] Texto legible sin hacer zoom (minimo 16px)
- [ ] Botones y links con area tactil minima de 48x48px
- [ ] Sin scroll horizontal
- [ ] Menu de navegacion funcional en mobile
- [ ] Formularios faciles de llenar en mobile
- [ ] Sin popups invasivos (Google penaliza interstitials en mobile)

**Verificar:**
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- Chrome DevTools > Toggle device toolbar (Ctrl+Shift+M)

---

## Fase 10 — Monitoreo y mejora continua

### Paso 10.1 — Metricas a seguir semanalmente

| Metrica | Donde verla | Que buscar |
|---------|-------------|------------|
| Impresiones | Search Console > Rendimiento | Tendencia creciente |
| Clicks | Search Console > Rendimiento | Tendencia creciente |
| CTR promedio | Search Console > Rendimiento | > 3% es bueno |
| Posicion promedio | Search Console > Rendimiento | Menor es mejor |
| Sesiones organicas | GA4 > Adquisicion > Organico | Tendencia creciente |
| Tasa de rebote | GA4 > Participacion | < 60% es bueno |
| Paginas indexadas | Search Console > Cobertura | Creciente, sin errores |

---

### Paso 10.2 — Rutina SEO mensual

**Semana 1:**
- [ ] Revisar Search Console: errores de rastreo, cobertura, experiencia
- [ ] Publicar 1 articulo nuevo optimizado
- [ ] Revisar y responder resenas de Google (si aplica)

**Semana 2:**
- [ ] Publicar 1 articulo nuevo
- [ ] Revisar posiciones de keywords objetivo
- [ ] Buscar oportunidades de link building

**Semana 3:**
- [ ] Actualizar 1 articulo antiguo con informacion nueva
- [ ] Publicar 1 articulo nuevo
- [ ] Compartir contenido en redes sociales

**Semana 4:**
- [ ] Publicar 1 articulo nuevo
- [ ] Analizar metricas del mes (comparar con mes anterior)
- [ ] Planificar contenido del proximo mes
- [ ] Verificar Core Web Vitals

---

### Paso 10.3 — Que hacer segun la posicion

| Posicion actual | Accion |
|-----------------|--------|
| No indexada | Verificar robots.txt, canonical, y solicitar indexacion |
| 50+ | La pagina necesita mas contenido, mejor keyword targeting, o mas autoridad |
| 20-50 | Mejorar contenido (mas completo, mejor estructura), agregar links internos |
| 11-20 | Esta cerca. Mejorar title/meta description para CTR, conseguir 2-3 backlinks |
| 4-10 | Optimizar CTR (mejorar titulo), agregar datos estructurados, mejorar velocidad |
| 1-3 | Mantener. Actualizar contenido periodicamente. Defender la posicion |

---

## Checklist final

### Antes de lanzar (una sola vez)
- [ ] SSL activo y redireccion HTTP a HTTPS
- [ ] Dominio canonico elegido (www vs sin www) con redireccion
- [ ] robots.txt creado y correcto
- [ ] sitemap.xml generado y enviado a Search Console
- [ ] Google Search Console configurado y verificado
- [ ] Google Analytics 4 instalado y funcionando
- [ ] Pagina 404 personalizada
- [ ] Favicon y Open Graph configurados
- [ ] Mobile-friendly verificado
- [ ] Core Web Vitals en verde

### Para cada pagina
- [ ] Title tag unico con keyword (max 60 chars)
- [ ] Meta description unica con CTA (max 155 chars)
- [ ] Un solo H1 con keyword principal
- [ ] Jerarquia de encabezados correcta (H1 > H2 > H3)
- [ ] Imagenes optimizadas con alt text
- [ ] URL limpia y descriptiva
- [ ] Link canonical configurado
- [ ] Al menos 3 links internos
- [ ] Datos estructurados JSON-LD (segun tipo de pagina)
- [ ] Contenido de minimo 300 palabras (ideal 800+)

### Mensual
- [ ] Publicar 2-4 articulos nuevos
- [ ] Actualizar 1-2 articulos antiguos
- [ ] Revisar metricas en Search Console y GA4
- [ ] Verificar errores de rastreo
- [ ] Buscar oportunidades de backlinks
- [ ] Responder resenas (si aplica)

---

## Herramientas recomendadas

### Gratuitas (imprescindibles)
| Herramienta | URL | Para que |
|-------------|-----|----------|
| Google Search Console | search.google.com/search-console | Monitoreo de indexacion y rendimiento |
| Google Analytics 4 | analytics.google.com | Trafico y comportamiento |
| PageSpeed Insights | pagespeed.web.dev | Velocidad y Core Web Vitals |
| Google Keyword Planner | ads.google.com (herramientas) | Investigacion de keywords |
| Rich Results Test | search.google.com/test/rich-results | Validar datos estructurados |
| Mobile-Friendly Test | search.google.com/test/mobile-friendly | Verificar compatibilidad mobile |
| Squoosh | squoosh.app | Compresion de imagenes |

### Gratuitas (utiles)
| Herramienta | URL | Para que |
|-------------|-----|----------|
| Ubersuggest | ubersuggest.com | Keywords y analisis de competencia |
| AnswerThePublic | answerthepublic.com | Ideas de contenido |
| Google Trends | trends.google.com | Tendencias de busqueda |
| Google Alerts | google.com/alerts | Monitorear menciones de tu marca |
| Screaming Frog (gratis hasta 500 URLs) | screamingfrog.co.uk | Auditoria tecnica del sitio |
| Ahrefs Webmaster Tools (gratis) | ahrefs.com/webmaster-tools | Backlinks y salud del sitio |

### Pagas (cuando escales)
| Herramienta | Precio | Para que |
|-------------|--------|----------|
| Ahrefs | ~$99/mes | Suite completa: keywords, backlinks, competencia |
| SEMrush | ~$129/mes | Similar a Ahrefs, bueno para PPC tambien |
| Surfer SEO | ~$89/mes | Optimizacion de contenido on-page |

---

## Errores comunes a evitar

1. **Keyword stuffing** — Repetir la keyword 50 veces. Google penaliza.
2. **Contenido duplicado** — Copiar de otros sitios o tener el mismo contenido en varias URLs.
3. **Links comprados** — Google detecta patrones de links no naturales.
4. **Ignorar mobile** — Google indexa la version mobile primero.
5. **No tener HTTPS** — Penalizacion directa.
6. **URLs con parametros** — `/page?id=23` en vez de `/servicios/envios`.
7. **Imagenes sin optimizar** — Imagenes de 5MB matan la velocidad.
8. **No medir** — Si no medis, no sabes que funciona.
9. **Esperar resultados inmediatos** — SEO tarda meses, no dias.
10. **Abandonar** — El error mas comun. SEO requiere consistencia.
11. **Titulo generico** — "Home", "Servicios", "Bienvenidos" no posicionan.
12. **No tener sitemap** — Google puede no encontrar todas tus paginas.
13. **Bloquear CSS/JS en robots.txt** — Google necesita renderizar tu pagina.
14. **Popups invasivos en mobile** — Google penaliza interstitials molestos.
15. **No responder resenas negativas** — Afecta SEO local y reputacion.

---

## Cronograma sugerido

### Mes 1 — Fundamentos
- Semana 1: Fase 1 completa (SSL, robots.txt, sitemap, URLs, 404)
- Semana 2: Fase 2 completa (Search Console, Analytics)
- Semana 3: Fase 3 (investigacion de keywords, mapa de keywords)
- Semana 4: Fase 4 (optimizar titles, metas, H1s de todas las paginas existentes)

### Mes 2 — Contenido y estructura
- Semana 1-2: Fase 5 (crear blog, publicar primeros 2-3 articulos)
- Semana 3: Fase 6 (agregar datos estructurados a todas las paginas)
- Semana 4: Fase 9 (optimizar velocidad y Core Web Vitals)

### Mes 3 — Autoridad y local
- Semana 1: Fase 8 (Google Business Profile si aplica)
- Semana 2-3: Fase 7 (primeras acciones de link building)
- Semana 4: Fase 10 (establecer rutina de monitoreo)

### Mes 4 en adelante — Crecimiento
- Publicar 2-4 articulos por mes
- Actualizar contenido viejo mensualmente
- Link building continuo
- Monitoreo semanal de metricas
- Ajustar estrategia segun datos

---

> **Recordatorio final:** SEO es un maraton, no un sprint. Los resultados tipicos empiezan a verse entre el mes 3 y 6. La consistencia es el factor mas importante. Un sitio que publica contenido de calidad regularmente, mantiene su parte tecnica al dia y construye autoridad de forma natural, eventualmente posiciona.
