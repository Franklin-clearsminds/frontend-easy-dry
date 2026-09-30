import { Component, ElementRef, inject, viewChild, effect } from '@angular/core';
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
      <!-- Sidebar: fijado expandido (260px) o mini (60px) empujan el contenido; la vista previa flotante
           en modo mini y el cajón móvil flotan encima sin mover el margen. -->
      <app-sidebar></app-sidebar>

      <!-- El margen final siempre es el correcto al instante (sin transición CSS sobre margin-left: es
           una propiedad de layout y este contenedor envuelve TODA la página — animarla fuerza recalcular
           el layout de tablas y gráficos en cada fotograma, compitiendo con animaciones livianas del
           sidebar como la del logo y haciéndolas ver desincronizadas). El desplazamiento visual lo hace,
           en su lugar, un transform (translateX) aplicado desde el componente (técnica FLIP, GPU, no
           fuerza reflow). -->
      <div
        #contentWrap
        class="flex flex-col min-w-0 h-dvh overflow-hidden"
        [style.margin-left.px]="uiState.sidebarReservedWidth()">
        <app-header></app-header>

        <main class="flex-1 overflow-y-auto">
          <div class="p-6 lg:p-8 max-w-[1600px] w-full mx-auto animate-fade-in">
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
  private readonly contentWrapRef = viewChild<ElementRef<HTMLDivElement>>('contentWrap');
  private prevWidth: number | null = null;

  constructor() {
    effect(() => {
      const next = this.uiState.sidebarReservedWidth();
      const el = this.contentWrapRef()?.nativeElement;
      if (!el) return;

      if (this.prevWidth === null) {
        // Primer render: el binding de plantilla ya dejó el margen correcto, no hay nada que animar.
        this.prevWidth = next;
        return;
      }
      const prev = this.prevWidth;
      this.prevWidth = next;
      if (prev === next) return;

      // FLIP: el margen (layout) ya quedó en su valor final por el binding de arriba; el transform
      // arranca desde donde visualmente estaba antes y anima solo hasta 0 — el navegador no vuelve a
      // recalcular el layout de la página en cada fotograma, solo compone la capa (como la opacidad).
      el.style.transition = 'none';
      el.style.transform = `translateX(${prev - next}px)`;
      void el.offsetWidth; // fuerza el reflow para que el navegador registre el punto de partida
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = 'translateX(0)';
    });
  }
}
