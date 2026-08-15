import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';
import Swal from 'sweetalert2';

interface Presupuesto {
  id: number;
  numero: number;
  cliente: string;
  fecha: string;
  estado: string;
  total: number;
}

@Component({
  selector: 'app-presupuestos-list',
  standalone: true,
  imports: [RouterLink, DatePipe, CurrencyPipe],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold text-slate-800">Presupuestos</h2>
        <a
          routerLink="/presupuestos/crear"
          class="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Presupuesto
        </a>
      </div>

      @if (presupuestos().length === 0) {
        <div class="bg-white rounded-xl p-12 shadow-sm border border-slate-100 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="text-slate-500 mb-4">No hay presupuestos todavía</p>
          <a
            routerLink="/presupuestos/crear"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            Crear el primero
          </a>
        </div>
      } @else {
        <div class="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-200">
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">N°</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th class="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th class="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase">PDF</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (p of presupuestos(); track p.id) {
                  <tr class="hover:bg-slate-50 transition">
                    <td class="px-6 py-4 text-sm font-medium text-slate-800">#{{ p.numero }}</td>
                    <td class="px-6 py-4 text-sm text-slate-600">{{ p.cliente }}</td>
                    <td class="px-6 py-4 text-sm text-slate-600">{{ p.fecha | date:'dd/MM/yyyy' }}</td>
                    <td class="px-6 py-4 text-sm font-semibold text-slate-800">{{ p.total | arsCurrency }}</td>
                    <td class="px-6 py-4">
                      <span class="px-2.5 py-1 rounded-full text-xs font-medium"
                        [class]="estadoClass(p.estado)">
                        {{ p.estado }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-center">
                      <button
                        (click)="descargarPdf(p.id, p.numero)"
                        class="text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                        title="Descargar PDF"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class PresupuestosListComponent implements OnInit {
  private http = inject(HttpClient);
  presupuestos = signal<Presupuesto[]>([]);

  ngOnInit() {
    this.loadPresupuestos();
  }

  loadPresupuestos() {
    this.http.get<Presupuesto[]>('/api/presupuestos').subscribe((data) => {
      this.presupuestos.set(data);
    });
  }

  estadoClass(estado: string): string {
    switch (estado) {
      case 'borrador': return 'bg-amber-50 text-amber-700';
      case 'enviado': return 'bg-blue-50 text-blue-700';
      case 'aprobado': return 'bg-emerald-50 text-emerald-700';
      case 'rechazado': return 'bg-red-50 text-red-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  }

  descargarPdf(id: number, numero: number) {
    Swal.fire({
      title: 'Generando PDF...',
      text: `Presupuesto #${numero}`,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    this.http.get(`/api/presupuestos/${id}/pdf`, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `presupuesto-${numero}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);

        Swal.fire({
          icon: 'success',
          title: 'PDF generado',
          text: `Presupuesto #${numero} descargado`,
          timer: 2000,
          showConfirmButton: false,
        });
      },
      error: () => {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo generar el PDF',
        });
      },
    });
  }
}
