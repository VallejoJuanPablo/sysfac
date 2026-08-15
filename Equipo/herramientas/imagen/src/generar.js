import { GoogleGenAI } from '@google/genai';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from './config.js';

// --- Parseo de argumentos ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help') {
  console.log('Uso: node src/generar.js "prompt de la imagen" [opciones]');
  console.log('');
  console.log('Opciones:');
  console.log('  --cantidad N     Número de imágenes (1-4, default: 1)');
  console.log('  --salida RUTA    Carpeta destino (default: output/)');
  console.log('  --nombre TEXTO   Nombre base del archivo (default: timestamp)');
  console.log('');
  console.log('Ejemplo:');
  console.log('  node src/generar.js "un logo minimalista azul" --cantidad 2');
  process.exit(0);
}

// Extraer prompt (primer argumento que no sea flag)
let prompt = '';
let cantidad = 1;
let salida = config.outputDir;
let nombre = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--cantidad' && args[i + 1]) {
    cantidad = Math.min(4, Math.max(1, parseInt(args[i + 1], 10)));
    i++;
  } else if (args[i] === '--salida' && args[i + 1]) {
    salida = args[i + 1];
    i++;
  } else if (args[i] === '--nombre' && args[i + 1]) {
    nombre = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    prompt = args[i];
  }
}

if (!prompt) {
  console.error('Error: falta el prompt. Uso: node src/generar.js "descripción de la imagen"');
  process.exit(1);
}

// --- Generación con Gemini Flash (generateContent) ---
async function generar() {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  // Crear carpeta de salida
  if (!existsSync(salida)) {
    mkdirSync(salida, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const archivos = [];

  for (let n = 0; n < cantidad; n++) {
    const label = cantidad > 1 ? ` (${n + 1}/${cantidad})` : '';
    console.log(`Generando imagen${label}...`);
    console.log(`Prompt: "${prompt}"`);

    const response = await ai.models.generateContent({
      model: config.model,
      contents: [{ role: 'user', parts: [{ text: `Generate this image: ${prompt}` }] }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    // Buscar la parte que contiene la imagen
    let imageFound = false;

    if (response.candidates && response.candidates.length > 0) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
          const base64 = part.inlineData.data;
          const ext = part.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';

          const baseName = nombre || timestamp;
          const suffix = cantidad > 1 ? `_${n + 1}` : '';
          const fileName = `${baseName}${suffix}.${ext}`;
          const filePath = join(salida, fileName);

          writeFileSync(filePath, Buffer.from(base64, 'base64'));
          archivos.push(filePath);
          console.log(`Guardada: ${filePath}`);
          imageFound = true;
        }
      }
    }

    if (!imageFound) {
      console.error('Gemini no devolvió imagen en esta iteración. Probá reformular el prompt.');
    }

    console.log('');
  }

  if (archivos.length === 0) {
    console.error('No se generó ninguna imagen.');
    process.exit(1);
  }

  console.log(`Listo. ${archivos.length} imagen(es) generada(s).`);
  return archivos;
}

generar().catch((error) => {
  console.error('Error al generar:', error.message);
  process.exit(1);
});
