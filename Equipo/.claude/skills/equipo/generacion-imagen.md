# Skill — Generación de Imágenes

## Descripción
Generación de imágenes con Google Gemini Imagen 3. El usuario pide la imagen a Archie y Archie ejecuta el script internamente.

## Ubicación
`herramientas/imagen/` — módulo Node.js standalone y portable.

## Cuándo usar
- El usuario pide generar una imagen, logo, banner, ilustración, ícono, mockup, etc.
- Se necesita un asset visual para un proyecto.

## Cómo ejecutar (Archie)
Cuando el usuario pida una imagen, ejecutar:

```bash
cd C:/xampp/htdocs/Equipo/herramientas/imagen && node src/generar.js "PROMPT" --nombre NOMBRE
```

### Parámetros
| Flag | Qué hace | Default |
|---|---|---|
| (primer argumento) | Prompt descriptivo de la imagen | requerido |
| `--cantidad N` | Número de imágenes (1-4) | 1 |
| `--salida RUTA` | Carpeta destino | `output/` |
| `--nombre TEXTO` | Nombre base del archivo | timestamp |

### Ejemplos
```bash
# Imagen simple
node src/generar.js "logo minimalista azul para app de tareas"

# Varias variantes con nombre
node src/generar.js "banner hero futurista" --cantidad 3 --nombre banner-hero

# Guardar en carpeta del proyecto
node src/generar.js "ícono de usuario" --salida /ruta/al/proyecto/assets
```

## Buenas prácticas para el prompt
- Ser específico: colores, estilo, composición, contexto
- Incluir el tipo de imagen: "logo", "ilustración", "foto realista", "ícono flat"
- Mencionar el mood: "profesional", "juguetón", "elegante", "minimalista"
- Si es para UI, indicar fondo transparente o color específico

## Flujo para Archie
1. El usuario pide una imagen
2. Archie redacta un prompt optimizado en inglés (Imagen 3 responde mejor en inglés)
3. Archie ejecuta el script con Bash
4. Archie muestra la imagen al usuario con Read (lee el PNG generado)
5. Si el usuario quiere ajustes, Archie reformula el prompt y regenera

## Setup (una sola vez)
```bash
cd Equipo/herramientas/imagen
cp .env.example .env    # Agregar GEMINI_API_KEY
npm install
```
