import { readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EQUIPO_DIR = join(__dirname, '..', '..');

function readFileSafe(filePath) {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function scanMarkdownFiles(dir) {
  const results = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...scanMarkdownFiles(fullPath));
      } else if (entry.endsWith('.md')) {
        const content = readFileSafe(fullPath);
        if (content) {
          const relativePath = fullPath.replace(EQUIPO_DIR, '').replace(/\\/g, '/');
          results.push({ path: relativePath, content });
        }
      }
    }
  } catch {
    // Directorio no existe, ignorar
  }
  return results;
}

export function buildSystemPrompt() {
  // 1. Identidad base
  const identity = readFileSafe(join(EQUIPO_DIR, 'CLAUDE.md')) || '';

  // 2. Agentes disponibles
  const agentes = scanMarkdownFiles(join(EQUIPO_DIR, 'agentes'));
  let agentesSection = '## Agentes disponibles\n\n';
  for (const agent of agentes) {
    agentesSection += `### ${agent.path}\n${agent.content}\n\n`;
  }

  // 3. Skills disponibles
  const skills = scanMarkdownFiles(join(EQUIPO_DIR, 'skills'));
  let skillsSection = '## Skills del equipo\n\n';
  for (const skill of skills) {
    const name = basename(skill.path, '.md');
    skillsSection += `### ${name}\n${skill.content}\n\n`;
  }

  // 4. Contexto de Telegram
  const telegramContext = `
## Contexto: Telegram Bot
Estás operando como bot de Telegram. Reglas adicionales:
- Respondé de forma concisa — los mensajes largos son incómodos en Telegram.
- Usá formato Markdown compatible con Telegram (negrita con *, código con \`).
- Si necesitás confirmación del usuario, preguntá directamente.
- Cuando termines una tarea o necesites atención, avisá con claridad.
- No tenés acceso al sistema de archivos del proyecto desde Telegram.
- Tu rol acá es conversar, asesorar, planificar y notificar.
- Máximo ~4000 caracteres por mensaje (límite de Telegram).
`;

  return `${identity}\n\n${agentesSection}\n${skillsSection}\n${telegramContext}`;
}
