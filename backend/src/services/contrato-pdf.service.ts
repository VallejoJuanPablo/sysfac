import puppeteer from 'puppeteer';

interface ContratoData {
  entidad: string;
  tipoPrestamo: string;
  deudorNombre: string;
  deudorDni: string;
  deudorDomicilio: string;
  deudorTelefono: string;
  nombre: string;
  valorVehiculo: number;
  montoFinanciar: number;
  plazo: number;
  tna: number;
  sistema: string;
  condicion: string;
  seguroAutoAnual: number;
  seguroVidaMensual: number;
  gastoAdminMensual: number;
  ivaIntereses: boolean;
  cuotaPura: number;
  cuotaTotal: number;
  totalIntereses: number;
  costoTotal: number;
}

interface FilaCuota {
  nro: number;
  saldoInicial: number;
  amortizacion: number;
  interes: number;
  cuotaPura: number;
  seguroAuto: number;
  seguroVida: number;
  gastoAdmin: number;
  iva: number;
  cuotaTotal: number;
  saldoFinal: number;
}

function formatMoney(value: number): string {
  return '$' + value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(date: Date): string {
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${date.getDate()} de ${meses[date.getMonth()]} de ${date.getFullYear()}`;
}

function numberToWords(n: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];

  if (n <= 29) return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? tens[t] : `${tens[t]} y ${units[u]}`;
  }
  return String(n);
}

function generarTabla(data: ContratoData): FilaCuota[] {
  const capital = data.montoFinanciar;
  const tasaMensual = data.tna / 100 / 12;
  const n = data.plazo;
  const esPrendario = data.tipoPrestamo === 'prendario';
  const seguroAutoMes = esPrendario ? data.valorVehiculo * (data.seguroAutoAnual / 100) / 12 : 0;
  const segVidaMes = data.seguroVidaMensual / 100;
  const gastoAdmin = data.gastoAdminMensual;
  const conIva = data.ivaIntereses;
  const esFrances = data.sistema === 'frances';

  let cuotaPuraFrances = 0;
  if (esFrances) {
    if (tasaMensual === 0) {
      cuotaPuraFrances = capital / n;
    } else {
      const factor = Math.pow(1 + tasaMensual, n);
      cuotaPuraFrances = capital * (tasaMensual * factor) / (factor - 1);
    }
  }

  const amortFija = capital / n;
  const filas: FilaCuota[] = [];
  let saldo = capital;

  for (let k = 1; k <= n; k++) {
    const interes = saldo * tasaMensual;
    let amortizacion: number;
    let cuotaPura: number;

    if (esFrances) {
      cuotaPura = cuotaPuraFrances;
      amortizacion = cuotaPura - interes;
    } else {
      amortizacion = amortFija;
      cuotaPura = amortizacion + interes;
    }

    const seguroVida = saldo * segVidaMes;
    const iva = conIva ? interes * 0.21 : 0;
    const cuotaTotal = cuotaPura + seguroAutoMes + seguroVida + gastoAdmin + iva;

    filas.push({
      nro: k,
      saldoInicial: saldo,
      amortizacion,
      interes,
      cuotaPura,
      seguroAuto: seguroAutoMes,
      seguroVida,
      gastoAdmin,
      iva,
      cuotaTotal,
      saldoFinal: Math.max(0, saldo - amortizacion),
    });

    saldo -= amortizacion;
  }

  return filas;
}

export async function generarContratoPdf(data: ContratoData): Promise<Buffer> {
  const hoy = new Date();
  const esPrendario = data.tipoPrestamo === 'prendario';
  const tea = (Math.pow(1 + data.tna / 100 / 12, 12) - 1) * 100;
  const sistemaTexto = data.sistema === 'frances' ? 'Francés (cuota fija)' : 'Alemán (cuota decreciente)';
  const filas = generarTabla(data);
  const totalIntereses = filas.reduce((s, f) => s + f.interes, 0);
  const costoTotal = filas.reduce((s, f) => s + f.cuotaTotal, 0);

  const filasHtml = filas.map(f => `
    <tr>
      <td class="num">${f.nro}</td>
      <td class="money">${formatMoney(f.cuotaPura)}</td>
      <td class="money">${formatMoney(f.amortizacion)}</td>
      <td class="money">${formatMoney(f.interes)}</td>
      <td class="money bold">${formatMoney(f.cuotaTotal)}</td>
      <td class="money">${formatMoney(f.saldoFinal)}</td>
    </tr>`).join('');

  // Cláusula de garantía prendaria
  const garantiaClause = esPrendario ? `
    <p><strong>CUARTA: GARANTÍA PRENDARIA.</strong> En garantía del fiel cumplimiento de todas las
    obligaciones emergentes del presente contrato, EL MUTUARIO constituye prenda en primer grado
    a favor de EL MUTUANTE sobre el vehículo identificado como
    <strong>"${data.nombre || 'S/D'}"</strong>, condición <strong>${data.condicion === '0km' ? '0 km' : 'Usado'}</strong>,
    con un valor de mercado de <strong>${formatMoney(data.valorVehiculo)}</strong>.
    EL MUTUARIO se obliga a: a) mantener el bien en perfecto estado de conservación y uso;
    b) contratar y mantener vigente un seguro automotor con cobertura total durante todo el plazo del mutuo;
    c) no vender, ceder, permutar, donar ni gravar el bien sin autorización escrita de EL MUTUANTE;
    d) facilitar la inspección del bien cuando EL MUTUANTE lo requiera.</p>
  ` : '';

  // Numeración dinámica de cláusulas
  let clauseNum = esPrendario ? 5 : 4;
  const cn = () => {
    const nums = ['', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA', 'UNDÉCIMA', 'DUODÉCIMA'];
    return nums[clauseNum++] || `${clauseNum++ - 1}°`;
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 18mm 22mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11.5px;
          color: #1a1a1a;
          line-height: 1.65;
        }
        .header {
          text-align: center;
          margin-bottom: 25px;
          padding-bottom: 12px;
          border-bottom: 2px solid #333;
        }
        .header .brand {
          font-size: 22px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .header .title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #333;
        }
        .header .date {
          font-size: 10px;
          color: #666;
          margin-top: 6px;
        }
        .section p {
          text-align: justify;
          margin-bottom: 8px;
          text-indent: 25px;
        }
        .section p.no-indent {
          text-indent: 0;
        }
        .datos-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
          font-size: 10.5px;
        }
        .datos-table td {
          padding: 5px 8px;
          border: 1px solid #ccc;
        }
        .datos-table td.label {
          background: #f5f5f5;
          font-weight: bold;
          width: 35%;
          color: #333;
        }
        .cuotas-title {
          font-size: 13px;
          font-weight: bold;
          text-align: center;
          margin: 20px 0 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
          page-break-before: auto;
        }
        .cuotas-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
          margin-bottom: 15px;
        }
        .cuotas-table thead th {
          background: #333;
          color: white;
          padding: 5px 4px;
          text-align: center;
          font-weight: 600;
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .cuotas-table tbody td {
          padding: 3px 4px;
          border-bottom: 1px solid #ddd;
          text-align: right;
        }
        .cuotas-table tbody td.num { text-align: center; font-weight: 600; }
        .cuotas-table tbody td.bold { font-weight: 700; }
        .cuotas-table tbody tr:nth-child(even) { background: #f9f9f9; }
        .cuotas-table tfoot td {
          padding: 5px 4px;
          border-top: 2px solid #333;
          font-weight: bold;
          text-align: right;
          font-size: 9.5px;
        }
        .firmas {
          display: flex;
          justify-content: space-between;
          margin-top: 60px;
          page-break-inside: avoid;
        }
        .firma-box {
          width: 40%;
          text-align: center;
        }
        .firma-line {
          border-top: 1px solid #333;
          padding-top: 6px;
          font-size: 10px;
        }
        .firma-line .name { font-weight: bold; }
        .firma-line .role { font-size: 9px; color: #666; }
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 8px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">${data.entidad}</div>
        <div class="title">Contrato de Mutuo${esPrendario ? ' con Garantía Prendaria' : ''}</div>
        <div class="date">${formatDate(hoy)}</div>
      </div>

      <div class="section">
        <p class="no-indent">En la ciudad de ______________, a los ${hoy.getDate()} días del mes de
        ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][hoy.getMonth()]}
        de ${hoy.getFullYear()}, entre:</p>

        <p class="no-indent"><strong>${data.entidad}</strong>, en adelante <strong>"EL MUTUANTE"</strong>, por una parte; y por la otra
        <strong>${data.deudorNombre || '___________________________'}</strong>,
        DNI N° <strong>${data.deudorDni || '________________'}</strong>,
        con domicilio real en <strong>${data.deudorDomicilio || '________________________________________'}</strong>,
        teléfono <strong>${data.deudorTelefono || '________________'}</strong>,
        en adelante <strong>"EL MUTUARIO"</strong>, convienen en celebrar el presente
        <strong>Contrato de Mutuo${esPrendario ? ' con Garantía Prendaria' : ''}</strong>,
        que se regirá por las siguientes cláusulas y condiciones:</p>
      </div>

      <div class="section">
        <p><strong>PRIMERA: OBJETO.</strong> EL MUTUANTE entrega en este acto a EL MUTUARIO,
        en calidad de mutuo, la suma de <strong>${formatMoney(data.montoFinanciar)}</strong>
        (${numberToWords(Math.round(data.montoFinanciar / 1000))} mil pesos),
        que EL MUTUARIO declara recibir de plena conformidad, obligándose a restituir
        dicha suma con más los intereses convenidos, en la forma y plazos estipulados en el presente.</p>

        <p><strong>SEGUNDA: DESTINO.</strong> El capital mutuado será destinado por EL MUTUARIO
        a ${esPrendario ? `la adquisición del vehículo detallado en la cláusula CUARTA del presente` : 'uso personal'}, declarando conocer que el desvío
        del destino pactado facultará a EL MUTUANTE a exigir la devolución inmediata del total adeudado.</p>

        <p><strong>TERCERA: CONDICIONES FINANCIERAS.</strong> Las partes acuerdan las siguientes
        condiciones para la restitución del capital mutuado y sus accesorios:</p>

        <table class="datos-table">
          <tr>
            <td class="label">Capital mutuado</td>
            <td>${formatMoney(data.montoFinanciar)}</td>
          </tr>
          ${esPrendario ? `<tr>
            <td class="label">Valor del bien prendado</td>
            <td>${formatMoney(data.valorVehiculo)}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Plazo de restitución</td>
            <td>${data.plazo} (${numberToWords(data.plazo)}) meses</td>
          </tr>
          <tr>
            <td class="label">Tasa Nominal Anual (TNA)</td>
            <td>${data.tna.toFixed(2)}%</td>
          </tr>
          <tr>
            <td class="label">Tasa Efectiva Anual (TEA)</td>
            <td>${tea.toFixed(2)}%</td>
          </tr>
          <tr>
            <td class="label">Sistema de amortización</td>
            <td>${sistemaTexto}</td>
          </tr>
          <tr>
            <td class="label">Cuota pura mensual</td>
            <td>${formatMoney(filas[0]?.cuotaPura || 0)}</td>
          </tr>
          <tr>
            <td class="label">Cuota total mensual (1°)</td>
            <td>${formatMoney(filas[0]?.cuotaTotal || 0)}</td>
          </tr>
          <tr>
            <td class="label">Total de intereses</td>
            <td>${formatMoney(totalIntereses)}</td>
          </tr>
          <tr>
            <td class="label">Costo financiero total</td>
            <td>${formatMoney(costoTotal)}</td>
          </tr>
        </table>

        ${garantiaClause}

        <p><strong>${cn()}: FORMA Y PLAZO DE RESTITUCIÓN.</strong> EL MUTUARIO se obliga a restituir
        el capital mutuado con más sus intereses en <strong>${data.plazo} (${numberToWords(data.plazo)}) cuotas
        mensuales y consecutivas</strong>, conforme al plan de pagos que como <strong>Anexo I</strong>
        forma parte integrante del presente contrato.
        La primera cuota vencerá a los treinta (30) días corridos de la fecha de suscripción del presente.
        Las cuotas subsiguientes vencerán en igual día de los meses posteriores.
        Los pagos deberán efectuarse mediante los medios que EL MUTUANTE habilite a tal efecto.</p>

        <p><strong>${cn()}: INTERESES COMPENSATORIOS.</strong> Las partes pactan una tasa nominal anual
        del <strong>${data.tna.toFixed(2)}%</strong> (TNA), equivalente a una tasa efectiva anual del
        <strong>${tea.toFixed(2)}%</strong> (TEA), calculada sobre saldo deudor según sistema de amortización
        ${sistemaTexto.toLowerCase()}.</p>

        <p><strong>${cn()}: MORA.</strong> La falta de pago de cualquier cuota a su vencimiento
        constituirá a EL MUTUARIO en mora de pleno derecho y sin necesidad de interpelación
        judicial o extrajudicial alguna (art. 886 del Código Civil y Comercial).
        Los intereses punitorios se calcularán a una tasa equivalente al <strong>50%</strong>
        adicional sobre la tasa compensatoria pactada, aplicados sobre el capital impago
        desde la fecha de vencimiento hasta su efectivo pago.</p>

        <p><strong>${cn()}: CADUCIDAD DE PLAZOS.</strong> EL MUTUANTE podrá declarar la caducidad
        de todos los plazos otorgados y exigir el pago íntegro del saldo adeudado, con más
        intereses y accesorios, en cualquiera de los siguientes supuestos:
        a) mora en el pago de dos (2) o más cuotas consecutivas o tres (3) alternadas;
        b) falsedad en los datos proporcionados por EL MUTUARIO;
        ${esPrendario ? 'c) deterioro, destrucción, venta o gravamen del bien prendado sin autorización; d)' : 'c)'}
        inicio de concurso preventivo, quiebra o cualquier procedimiento de insolvencia de EL MUTUARIO;
        ${esPrendario ? 'e)' : 'd)'} incumplimiento de cualquier otra obligación asumida en el presente contrato.</p>

        <p><strong>${cn()}: GASTOS Y SELLADOS.</strong> Todos los gastos, impuestos, tasas, sellados
        y honorarios profesionales que se originen con motivo de la celebración, cumplimiento o
        ejecución del presente contrato serán a exclusivo cargo de EL MUTUARIO.</p>

        <p><strong>${cn()}: DOMICILIOS.</strong> Las partes constituyen domicilios especiales en los
        indicados en el encabezamiento del presente, donde serán válidas todas las notificaciones
        judiciales y extrajudiciales. El cambio de domicilio deberá notificarse fehacientemente
        a la otra parte con una anticipación mínima de cinco (5) días hábiles.</p>

        <p><strong>${cn()}: JURISDICCIÓN.</strong> Para todos los efectos judiciales y extrajudiciales
        derivados del presente contrato, las partes se someten a la jurisdicción de los
        Tribunales Ordinarios competentes, renunciando a cualquier otro fuero o jurisdicción
        que pudiera corresponderles.</p>

        <p><strong>${cn()}: EJEMPLARES.</strong> El presente contrato se firma en dos (2) ejemplares
        de un mismo tenor y a un solo efecto, quedando uno (1) en poder de cada parte,
        quienes manifiestan su plena conformidad firmando al pie.</p>
      </div>

      <div class="firmas">
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.deudorNombre || '___________________________'}</div>
            <div class="role">EL MUTUARIO — DNI ${data.deudorDni || '________________'}</div>
          </div>
        </div>
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.entidad}</div>
            <div class="role">EL MUTUANTE</div>
          </div>
        </div>
      </div>

      <!-- ANEXO I: PLAN DE PAGOS -->
      <div style="page-break-before: always;"></div>

      <div class="header">
        <div class="brand">${data.entidad}</div>
        <div class="title">Anexo I — Plan de Pagos</div>
        <div class="date">Parte integrante del Contrato de Mutuo — ${formatDate(hoy)}</div>
      </div>

      <div class="section">
        <p class="no-indent"><strong>Mutuario:</strong> ${data.deudorNombre || '___________________________'} — DNI ${data.deudorDni || '________________'}</p>
        <p class="no-indent"><strong>Capital:</strong> ${formatMoney(data.montoFinanciar)} | <strong>TNA:</strong> ${data.tna.toFixed(2)}% | <strong>Sistema:</strong> ${sistemaTexto} | <strong>Plazo:</strong> ${data.plazo} cuotas</p>
      </div>

      <table class="cuotas-table">
        <thead>
          <tr>
            <th>Cuota</th>
            <th>Cuota Pura</th>
            <th>Amortización</th>
            <th>Interés</th>
            <th>Cuota Total</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
        <tfoot>
          <tr>
            <td style="text-align:center">TOTAL</td>
            <td>${formatMoney(filas.reduce((s, f) => s + f.cuotaPura, 0))}</td>
            <td>${formatMoney(filas.reduce((s, f) => s + f.amortizacion, 0))}</td>
            <td>${formatMoney(totalIntereses)}</td>
            <td>${formatMoney(costoTotal)}</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>

      <div class="firmas">
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.deudorNombre || '___________________________'}</div>
            <div class="role">EL MUTUARIO</div>
          </div>
        </div>
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.entidad}</div>
            <div class="role">EL MUTUANTE</div>
          </div>
        </div>
      </div>

      <div class="footer">
        Documento generado por SysFac — ${formatDate(hoy)} — Este documento no tiene validez sin las firmas de ambas partes
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
