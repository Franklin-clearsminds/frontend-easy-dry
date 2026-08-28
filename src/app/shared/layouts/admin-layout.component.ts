import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../components/sidebar/sidebar.component';
import { HeaderComponent } from '../components/header/header.component';
import { ToastComponent } from '../components/toast/toast.component';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, HeaderComponent, ToastComponent],
  template: `
    <div class="h-screen bg-slate-50 flex overflow-hidden">
      <!-- Espacio reservado para el rail del sidebar (80px) — el sidebar es fixed encima -->
      <div class="w-20 flex-shrink-0 h-screen" aria-hidden="true"></div>

      <app-sidebar></app-sidebar>

      <!-- Main Layout Body -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <!-- EasyDry Corporate Header -->
        <app-header (search)="onSearch($event)"></app-header>

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
  onSearch(query: string) {
    // Search handler
  }
}
