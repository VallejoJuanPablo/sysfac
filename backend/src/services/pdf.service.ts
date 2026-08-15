import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { Decimal } from '@prisma/client/runtime/library';

interface PdfPresupuesto {
  numero: number;
  cliente: string;
  fecha: Date;
  formaPago: string;
  garantia: string;
  responsable: string;
  total: Decimal;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: Decimal;
    subtotal: Decimal;
  }>;
}

function formatMoney(value: Decimal | number): string {
  const num = typeof value === 'number' ? value : Number(value);
  return '$' + num.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/,/g, '.');
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export async function generarPdf(
  presupuesto: PdfPresupuesto,
  config: Record<string, string>
): Promise<Buffer> {
  const bgImagePath = path.join(__dirname, '..', '..', 'assets', 'modelo-vacio.jpg');
  const bgBase64 = fs.readFileSync(bgImagePath).toString('base64');
  const bgDataUri = `data:image/jpeg;base64,${bgBase64}`;

  const itemsHtml = presupuesto.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border: 1px solid #ddd; text-align: center;">${item.descripcion}</td>
        <td style="padding: 12px 16px; border: 1px solid #ddd; text-align: center;">${item.cantidad}</td>
        <td style="padding: 12px 16px; border: 1px solid #ddd; text-align: center;">${formatMoney(item.precioUnitario)}</td>
        <td style="padding: 12px 16px; border: 1px solid #ddd; text-align: center;">${formatMoney(item.subtotal)}</td>
      </tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        @page { size: A4; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          width: 210mm;
          min-height: 297mm;
          position: relative;
          color: #333;
        }
        .bg {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }
        .bg img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .content {
          position: relative;
          z-index: 1;
          padding: 40px;
          padding-top: 30mm;
        }
        .header-info {
          text-align: right;
          margin-top: 80px;
          font-size: 13px;
          line-height: 1.6;
          font-weight: 600;
        }
        .cliente {
          margin-top: 30px;
          font-size: 14px;
          font-weight: 700;
        }
        .fecha {
          margin-top: 12px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: underline;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 13px;
        }
        thead th {
          background-color: #4a6fa5;
          color: white;
          padding: 10px 16px;
          text-align: center;
          font-weight: 600;
        }
        .footer {
          margin-top: 80px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .footer-left {
          font-size: 13px;
          max-width: 55%;
        }
        .footer-left .forma-pago {
          margin-bottom: 16px;
          color: #555;
        }
        .footer-left .garantia {
          font-weight: 700;
          font-style: italic;
          font-size: 14px;
          line-height: 1.5;
        }
        .footer-right {
          text-align: right;
          font-size: 14px;
        }
        .footer-right .subtotal-line {
          margin-bottom: 8px;
          color: #555;
        }
        .footer-right .total-line {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 20px;
        }
        .footer-right .firma {
          border-top: 1px solid #333;
          padding-top: 8px;
          font-weight: 700;
          min-width: 200px;
          display: inline-block;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="bg">
        <img src="${bgDataUri}" />
      </div>
      <div class="content">
        <div class="header-info">
          Dirección: ${config.empresa_direccion || 'Av. Armenia 2932'},<br>
          ${config.empresa_ciudad || 'Corrientes Capital'}<br>
          Mail: ${config.empresa_email || 'dr.frio@gmail.com'}<br>
          Teléfono: ${config.empresa_telefono || '3794-771259'}
        </div>

        <div class="cliente">CLIENTE: ${presupuesto.cliente.toUpperCase()}</div>
        <div class="fecha">Fecha: ${formatDate(presupuesto.fecha)}</div>

        <table>
          <thead>
            <tr>
              <th>Servicio (mano de obra)</th>
              <th>Cantidad</th>
              <th>Precio unitario</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div class="footer-left">
            <div class="forma-pago">Forma de pago: ${presupuesto.formaPago}</div>
            <div class="garantia">${presupuesto.garantia}</div>
          </div>
          <div class="footer-right">
            <div class="subtotal-line">Subtotal &nbsp;&nbsp;&nbsp; ${formatMoney(presupuesto.total)}</div>
            <div class="total-line">Total &nbsp;&nbsp;&nbsp; ${formatMoney(presupuesto.total)}</div>
            <div class="firma">${presupuesto.responsable}</div>
          </div>
        </div>
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
