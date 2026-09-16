import puppeteer from 'puppeteer';
import { Decimal } from '@prisma/client/runtime/library';

interface CotizacionData {
  tipoPrestamo?: string;
  entidad?: string;
  nombre: string;
  valorVehiculo: Decimal;
  montoFinanciar: Decimal;
  plazo: number;
  tna: Decimal;
  sistema: string;
  condicion: string;
  seguroAutoAnual: Decimal;
  seguroVidaMensual: Decimal;
  gastoAdminMensual: Decimal;
  ivaIntereses: boolean;
  cuotaPura: Decimal;
  cuotaTotal: Decimal;
  totalIntereses: Decimal;
  costoTotal: Decimal;
  createdAt: Date;
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

function num(v: Decimal | number): number {
  return typeof v === 'number' ? v : Number(v);
}

function formatMoney(value: number): string {
  return '$' + value.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(value: number): string {
  return value.toFixed(2) + '%';
}

function formatDate(date: Date): string {
  const d = new Date(date);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function generarTabla(data: CotizacionData): FilaCuota[] {
  const capital = num(data.montoFinanciar);
  const tasaMensual = num(data.tna) / 100 / 12;
  const n = data.plazo;
  const valorAuto = num(data.valorVehiculo);
  const segAutoAnual = num(data.seguroAutoAnual) / 100;
  const segVidaMensual = num(data.seguroVidaMensual) / 100;
  const gastoAdmin = num(data.gastoAdminMensual);
  const conIva = data.ivaIntereses;
  const esFrances = data.sistema === 'frances';

  const seguroAutoMes = valorAuto * segAutoAnual / 12;

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

    const seguroVida = saldo * segVidaMensual;
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
      saldoFinal: saldo - amortizacion,
    });

    saldo -= amortizacion;
  }

  return filas;
}

export async function generarPdfCotizacion(data: CotizacionData): Promise<Buffer> {
  const filas = generarTabla(data);
  const esPrendario = (data.tipoPrestamo || 'prendario') === 'prendario';
  const entidad = data.entidad || 'Reka Cobranzas';
  const tituloPrestamo = esPrendario ? 'Simulación de Crédito Prendario' : 'Simulación de Préstamo Personal';

  const totalIntereses = filas.reduce((s, f) => s + f.interes, 0);
  const costoTotal = filas.reduce((s, f) => s + f.cuotaTotal, 0);
  const tea = (Math.pow(1 + num(data.tna) / 100 / 12, 12) - 1) * 100;

  const filasHtml = filas
    .map(
      (f) => `
      <tr>
        <td class="num">${f.nro}</td>
        <td class="money">${formatMoney(f.saldoInicial)}</td>
        <td class="money">${formatMoney(f.amortizacion)}</td>
        <td class="money">${formatMoney(f.interes)}</td>
        <td class="money">${formatMoney(f.cuotaPura)}</td>
        ${esPrendario ? `<td class="money">${formatMoney(f.seguroAuto)}</td>` : ''}
        <td class="money">${formatMoney(f.seguroVida)}</td>
        <td class="money">${formatMoney(f.iva)}</td>
        <td class="money total">${formatMoney(f.cuotaTotal)}</td>
        <td class="money">${formatMoney(f.saldoFinal)}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 11px;
          color: #1e293b;
          line-height: 1.4;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 2px solid #4f46e5;
        }
        .brand-title {
          font-size: 26px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .header h1 {
          font-size: 20px;
          color: #4f46e5;
          font-weight: 700;
        }
        .header .subtitle {
          color: #64748b;
          font-size: 11px;
          margin-top: 2px;
        }
        .header .date {
          color: #64748b;
          font-size: 11px;
          text-align: right;
        }
        .params {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .param {
          background: #f1f5f9;
          border-radius: 6px;
          padding: 6px 12px;
          font-size: 10px;
        }
        .param .label { color: #64748b; }
        .param .value { font-weight: 700; color: #1e293b; }
        .summary {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
        }
        .summary-card {
          flex: 1;
          background: #4f46e5;
          color: white;
          border-radius: 8px;
          padding: 10px 14px;
          text-align: center;
        }
        .summary-card .s-label { font-size: 9px; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.5px; }
        .summary-card .s-value { font-size: 16px; font-weight: 700; margin-top: 2px; }
        .summary-card.alt { background: #0f172a; }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        thead th {
          background: #4f46e5;
          color: white;
          padding: 6px 5px;
          text-align: center;
          font-weight: 600;
          font-size: 8.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        tbody td {
          padding: 4px 5px;
          border-bottom: 1px solid #e2e8f0;
          text-align: right;
        }
        tbody td.num { text-align: center; font-weight: 600; color: #4f46e5; }
        tbody td.total { font-weight: 700; color: #1e293b; }
        tbody tr:nth-child(even) { background: #f8fafc; }
        tbody tr:hover { background: #eef2ff; }
        .footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand-title">${entidad}</div>
          <h1>${tituloPrestamo}</h1>
          <div class="subtitle">${data.nombre || 'Sin nombre'}${esPrendario ? ` — Vehículo ${data.condicion.toUpperCase()}` : ''}</div>
        </div>
        <div class="date">
          Generado: ${formatDate(data.createdAt)}<br>
          SysFac
        </div>
      </div>

      <div class="params">
        ${esPrendario ? `<div class="param"><span class="label">Valor vehículo:</span> <span class="value">${formatMoney(num(data.valorVehiculo))}</span></div>` : ''}
        <div class="param"><span class="label">${esPrendario ? 'Financiado' : 'Monto prestado'}:</span> <span class="value">${formatMoney(num(data.montoFinanciar))}</span></div>
        <div class="param"><span class="label">Plazo:</span> <span class="value">${data.plazo} meses</span></div>
        <div class="param"><span class="label">TNA:</span> <span class="value">${formatPct(num(data.tna))}</span></div>
        <div class="param"><span class="label">TEA:</span> <span class="value">${formatPct(tea)}</span></div>
        <div class="param"><span class="label">Sistema:</span> <span class="value">${data.sistema === 'frances' ? 'Francés' : 'Alemán'}</span></div>
        ${esPrendario ? `<div class="param"><span class="label">Seguro auto:</span> <span class="value">${formatPct(num(data.seguroAutoAnual))}</span></div>` : ''}
        <div class="param"><span class="label">IVA int.:</span> <span class="value">${data.ivaIntereses ? 'Sí (21%)' : 'No'}</span></div>
      </div>

      <div class="summary">
        <div class="summary-card">
          <div class="s-label">Cuota pura</div>
          <div class="s-value">${formatMoney(num(data.cuotaPura))}</div>
        </div>
        <div class="summary-card">
          <div class="s-label">Cuota total (1°)</div>
          <div class="s-value">${formatMoney(num(data.cuotaTotal))}</div>
        </div>
        <div class="summary-card alt">
          <div class="s-label">Total intereses</div>
          <div class="s-value">${formatMoney(totalIntereses)}</div>
        </div>
        <div class="summary-card alt">
          <div class="s-label">Costo total</div>
          <div class="s-value">${formatMoney(costoTotal)}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Cuota</th>
            <th>Saldo Inicial</th>
            <th>Amortización</th>
            <th>Interés</th>
            <th>Cuota Pura</th>
            ${esPrendario ? '<th>Seg. Auto</th>' : ''}
            <th>Seg. Vida</th>
            <th>IVA Int.</th>
            <th>Cuota Total</th>
            <th>Saldo Final</th>
          </tr>
        </thead>
        <tbody>
          ${filasHtml}
        </tbody>
      </table>

      <div class="footer">
        <span>Sistema ${data.sistema === 'frances' ? 'Francés (cuota fija)' : 'Alemán (cuota decreciente)'} — TNA ${formatPct(num(data.tna))} / TEA ${formatPct(tea)}</span>
        <span>Simulación orientativa — no constituye oferta de crédito</span>
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
    landscape: true,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  await browser.close();

  return Buffer.from(pdfBuffer);
}
