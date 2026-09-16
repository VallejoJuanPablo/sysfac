import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CurrencyPipe } from '../../shared/pipes/currency.pipe';
import Swal from 'sweetalert2';

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

interface Cotizacion {
  id: number;
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
  createdAt: string;
}

@Component({
  selector: 'app-simulador',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <div>
      <h2 class="text-xl sm:text-2xl font-bold text-slate-800 mb-6">Simulador de {{ tipoPrestamo === 'prendario' ? 'Crédito Prendario' : 'Préstamo Personal' }}</h2>

      <!-- SELECTORES PRINCIPALES -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">Tipo de préstamo</label>
          <select [(ngModel)]="tipoPrestamo" (ngModelChange)="onTipoChange()"
            class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
            <option value="prendario">Préstamo Prendario</option>
            <option value="personal">Préstamo Personal</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1">A nombre de</label>
          <select [(ngModel)]="entidad"
            class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
            <option value="Reka Cobranzas">Reka Cobranzas</option>
            <option value="MC Inversiones y Servicios">MC Inversiones y Servicios</option>
          </select>
        </div>
      </div>

      <!-- FORMULARIO -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-6">
        <h3 class="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          Datos del crédito
        </h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <!-- Nombre -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Nombre / Referencia</label>
            <input type="text" [(ngModel)]="nombre"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              [placeholder]="tipoPrestamo === 'prendario' ? 'Ej: Toyota Corolla 2024' : 'Ej: Juan Pérez'" />
          </div>

          @if (tipoPrestamo === 'prendario') {
            <!-- Valor vehículo -->
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">Valor del vehículo *</label>
              <input type="text" [value]="formatNum(valorVehiculo)" (input)="valorVehiculo = parseNum($event)" inputmode="numeric"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="25.000.000" />
            </div>
          }

          <!-- Monto a financiar -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">{{ tipoPrestamo === 'prendario' ? 'Monto a financiar' : 'Monto a prestar' }} *</label>
            <input type="text" [value]="formatNum(montoFinanciar)" (input)="montoFinanciar = parseNum($event)" inputmode="numeric"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="17.500.000" />
            @if (tipoPrestamo === 'prendario' && valorVehiculo > 0 && montoFinanciar > 0) {
              <span class="text-xs text-slate-400 mt-0.5 inline-block">{{ ((montoFinanciar / valorVehiculo) * 100).toFixed(1) }}% del valor</span>
            }
          </div>

          <!-- Plazo -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Plazo (meses) *</label>
            <select [(ngModel)]="plazo"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
              <option [value]="3">3 meses</option>
              <option [value]="6">6 meses</option>
              <option [value]="9">9 meses</option>
              <option [value]="12">12 meses</option>
              <option [value]="18">18 meses</option>
              <option [value]="24">24 meses</option>
              <option [value]="36">36 meses</option>
              <option [value]="48">48 meses</option>
              <option [value]="60">60 meses</option>
            </select>
          </div>

          <!-- TNA -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">TNA (%) *</label>
            <input type="number" [(ngModel)]="tna" min="0" max="200" step="0.5"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              placeholder="65" />
          </div>

          <!-- Sistema -->
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1">Sistema</label>
            <select [(ngModel)]="sistema"
              class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
              <option value="frances">Francés (cuota fija)</option>
              <option value="aleman">Alemán (cuota decreciente)</option>
            </select>
          </div>

          @if (tipoPrestamo === 'prendario') {
            <!-- Condición -->
            <div>
              <label class="block text-sm font-medium text-slate-600 mb-1">Condición</label>
              <select [(ngModel)]="condicion"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-white">
                <option value="0km">0 km</option>
                <option value="usado">Usado</option>
              </select>
            </div>
          }
        </div>

        <!-- Gastos adicionales (collapsible) -->
        <button (click)="showGastos = !showGastos"
          class="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 transition-transform" [class.rotate-180]="showGastos" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
          Gastos adicionales (seguro, IVA, admin)
        </button>

        @if (showGastos) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg mb-4">
            @if (tipoPrestamo === 'prendario') {
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Seguro auto anual (%)</label>
                <input type="number" [(ngModel)]="seguroAutoAnual" min="0" max="20" step="0.5"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  placeholder="5" />
              </div>
            }
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Seguro vida mensual (%)</label>
              <input type="number" [(ngModel)]="seguroVidaMensual" min="0" max="1" step="0.01"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="0.05" />
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-500 mb-1">Gasto admin mensual ($)</label>
              <input type="number" [(ngModel)]="gastoAdminMensual" min="0"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                placeholder="3000" />
            </div>
            <div class="flex items-end">
              <label class="flex items-center gap-2 cursor-pointer py-2">
                <input type="checkbox" [(ngModel)]="ivaIntereses"
                  class="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                <span class="text-sm text-slate-600">IVA sobre intereses (21%)</span>
              </label>
            </div>
          </div>
        }

        <!-- Botón calcular -->
        <div class="flex flex-col sm:flex-row gap-3">
          <button (click)="calcular()"
            [disabled]="(tipoPrestamo === 'prendario' && !valorVehiculo) || !montoFinanciar || !tna"
            class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Calcular
          </button>
          @if (tablaCalculada().length > 0) {
            <button (click)="limpiar()"
              class="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition">
              Limpiar
            </button>
            <button (click)="descargarPdfDirecto()"
              class="px-6 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Descargar PDF
            </button>
          }
        </div>
      </div>

      <!-- RESULTADOS -->
      @if (tablaCalculada().length > 0) {
        <!-- Resumen -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div class="bg-indigo-600 text-white rounded-xl p-4 text-center">
            <div class="text-xs opacity-80 uppercase tracking-wide">Cuota pura</div>
            <div class="text-lg sm:text-xl font-bold mt-1">{{ resultCuotaPura() | arsCurrency }}</div>
          </div>
          <div class="bg-indigo-600 text-white rounded-xl p-4 text-center">
            <div class="text-xs opacity-80 uppercase tracking-wide">Cuota total (1°)</div>
            <div class="text-lg sm:text-xl font-bold mt-1">{{ resultCuotaTotal() | arsCurrency }}</div>
          </div>
          <div class="bg-slate-800 text-white rounded-xl p-4 text-center">
            <div class="text-xs opacity-80 uppercase tracking-wide">Total intereses</div>
            <div class="text-lg sm:text-xl font-bold mt-1">{{ resultTotalIntereses() | arsCurrency }}</div>
          </div>
          <div class="bg-slate-800 text-white rounded-xl p-4 text-center">
            <div class="text-xs opacity-80 uppercase tracking-wide">Costo total</div>
            <div class="text-lg sm:text-xl font-bold mt-1">{{ resultCostoTotal() | arsCurrency }}</div>
          </div>
        </div>

        <!-- TEA info -->
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-sm text-amber-800 flex items-start gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <strong>TEA:</strong> {{ resultTea().toFixed(2) }}% |
            <strong>Tasa mensual:</strong> {{ (tna / 12).toFixed(4) }}% |
            <strong>Sistema:</strong> {{ sistema === 'frances' ? 'Francés (cuota fija)' : 'Alemán (cuota decreciente)' }}
          </span>
        </div>

        <!-- Acciones -->
        <div class="flex flex-col sm:flex-row gap-3 mb-6">
          <button (click)="guardarCotizacion()"
            [disabled]="saving()"
            class="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            @if (saving()) {
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Guardando...
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Guardar cotización
            }
          </button>
        </div>

        <!-- Tabla de amortización -->
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mb-6">
          <div class="px-4 sm:px-6 py-3 border-b border-slate-200 flex items-center justify-between">
            <h3 class="text-sm font-semibold text-slate-700">Tabla de amortización — {{ tablaCalculada().length }} cuotas</h3>
            <button (click)="showTabla = !showTabla" class="text-sm text-indigo-600 hover:text-indigo-800 transition">
              {{ showTabla ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>

          @if (showTabla) {
            <!-- Mobile cards -->
            <div class="md:hidden p-3 space-y-2 max-h-[60vh] overflow-y-auto">
              @for (f of tablaCalculada(); track f.nro) {
                <div class="bg-slate-50 rounded-lg p-3 text-xs">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-bold text-indigo-600">Cuota {{ f.nro }}</span>
                    <span class="font-bold text-slate-800">{{ f.cuotaTotal | arsCurrency }}</span>
                  </div>
                  <div class="grid grid-cols-2 gap-1 text-slate-600">
                    <span>Capital: {{ f.amortizacion | arsCurrency }}</span>
                    <span>Interés: {{ f.interes | arsCurrency }}</span>
                    <span>Saldo: {{ f.saldoFinal | arsCurrency }}</span>
                    @if (tipoPrestamo === 'prendario') {
                      <span>Seg. auto: {{ f.seguroAuto | arsCurrency }}</span>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Desktop table -->
            <div class="hidden md:block overflow-x-auto max-h-[60vh] overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="sticky top-0">
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="px-3 py-2 text-center text-xs font-semibold text-slate-500 uppercase">N°</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Saldo Inicial</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Amortización</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Interés</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Cuota Pura</th>
                    @if (tipoPrestamo === 'prendario') {
                      <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Seg. Auto</th>
                    }
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Seg. Vida</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">IVA</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase bg-indigo-50">Cuota Total</th>
                    <th class="px-3 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Saldo Final</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (f of tablaCalculada(); track f.nro) {
                    <tr class="hover:bg-slate-50 transition">
                      <td class="px-3 py-2 text-center font-semibold text-indigo-600">{{ f.nro }}</td>
                      <td class="px-3 py-2 text-right text-slate-600">{{ f.saldoInicial | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right text-slate-600">{{ f.amortizacion | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right text-slate-600">{{ f.interes | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right text-slate-700 font-medium">{{ f.cuotaPura | arsCurrency }}</td>
                      @if (tipoPrestamo === 'prendario') {
                        <td class="px-3 py-2 text-right text-slate-500">{{ f.seguroAuto | arsCurrency }}</td>
                      }
                      <td class="px-3 py-2 text-right text-slate-500">{{ f.seguroVida | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right text-slate-500">{{ f.iva | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right font-bold text-slate-800 bg-indigo-50/50">{{ f.cuotaTotal | arsCurrency }}</td>
                      <td class="px-3 py-2 text-right text-slate-600">{{ f.saldoFinal | arsCurrency }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- ÚLTIMAS COTIZACIONES -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <button (click)="showCotizaciones = !showCotizaciones"
          class="w-full px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
          <h3 class="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Últimas cotizaciones ({{ cotizaciones().length }})
          </h3>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-slate-400 transition-transform" [class.rotate-180]="showCotizaciones" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        @if (showCotizaciones) {
          @if (cotizaciones().length === 0) {
            <div class="px-6 pb-6 text-center text-slate-400 text-sm">
              No hay cotizaciones guardadas aún
            </div>
          } @else {
            <!-- Mobile cards -->
            <div class="md:hidden p-3 space-y-2">
              @for (c of cotizaciones(); track c.id) {
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-slate-800 truncate">{{ c.nombre || 'Sin nombre' }}</span>
                    <span class="text-xs text-slate-400">{{ formatFecha(c.createdAt) }}</span>
                  </div>
                  <div class="text-xs text-slate-500 mb-2">
                    {{ c.montoFinanciar | arsCurrency }} — {{ c.plazo }} cuotas — TNA {{ c.tna }}%
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-indigo-600">{{ c.cuotaTotal | arsCurrency }}/mes</span>
                    <div class="flex gap-2">
                      <button (click)="verCotizacion(c)" class="text-indigo-600 hover:text-indigo-800 transition" title="Ver detalle">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button (click)="descargarPdf(c)" class="text-emerald-600 hover:text-emerald-800 transition" title="Descargar PDF">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button (click)="eliminarCotizacion(c)" class="text-red-400 hover:text-red-600 transition" title="Eliminar">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              }
            </div>

            <!-- Desktop table -->
            <div class="hidden md:block overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-200">
                    <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                    <th class="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Financiado</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Plazo</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">TNA</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Sistema</th>
                    <th class="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Cuota Total</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (c of cotizaciones(); track c.id) {
                    <tr class="hover:bg-slate-50 transition">
                      <td class="px-4 py-3 text-slate-700 font-medium">{{ c.nombre || 'Sin nombre' }}</td>
                      <td class="px-4 py-3 text-right text-slate-600">{{ c.montoFinanciar | arsCurrency }}</td>
                      <td class="px-4 py-3 text-center text-slate-600">{{ c.plazo }}m</td>
                      <td class="px-4 py-3 text-center text-slate-600">{{ c.tna }}%</td>
                      <td class="px-4 py-3 text-center">
                        <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                          [class]="c.sistema === 'frances' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'">
                          {{ c.sistema === 'frances' ? 'Francés' : 'Alemán' }}
                        </span>
                      </td>
                      <td class="px-4 py-3 text-right font-bold text-slate-800">{{ c.cuotaTotal | arsCurrency }}</td>
                      <td class="px-4 py-3 text-center text-slate-500 text-xs">{{ formatFecha(c.createdAt) }}</td>
                      <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-2">
                          <button (click)="verCotizacion(c)" class="text-indigo-600 hover:text-indigo-800 transition" title="Ver detalle">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button (click)="descargarPdf(c)" class="text-emerald-600 hover:text-emerald-800 transition" title="Descargar PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button (click)="eliminarCotizacion(c)" class="text-red-400 hover:text-red-600 transition" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      </div>

      <!-- MODAL DETALLE -->
      @if (modalCotizacion()) {
        <div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" (click)="modalCotizacion.set(null)">
          <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
            <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h3 class="text-lg font-bold text-slate-800">{{ modalCotizacion()!.nombre || 'Cotización' }}</h3>
              <button (click)="modalCotizacion.set(null)" class="text-slate-400 hover:text-slate-600 transition">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div class="p-6">
              @let c = modalCotizacion()!;
              <!-- Parámetros -->
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">Valor vehículo</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.valorVehiculo | arsCurrency }}</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">Financiado</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.montoFinanciar | arsCurrency }}</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">Plazo</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.plazo }} meses</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">TNA</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.tna }}%</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">Sistema</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.sistema === 'frances' ? 'Francés' : 'Alemán' }}</div>
                </div>
                <div class="bg-slate-50 rounded-lg p-3">
                  <div class="text-xs text-slate-500">Condición</div>
                  <div class="text-sm font-bold text-slate-800">{{ c.condicion === '0km' ? '0 km' : 'Usado' }}</div>
                </div>
              </div>

              <!-- Resultados -->
              <div class="grid grid-cols-2 gap-3 mb-6">
                <div class="bg-indigo-50 rounded-lg p-3 text-center">
                  <div class="text-xs text-indigo-600">Cuota pura</div>
                  <div class="text-lg font-bold text-indigo-700">{{ c.cuotaPura | arsCurrency }}</div>
                </div>
                <div class="bg-indigo-50 rounded-lg p-3 text-center">
                  <div class="text-xs text-indigo-600">Cuota total</div>
                  <div class="text-lg font-bold text-indigo-700">{{ c.cuotaTotal | arsCurrency }}</div>
                </div>
                <div class="bg-slate-100 rounded-lg p-3 text-center">
                  <div class="text-xs text-slate-500">Total intereses</div>
                  <div class="text-lg font-bold text-slate-700">{{ c.totalIntereses | arsCurrency }}</div>
                </div>
                <div class="bg-slate-100 rounded-lg p-3 text-center">
                  <div class="text-xs text-slate-500">Costo total</div>
                  <div class="text-lg font-bold text-slate-700">{{ c.costoTotal | arsCurrency }}</div>
                </div>
              </div>

              <!-- Descargar PDF -->
              <button (click)="descargarPdf(c)"
                class="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Descargar PDF con tabla completa
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SimuladorComponent implements OnInit {
  private http = inject(HttpClient);

  // Form inputs
  tipoPrestamo = 'prendario';
  entidad = 'Reka Cobranzas';
  nombre = '';
  valorVehiculo = 0;
  montoFinanciar = 0;
  plazo = 48;
  tna = 65;
  sistema = 'frances';
  condicion = '0km';
  seguroAutoAnual = 0;
  seguroVidaMensual = 0;
  gastoAdminMensual = 0;
  ivaIntereses = false;

  showGastos = false;
  showTabla = true;
  showCotizaciones = false;

  // Results
  tablaCalculada = signal<FilaCuota[]>([]);
  resultCuotaPura = signal(0);
  resultCuotaTotal = signal(0);
  resultTotalIntereses = signal(0);
  resultCostoTotal = signal(0);
  resultTea = signal(0);

  // Cotizaciones guardadas
  cotizaciones = signal<Cotizacion[]>([]);
  modalCotizacion = signal<Cotizacion | null>(null);
  saving = signal(false);

  ngOnInit() {
    this.loadCotizaciones();
  }

  loadCotizaciones() {
    this.http.get<Cotizacion[]>('/api/simulador').subscribe((data) => {
      this.cotizaciones.set(data);
    });
  }

  onTipoChange() {
    this.limpiar();
    if (this.tipoPrestamo === 'personal') {
      this.valorVehiculo = 0;
      this.condicion = '0km';
      this.seguroAutoAnual = 0;
    }
  }

  calcular() {
    if (this.tipoPrestamo === 'prendario' && !this.valorVehiculo) return;
    if (!this.montoFinanciar || !this.tna) return;

    const capital = this.montoFinanciar;
    const tasaMensual = this.tna / 100 / 12;
    const n = Number(this.plazo);
    const segAutoMes = this.tipoPrestamo === 'prendario' ? this.valorVehiculo * (this.seguroAutoAnual / 100) / 12 : 0;
    const segVidaMes = this.seguroVidaMensual / 100;
    const gastoAdmin = this.gastoAdminMensual;
    const conIva = this.ivaIntereses;
    const esFrances = this.sistema === 'frances';

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
      const cuotaTotal = cuotaPura + segAutoMes + seguroVida + gastoAdmin + iva;

      filas.push({
        nro: k,
        saldoInicial: saldo,
        amortizacion,
        interes,
        cuotaPura,
        seguroAuto: segAutoMes,
        seguroVida,
        gastoAdmin,
        iva,
        cuotaTotal,
        saldoFinal: Math.max(0, saldo - amortizacion),
      });

      saldo -= amortizacion;
    }

    this.tablaCalculada.set(filas);
    this.resultCuotaPura.set(filas[0]?.cuotaPura || 0);
    this.resultCuotaTotal.set(filas[0]?.cuotaTotal || 0);
    this.resultTotalIntereses.set(filas.reduce((s, f) => s + f.interes, 0));
    this.resultCostoTotal.set(filas.reduce((s, f) => s + f.cuotaTotal, 0));
    this.resultTea.set((Math.pow(1 + tasaMensual, 12) - 1) * 100);
  }

  limpiar() {
    this.tablaCalculada.set([]);
    this.resultCuotaPura.set(0);
    this.resultCuotaTotal.set(0);
    this.resultTotalIntereses.set(0);
    this.resultCostoTotal.set(0);
    this.resultTea.set(0);
  }

  guardarCotizacion() {
    this.saving.set(true);

    this.http
      .post<Cotizacion>('/api/simulador', {
        tipoPrestamo: this.tipoPrestamo,
        entidad: this.entidad,
        nombre: this.nombre,
        valorVehiculo: this.valorVehiculo,
        montoFinanciar: this.montoFinanciar,
        plazo: Number(this.plazo),
        tna: this.tna,
        sistema: this.sistema,
        condicion: this.condicion,
        seguroAutoAnual: this.seguroAutoAnual,
        seguroVidaMensual: this.seguroVidaMensual,
        gastoAdminMensual: this.gastoAdminMensual,
        ivaIntereses: this.ivaIntereses,
        cuotaPura: this.resultCuotaPura(),
        cuotaTotal: this.resultCuotaTotal(),
        totalIntereses: this.resultTotalIntereses(),
        costoTotal: this.resultCostoTotal(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.loadCotizaciones();
          this.showCotizaciones = true;
          Swal.fire({
            icon: 'success',
            title: 'Cotización guardada',
            timer: 1500,
            showConfirmButton: false,
          });
        },
        error: () => {
          this.saving.set(false);
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar la cotización' });
        },
      });
  }

  descargarPdfDirecto() {
    Swal.fire({
      title: 'Generando PDF...',
      text: this.nombre || 'Simulación',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    this.http.post('/api/simulador/pdf', {
      tipoPrestamo: this.tipoPrestamo,
      entidad: this.entidad,
      nombre: this.nombre,
      valorVehiculo: this.valorVehiculo,
      montoFinanciar: this.montoFinanciar,
      plazo: Number(this.plazo),
      tna: this.tna,
      sistema: this.sistema,
      condicion: this.condicion,
      seguroAutoAnual: this.seguroAutoAnual,
      seguroVidaMensual: this.seguroVidaMensual,
      gastoAdminMensual: this.gastoAdminMensual,
      ivaIntereses: this.ivaIntereses,
      cuotaPura: this.resultCuotaPura(),
      cuotaTotal: this.resultCuotaTotal(),
      totalIntereses: this.resultTotalIntereses(),
      costoTotal: this.resultCostoTotal(),
    }, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `simulacion_${hoy}_${this.nombre?.replace(/\s+/g, '_') || 'cotizacion'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        Swal.fire({ icon: 'success', title: 'PDF generado', timer: 1500, showConfirmButton: false });
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF' });
      },
    });
  }

  verCotizacion(c: Cotizacion) {
    this.modalCotizacion.set(c);
  }

  descargarPdf(c: Cotizacion) {
    Swal.fire({
      title: 'Generando PDF...',
      text: c.nombre || 'Simulación',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    this.http.get(`/api/simulador/${c.id}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fecha = new Date(c.createdAt).toISOString().slice(0, 10).replace(/-/g, '');
        a.download = `simulacion_${fecha}_${c.nombre?.replace(/\s+/g, '_') || c.id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        Swal.fire({ icon: 'success', title: 'PDF generado', timer: 1500, showConfirmButton: false });
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo generar el PDF' });
      },
    });
  }

  eliminarCotizacion(c: Cotizacion) {
    Swal.fire({
      title: '¿Eliminar cotización?',
      text: c.nombre || 'Sin nombre',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        this.http.delete(`/api/simulador/${c.id}`).subscribe({
          next: () => {
            this.loadCotizaciones();
            Swal.fire({ icon: 'success', title: 'Eliminada', timer: 1200, showConfirmButton: false });
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar' });
          },
        });
      }
    });
  }

  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  formatNum(value: number): string {
    if (!value) return '';
    return value.toLocaleString('es-AR');
  }

  parseNum(event: Event): number {
    const input = event.target as HTMLInputElement;
    const raw = input.value.replace(/\D/g, '');
    const num = parseInt(raw, 10) || 0;
    input.value = num ? num.toLocaleString('es-AR') : '';
    return num;
  }
}
