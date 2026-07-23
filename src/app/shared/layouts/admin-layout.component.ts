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
    <div class="min-h-screen bg-slate-50 flex overflow-hidden">
      <!-- EasyDry Rail Sidebar / Slide-over Mobile -->
      <app-sidebar 
        [isOpenMobile]="isMobileSidebarOpen"
        (closeMobileSidebar)="isMobileSidebarOpen = false">
      </app-sidebar>

      <!-- Main Layout Body -->
      <div class="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        <!-- EasyDry Header -->
        <app-header 
          (toggleSidebar)="isMobileSidebarOpen = !isMobileSidebarOpen"
          (agenciaChange)="onAgenciaChange($event)" 
          (search)="onSearch($event)">
        </app-header>

        <!-- Main Content Area -->
        <main class="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-fade-in">
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Global Toast Container -->
      <app-toast></app-toast>
    </div>
  `
})
export class AdminLayoutComponent {
  isMobileSidebarOpen = false;

  onAgenciaChange(agencia: string) {
    // Shared agency change handler if needed
  }

  onSearch(query: string) {
    // Shared search query handler if needed
  }
}
