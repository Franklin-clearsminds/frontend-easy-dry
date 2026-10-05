import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-ranking-operadores-widget',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-easydry h-full">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-bold text-slate-900 text-lg font-outfit flex items-center gap-2">
          <i-lucide aria-hidden="true" name="trophy" class="w-5 h-5 text-amber-500"></i-lucide>
          {{ title || (showTabs ? 'Top Pulidores' : 'Top Operadores') }}
        </h4>
        @if (showTabs) {
          <div class="flex bg-slate-100 p-1 rounded-xl">
            <button class="px-3 py-1 text-xs font-bold rounded-lg transition-colors" [ngClass]="activeTab === 'fijos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'" (click)="activeTab = 'fijos'">
              Fijos
            </button>
            <button class="px-3 py-1 text-xs font-bold rounded-lg transition-colors" [ngClass]="activeTab === 'moviles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'" (click)="activeTab = 'moviles'">
              Móviles
            </button>
          </div>
        } @else {
          <span class="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">Hoy</span>
        }
      </div>

      <div class="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        @for (op of currentRanking; track op.posicion) {
          <div class="p-3 bg-slate-50 border border-slate-100 hover:border-easydry-blue/30 hover:bg-easydry-blue/5 transition-colors rounded-xl flex items-center justify-between group">
            <div class="flex items-center gap-3">
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-extrabold text-xs shadow-xs"
                    [ngClass]="{
                      'bg-amber-400 text-slate-900': op.posicion === 1,
                      'bg-slate-300 text-slate-800': op.posicion === 2,
                      'bg-amber-700/30 text-amber-900': op.posicion === 3,
                      'bg-slate-100 text-slate-500': op.posicion > 3
                    }">
                {{ op.posicion }}
              </span>
              <div>
                <p class="text-sm font-bold text-slate-900 group-hover:text-easydry-blue transition-colors">{{ op.nombre }}</p>
                <p class="text-xs text-slate-500">{{ op.bahia }}</p>
              </div>
            </div>
            <div class="text-right flex flex-col items-end">
              <span class="text-sm font-extrabold text-slate-800">{{ op.vehiculos }}</span>
              <span class="text-[11px] font-bold uppercase tracking-widest text-slate-500">VEH.</span>
              @if (op.dinero !== undefined) {
                <span class="text-xs font-bold text-emerald-600 mt-1">$ {{ op.dinero }}</span>
              }
            </div>
          </div>
        }
        @if (currentRanking.length === 0) {
          <div class="text-center text-sm text-slate-500 py-4">No hay datos en esta categoría.</div>
        }
      </div>
    </div>
  `
})
export class RankingOperadoresWidgetComponent {
  @Input() title?: string;
  @Input() ranking: any[] = [];
  @Input() rankingMoviles: any[] = [];
  @Input() showTabs = false;
  activeTab: 'fijos' | 'moviles' = 'fijos';

  get currentRanking() {
    return this.activeTab === 'fijos' ? this.ranking : this.rankingMoviles;
  }
}
