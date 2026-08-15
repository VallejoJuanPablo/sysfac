import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <!-- Mobile overlay -->
    @if (sidebarOpen()) {
      <div
        class="fixed inset-0 bg-black/50 z-30 lg:hidden"
        (click)="sidebarOpen.set(false)"
      ></div>
    }

    <!-- Sidebar -->
    <app-sidebar
      [open]="sidebarOpen()"
      [collapsed]="sidebarCollapsed()"
      (toggle)="sidebarCollapsed.set(!sidebarCollapsed())"
      (close)="sidebarOpen.set(false)"
    />

    <!-- Main content -->
    <div
      class="transition-all duration-300"
      [class.lg:ml-64]="!sidebarCollapsed()"
      [class.lg:ml-20]="sidebarCollapsed()"
    >
      <app-topbar (menuClick)="sidebarOpen.set(!sidebarOpen())" />
      <main class="p-6 bg-slate-50 min-h-[calc(100vh-64px)]">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ShellComponent {
  sidebarOpen = signal(false);
  sidebarCollapsed = signal(false);
}
