import puppeteer from 'puppeteer';

interface ContratoData {
  // Entidad y tipo
  entidad: string;
  tipoPrestamo: string;
  // Deudor
  deudorNombre: string;
  deudorDni: string;
  deudorDomicilio: string;
  deudorTelefono: string;
  // Crédito
  nombre: string;
  valorVehiculo: number;
  montoFinanciar: number;
  plazo: number;
  tna: number;
  sistema: string;
  condicion: string;
  cuotaPura: number;
  cuotaTotal: number;
  totalIntereses: number;
  costoTotal: number;
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

export async function generarContratoPdf(data: ContratoData): Promise<Buffer> {
  const hoy = new Date();
  const esPrendario = data.tipoPrestamo === 'prendario';
  const tea = (Math.pow(1 + data.tna / 100 / 12, 12) - 1) * 100;
  const sistemaTexto = data.sistema === 'frances' ? 'Francés (cuota fija)' : 'Alemán (cuota decreciente)';
  const tipoTexto = esPrendario ? 'Préstamo Prendario' : 'Préstamo Personal';

  const vehiculoClause = esPrendario ? `
    <p><strong>TERCERA: DEL BIEN PRENDADO.</strong> El DEUDOR constituye prenda en primer grado sobre el vehículo
    detallado como "${data.nombre || 'S/D'}", condición <strong>${data.condicion === '0km' ? '0 km' : 'Usado'}</strong>,
    con un valor de mercado de <strong>${formatMoney(data.valorVehiculo)}</strong>.
    El DEUDOR se compromete a mantener el bien en buen estado de conservación, contratar seguro
    automotor vigente durante toda la duración del crédito, y no enajenar ni gravar el bien sin
    autorización escrita del ACREEDOR.</p>
  ` : '';

  const vehiculoClauseNum = esPrendario ? 'CUARTA' : 'TERCERA';
  const moraClauseNum = esPrendario ? 'QUINTA' : 'CUARTA';
  const vencimientoClauseNum = esPrendario ? 'SEXTA' : 'QUINTA';
  const gastosClauseNum = esPrendario ? 'SÉPTIMA' : 'SEXTA';
  const jurisdiccionClauseNum = esPrendario ? 'OCTAVA' : 'SÉPTIMA';
  const ejemplaresClauseNum = esPrendario ? 'NOVENA' : 'OCTAVA';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 20mm 25mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 12px;
          color: #1a1a1a;
          line-height: 1.7;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #333;
        }
        .header .brand {
          font-size: 24px;
          font-weight: bold;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }
        .header .title {
          font-size: 18px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #333;
        }
        .header .date {
          font-size: 11px;
          color: #666;
          margin-top: 8px;
        }
        .section {
          margin-bottom: 15px;
        }
        .section p {
          text-align: justify;
          margin-bottom: 10px;
          text-indent: 30px;
        }
        .section p:first-child {
          text-indent: 0;
        }
        .datos-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
          font-size: 11px;
        }
        .datos-table td {
          padding: 6px 10px;
          border: 1px solid #ccc;
        }
        .datos-table td.label {
          background: #f5f5f5;
          font-weight: bold;
          width: 35%;
          color: #333;
        }
        .firmas {
          display: flex;
          justify-content: space-between;
          margin-top: 80px;
          page-break-inside: avoid;
        }
        .firma-box {
          width: 40%;
          text-align: center;
        }
        .firma-line {
          border-top: 1px solid #333;
          padding-top: 8px;
          font-size: 11px;
        }
        .firma-line .name {
          font-weight: bold;
        }
        .firma-line .role {
          font-size: 10px;
          color: #666;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 9px;
          color: #999;
          border-top: 1px solid #ddd;
          padding-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">${data.entidad}</div>
        <div class="title">Contrato de ${tipoTexto}</div>
        <div class="date">${formatDate(hoy)}</div>
      </div>

      <div class="section">
        <p>Entre <strong>${data.entidad}</strong>, en adelante "EL ACREEDOR", y
        <strong>${data.deudorNombre || '___________________________'}</strong>,
        DNI N° <strong>${data.deudorDni || '________________'}</strong>,
        con domicilio en <strong>${data.deudorDomicilio || '___________________________________'}</strong>,
        teléfono <strong>${data.deudorTelefono || '________________'}</strong>,
        en adelante "EL DEUDOR", se celebra el presente contrato de ${tipoTexto.toLowerCase()},
        sujeto a las siguientes cláusulas:</p>
      </div>

      <div class="section">
        <p><strong>PRIMERA: DEL PRÉSTAMO.</strong> EL ACREEDOR otorga al DEUDOR un préstamo
        por la suma de <strong>${formatMoney(data.montoFinanciar)}</strong>
        (${numberToWords(Math.round(data.montoFinanciar / 1000))} mil pesos),
        que el DEUDOR declara recibir en este acto de plena conformidad.</p>

        <p><strong>SEGUNDA: CONDICIONES FINANCIERAS.</strong> El préstamo se regirá por las
        siguientes condiciones:</p>

        <table class="datos-table">
          <tr>
            <td class="label">Monto del préstamo</td>
            <td>${formatMoney(data.montoFinanciar)}</td>
          </tr>
          ${esPrendario ? `<tr>
            <td class="label">Valor del vehículo</td>
            <td>${formatMoney(data.valorVehiculo)}</td>
          </tr>` : ''}
          <tr>
            <td class="label">Plazo</td>
            <td>${data.plazo} meses (${numberToWords(data.plazo)} meses)</td>
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
            <td class="label">Valor de la cuota pura</td>
            <td>${formatMoney(data.cuotaPura)}</td>
          </tr>
          <tr>
            <td class="label">Valor de la cuota total (1°)</td>
            <td>${formatMoney(data.cuotaTotal)}</td>
          </tr>
          <tr>
            <td class="label">Total de intereses</td>
            <td>${formatMoney(data.totalIntereses)}</td>
          </tr>
          <tr>
            <td class="label">Costo financiero total</td>
            <td>${formatMoney(data.costoTotal)}</td>
          </tr>
        </table>

        ${vehiculoClause}

        <p><strong>${vehiculoClauseNum}: FORMA DE PAGO.</strong> El DEUDOR se obliga a pagar
        el préstamo en <strong>${data.plazo} cuotas mensuales y consecutivas</strong>,
        venciendo la primera cuota a los treinta (30) días corridos de la fecha del presente contrato.
        Los pagos deberán realizarse mediante los medios habilitados por EL ACREEDOR.</p>

        <p><strong>${moraClauseNum}: MORA.</strong> La falta de pago de cualquier cuota en su
        fecha de vencimiento constituirá al DEUDOR en mora de pleno derecho, sin necesidad de
        interpelación judicial o extrajudicial alguna. En caso de mora, se aplicará un interés
        punitorio equivalente al 50% de la tasa pactada, calculado sobre el monto impago.</p>

        <p><strong>${vencimientoClauseNum}: CADUCIDAD DE PLAZOS.</strong> EL ACREEDOR podrá
        declarar la caducidad de todos los plazos y exigir el pago total del saldo adeudado cuando:
        a) el DEUDOR incurra en mora de dos (2) o más cuotas consecutivas;
        b) el DEUDOR proporcione información falsa;
        ${esPrendario ? 'c) el bien prendado sufra deterioro significativo o sea enajenado sin autorización;' : ''}
        ${esPrendario ? 'd)' : 'c)'} se inicie concurso preventivo o quiebra del DEUDOR.</p>

        <p><strong>${gastosClauseNum}: GASTOS.</strong> Todos los gastos, impuestos, sellados y
        honorarios que se originen con motivo del presente contrato serán a cargo del DEUDOR.</p>

        <p><strong>${jurisdiccionClauseNum}: JURISDICCIÓN.</strong> Para todos los efectos
        judiciales y extrajudiciales derivados del presente contrato, las partes se someten a
        la jurisdicción de los Tribunales Ordinarios competentes.</p>

        <p><strong>${ejemplaresClauseNum}: EJEMPLARES.</strong> El presente contrato se firma en
        dos (2) ejemplares de un mismo tenor y a un solo efecto, quedando uno en poder de cada parte.</p>
      </div>

      <div class="firmas">
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.deudorNombre || '___________________________'}</div>
            <div class="role">EL DEUDOR — DNI ${data.deudorDni || '________________'}</div>
          </div>
        </div>
        <div class="firma-box">
          <div class="firma-line">
            <div class="name">${data.entidad}</div>
            <div class="role">EL ACREEDOR</div>
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
