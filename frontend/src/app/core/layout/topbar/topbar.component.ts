import { Component, inject, output } from '@angular/core';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  template: `
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <!-- Left: hamburger -->
      <button
        class="lg:hidden text-slate-600 hover:text-slate-900"
        (click)="menuClick.emit()"
      >
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="hidden lg:block">
        <h1 class="text-lg font-semibold text-slate-700">SysFac</h1>
      </div>

      <!-- Right: user info + logout -->
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
            {{ auth.usuario()?.nombre?.charAt(0) || 'A' }}
          </div>
          <span class="hidden sm:block text-sm text-slate-600">{{ auth.usuario()?.nombre }}</span>
        </div>
        <button
          (click)="auth.logout()"
          class="text-slate-400 hover:text-red-500 transition-colors"
          title="Cerrar sesión"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  `,
})
export class TopbarComponent {
  auth = inject(AuthService);
  menuClick = output<void>();
}
