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
    <div class="h-dvh bg-slate-50">
      <!-- Sidebar: fijado expandido (260px) o mini (68px) empujan el contenido; la vista previa flotante
           en modo mini y el cajón móvil flotan encima sin mover el margen. -->
      <app-sidebar></app-sidebar>

      <!-- El margen acompaña al ancho del sidebar con la misma duración y curva, así no queda hueco ni solapamiento. -->
      <div
        class="flex flex-col min-w-0 h-dvh overflow-hidden transition-[margin-left] duration-200 ease-out"
        [style.margin-left.rem]="uiState.sidebarReservedWidth() / 16">
        <app-header></app-header>

        <main class="flex-1 overflow-y-auto">
          <!-- Contenido fluido: ocupa todo el ancho disponible con márgenes estándar que escalan por
               breakpoint, alineados con el header (sin tope de ancho que deje franjas vacías en monitores grandes). -->
          <div class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 2xl:px-10 w-full animate-fade-in">
            <router-outlet></router-outlet>
          </div>
        </main>
      </div>

      <app-toast></app-toast>
    </div>
  `,
})
export class AdminLayoutComponent {
  readonly uiState = inject(UiStateService);
}
