// Archie Team — StatusLine para Claude Code
// Muestra: equipo + proyecto activo + modelo + contexto

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);

    // Modelo con indicador de tier
    const modelName = data.model?.display_name || '?';
    const modelId = (data.model?.id || '').toLowerCase();
    const tier = modelId.includes('opus') ? 'MAX' : modelId.includes('haiku') ? 'ECO' : 'STD';
    const model = `${modelName}:${tier}`;

    // Directorio actual → nombre del proyecto
    const cwd = data.workspace?.current_dir || '';
    const project = cwd.split(/[/\\]/).filter(Boolean).pop() || '?';

    // Contexto usado
    const ctxPct = Math.round(data.context_window?.used_percentage || 0);

    // Barra de contexto visual (10 bloques)
    const filled = Math.round(ctxPct / 10);
    const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);

    // Tokens usados
    const tokens = data.context_window?.total_input_tokens || 0;
    const fmt = n => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

    // Agente activo (si hay subagente)
    const agent = data.agent?.name;
    const agentStr = agent ? ` | ag:${agent}` : '';

    console.log(`Archie | ${project} | ${model} | ${fmt(tokens)} | ${bar} ${ctxPct}%${agentStr}`);
  } catch {
    console.log('Archie | --');
  }
});
