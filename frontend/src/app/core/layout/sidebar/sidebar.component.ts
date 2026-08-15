import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside
      class="fixed top-0 left-0 h-full bg-slate-900 text-white z-40 transition-all duration-300 flex flex-col"
      [class.w-64]="!collapsed()"
      [class.w-20]="collapsed()"
      [class.-translate-x-full]="!open()"
      [class.translate-x-0]="open()"
      [class.lg:translate-x-0]="true"
    >
      <!-- Logo -->
      <div class="flex items-center justify-between h-16 px-4 border-b border-slate-700">
        @if (!collapsed()) {
          <span class="text-xl font-bold text-indigo-400">SysFac</span>
        } @else {
          <span class="text-xl font-bold text-indigo-400 mx-auto">SF</span>
        }
        <!-- Collapse button (desktop) -->
        <button
          class="hidden lg:block text-slate-400 hover:text-white"
          (click)="toggle.emit()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            @if (!collapsed()) {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            } @else {
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            }
          </svg>
        </button>
        <!-- Close button (mobile) -->
        <button
          class="lg:hidden text-slate-400 hover:text-white"
          (click)="close.emit()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 py-4 space-y-1 px-3">
        @for (item of menuItems; track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive="bg-indigo-600 text-white"
            [routerLinkActiveOptions]="{ exact: item.exact }"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            (click)="close.emit()"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="item.icon" />
            </svg>
            @if (!collapsed()) {
              <span>{{ item.label }}</span>
            }
          </a>
        }
      </nav>
    </aside>
  `,
})
export class SidebarComponent {
  open = input(false);
  collapsed = input(false);
  toggle = output<void>();
  close = output<void>();

  menuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1',
      exact: true,
    },
    {
      path: '/presupuestos',
      label: 'Presupuestos',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      exact: false,
    },
  ];
}
