import { Component, inject, OnInit, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { CurrencyPipe } from './../../shared/pipes/currency.pipe';

interface DashboardStats {
  totalPresupuestos: number;
  presupuestosMes: number;
  montoTotal: number;
  totalServicios: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CurrencyPipe],
  template: `
    <div>
      <h2 class="text-2xl font-bold text-slate-800 mb-6">Dashboard</h2>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        @for (card of kpiCards(); track card.label) {
          <div class="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition">
            <div class="flex items-center justify-between mb-3">
              <span class="text-sm text-slate-500">{{ card.label }}</span>
              <div class="w-10 h-10 rounded-lg flex items-center justify-center" [class]="card.bgColor">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" [class]="card.iconColor" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="card.icon" />
                </svg>
              </div>
            </div>
            <div class="text-2xl font-bold text-slate-800">
              @if (card.isCurrency) {
                {{ card.value | arsCurrency }}
              } @else {
                {{ card.value }}
              }
            </div>
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <h3 class="text-lg font-semibold text-slate-700 mb-4">Acciones rápidas</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          routerLink="/presupuestos/crear"
          class="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition flex items-center gap-4 group"
        >
          <div class="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-slate-800">Crear Presupuesto</div>
            <div class="text-sm text-slate-500">Generar un nuevo presupuesto</div>
          </div>
        </a>

        <a
          routerLink="/presupuestos"
          class="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition flex items-center gap-4 group"
        >
          <div class="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <div class="font-semibold text-slate-800">Ver Presupuestos</div>
            <div class="text-sm text-slate-500">Listado completo</div>
          </div>
        </a>
      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  stats = signal<DashboardStats>({ totalPresupuestos: 0, presupuestosMes: 0, montoTotal: 0, totalServicios: 0 });

  kpiCards = signal<any[]>([]);

  ngOnInit() {
    this.http.get<DashboardStats>('/api/dashboard/stats').subscribe((data) => {
      this.stats.set(data);
      this.kpiCards.set([
        {
          label: 'Total Presupuestos',
          value: data.totalPresupuestos,
          icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
          bgColor: 'bg-indigo-50',
          iconColor: 'text-indigo-600',
          isCurrency: false,
        },
        {
          label: 'Este Mes',
          value: data.presupuestosMes,
          icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
          bgColor: 'bg-emerald-50',
          iconColor: 'text-emerald-600',
          isCurrency: false,
        },
        {
          label: 'Monto Total',
          value: data.montoTotal,
          icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
          bgColor: 'bg-amber-50',
          iconColor: 'text-amber-600',
          isCurrency: true,
        },
        {
          label: 'Servicios',
          value: data.totalServicios,
          icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
          bgColor: 'bg-purple-50',
          iconColor: 'text-purple-600',
          isCurrency: false,
        },
      ]);
    });
  }
}
