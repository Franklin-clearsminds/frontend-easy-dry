import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { ToastComponent } from '../components/toast/toast.component';
import { UiStateService } from '../../core/services/ui-state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  template: `
    <div class="h-screen bg-slate-50">
      <!-- Sidebar flotante (fixed, rail retraído reserva 80px, al expandir flota con overlay) -->
      <app-sidebar></app-sidebar>

      <!-- Main Layout Body: permanentemente fijo a 80px (ml-20). El fondo nunca se mueve. -->
      <div
        class="flex flex-col min-w-0 h-screen overflow-hidden ml-20">
        <!-- EasyDry Corporate Header -->
        <app-header></app-header>

        <!-- Main Content Area (Spacious for PC/Laptops) -->
        <main class="flex-1 overflow-y-auto">
          <div class="p-6 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-in">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <!-- Global Toast Container -->
      <app-toast></app-toast>
    </div>
  `
})
export class AdminLayoutComponent {
  readonly uiState = inject(UiStateService);
}
