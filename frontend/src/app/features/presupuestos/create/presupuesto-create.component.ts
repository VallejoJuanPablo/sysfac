import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CurrencyPipe } from '../../../shared/pipes/currency.pipe';

interface Servicio {
  id: number;
  nombre: string;
  precioDefault: number;
}

interface ItemPresupuesto {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

@Component({
  selector: 'app-presupuesto-create',
  standalone: true,
  imports: [FormsModule, CurrencyPipe],
  template: `
    <div>
      <div class="flex items-center gap-3 mb-6">
        <button
          (click)="router.navigate(['/presupuestos'])"
          class="text-slate-400 hover:text-slate-600 transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 class="text-2xl font-bold text-slate-800">Nuevo Presupuesto</h2>
      </div>

      @if (error()) {
        <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {{ error() }}
        </div>
      }

      <div class="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <!-- Cliente -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-slate-600 mb-1.5">Cliente *</label>
          <input
            type="text"
            [(ngModel)]="cliente"
            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            placeholder="Nombre del cliente"
          />
        </div>

        <!-- Servicios -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <label class="text-sm font-medium text-slate-600">Servicios *</label>
          </div>

          <!-- Add service row -->
          <div class="flex flex-col sm:flex-row gap-2 mb-4 p-4 bg-slate-50 rounded-lg">
            <div class="flex-1 relative">
              <input
                type="text"
                [(ngModel)]="nuevoServicio"
                (input)="buscarServicios()"
                (focus)="showDropdown.set(true)"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Buscar o escribir servicio..."
              />
              @if (showDropdown() && serviciosFiltrados().length > 0) {
                <div class="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  @for (s of serviciosFiltrados(); track s.id) {
                    <button
                      (mousedown)="seleccionarServicio(s)"
                      class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition flex justify-between"
                    >
                      <span>{{ s.nombre }}</span>
                      <span class="text-slate-400">{{ s.precioDefault | arsCurrency }}</span>
                    </button>
                  }
                </div>
              }
            </div>
            <input
              type="number"
              [(ngModel)]="nuevaCantidad"
              min="1"
              class="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Cant."
            />
            <input
              type="number"
              [(ngModel)]="nuevoPrecio"
              min="0"
              class="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Precio"
            />
            <button
              (click)="agregarItem()"
              [disabled]="!nuevoServicio || !nuevaCantidad || !nuevoPrecio"
              class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Agregar
            </button>
          </div>

          <!-- Items table -->
          @if (items().length > 0) {
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead>
                  <tr class="border-b border-slate-200">
                    <th class="px-4 py-2 text-left text-xs font-semibold text-slate-500 uppercase">Servicio</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase">Cant.</th>
                    <th class="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Precio Unit.</th>
                    <th class="px-4 py-2 text-right text-xs font-semibold text-slate-500 uppercase">Subtotal</th>
                    <th class="px-4 py-2 text-center text-xs font-semibold text-slate-500 uppercase w-12"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  @for (item of items(); track $index) {
                    <tr>
                      <td class="px-4 py-3 text-sm text-slate-700">{{ item.descripcion }}</td>
                      <td class="px-4 py-3 text-sm text-center text-slate-600">{{ item.cantidad }}</td>
                      <td class="px-4 py-3 text-sm text-right text-slate-600">{{ item.precioUnitario | arsCurrency }}</td>
                      <td class="px-4 py-3 text-sm text-right font-semibold text-slate-800">{{ item.subtotal | arsCurrency }}</td>
                      <td class="px-4 py-3 text-center">
                        <button
                          (click)="quitarItem($index)"
                          class="text-red-400 hover:text-red-600 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-slate-300">
                    <td colspan="3" class="px-4 py-3 text-right text-sm font-bold text-slate-700 uppercase">Total</td>
                    <td class="px-4 py-3 text-right text-lg font-bold text-indigo-600">{{ total() | arsCurrency }}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          }
        </div>

        <!-- Forma de pago y garantía -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1.5">Forma de pago</label>
            <input
              type="text"
              [(ngModel)]="formaPago"
              class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-1.5">Responsable</label>
            <input
              type="text"
              [(ngModel)]="responsable"
              class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm"
            />
          </div>
        </div>

        <div class="mb-6">
          <label class="block text-sm font-medium text-slate-600 mb-1.5">Garantía</label>
          <textarea
            [(ngModel)]="garantia"
            rows="2"
            class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-sm resize-none"
          ></textarea>
        </div>

        <!-- Actions -->
        <div class="flex justify-end gap-3">
          <button
            (click)="router.navigate(['/presupuestos'])"
            class="px-6 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-medium hover:bg-slate-50 transition"
          >
            Cancelar
          </button>
          <button
            (click)="guardar()"
            [disabled]="saving()"
            class="px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            @if (saving()) {
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Guardando...
            } @else {
              Guardar Presupuesto
            }
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PresupuestoCreateComponent implements OnInit {
  private http = inject(HttpClient);
  router = inject(Router);

  cliente = '';
  formaPago = 'Transferencia/efectivo';
  garantia = 'Servicio con garantía de 6 meses del trabajo realizado. (desde día de la fecha)';
  responsable = 'Centurión Matias';

  items = signal<ItemPresupuesto[]>([]);
  total = computed(() => this.items().reduce((sum, i) => sum + i.subtotal, 0));

  servicios = signal<Servicio[]>([]);
  serviciosFiltrados = signal<Servicio[]>([]);
  showDropdown = signal(false);

  nuevoServicio = '';
  nuevaCantidad: number = 1;
  nuevoPrecio: number = 0;

  saving = signal(false);
  error = signal('');

  ngOnInit() {
    this.http.get<Servicio[]>('/api/servicios').subscribe((data) => {
      this.servicios.set(data);
    });

    // Close dropdown on click outside
    document.addEventListener('click', () => this.showDropdown.set(false));
  }

  buscarServicios() {
    const q = this.nuevoServicio.toLowerCase();
    this.serviciosFiltrados.set(
      this.servicios().filter((s) => s.nombre.toLowerCase().includes(q))
    );
    this.showDropdown.set(true);
  }

  seleccionarServicio(s: Servicio) {
    this.nuevoServicio = s.nombre;
    this.nuevoPrecio = Number(s.precioDefault);
    this.showDropdown.set(false);
  }

  agregarItem() {
    if (!this.nuevoServicio || this.nuevaCantidad < 1 || this.nuevoPrecio <= 0) return;

    this.items.update((items) => [
      ...items,
      {
        descripcion: this.nuevoServicio,
        cantidad: this.nuevaCantidad,
        precioUnitario: this.nuevoPrecio,
        subtotal: this.nuevaCantidad * this.nuevoPrecio,
      },
    ]);

    this.nuevoServicio = '';
    this.nuevaCantidad = 1;
    this.nuevoPrecio = 0;
  }

  quitarItem(index: number) {
    this.items.update((items) => items.filter((_, i) => i !== index));
  }

  guardar() {
    this.error.set('');

    if (!this.cliente.trim()) {
      this.error.set('El cliente es requerido');
      return;
    }
    if (this.items().length === 0) {
      this.error.set('Debe agregar al menos un servicio');
      return;
    }

    this.saving.set(true);

    this.http
      .post('/api/presupuestos', {
        cliente: this.cliente,
        formaPago: this.formaPago,
        garantia: this.garantia,
        responsable: this.responsable,
        items: this.items(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.router.navigate(['/presupuestos']);
        },
        error: (err) => {
          this.saving.set(false);
          this.error.set(err.error?.error || 'Error al guardar');
        },
      });
  }
}
