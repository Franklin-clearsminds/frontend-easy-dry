import { Component, Input, Output, EventEmitter, inject, OnInit, OnDestroy, OnChanges, SimpleChanges, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  host: {
    '[style.zIndex]': 'isOpen ? hostZIndex : null',
    '[style.position]': 'isOpen ? "relative" : null'
  },
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
        [ngClass]="zClass"
        (click)="onBackdropClick($event)">
        <div 
          class="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in"
          (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-easydry-blue to-easydry-blue-dark text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              @if (showBackButton) {
                <button
                  type="button"
                  (click)="onBack()"
                  class="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors mr-1 cursor-pointer"
                  title="Regresar">
                  <i-lucide name="arrow-left" class="w-5 h-5"></i-lucide>
                </button>
              }
              @if (icon) {
                <div class="p-2 rounded-xl bg-white/10 text-easydry-green">
                  <i-lucide [name]="icon" class="w-5 h-5"></i-lucide>
                </div>
              }
              <h3 class="font-bold text-lg font-outfit tracking-wide">{{ title }}</h3>
            </div>
            <button 
              type="button"
              (click)="closeModal()" 
              class="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar modal (Esc)">
              <i-lucide name="x" class="w-5 h-5"></i-lucide>
            </button>
          </div>

          <!-- Modal Content Body -->
          <div class="p-6 overflow-y-auto flex-1">
            <ng-content></ng-content>
          </div>

          <!-- Modal Footer (Optional slot) -->
          <div class="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <ng-content select="[modal-footer]"></ng-content>
          </div>

        </div>
      </div>
    }
  `
})
export class ModalComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  @Input() showBackButton = false;
  @Input() closeOnBackdrop = false;
  /** z-index sobre sidebar (z-50) y header */
  @Input() zClass = 'z-[9999]';

  @Output() close = new EventEmitter<void>();
  @Output() back = new EventEmitter<void>();

  private host = inject(ElementRef<HTMLElement>);
  private doc = inject(DOCUMENT);

  get hostZIndex(): number {
    const match = this.zClass.match(/(\d+)/);
    return match ? Number(match[1]) : 9999;
  }

  ngOnInit(): void {
    this.bringToFront();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.bringToFront();
    }
  }

  ngOnDestroy(): void {
    if (this.host.nativeElement.parentNode) {
      this.host.nativeElement.parentNode.removeChild(this.host.nativeElement);
    }
  }

  private bringToFront(): void {
    this.doc.body.appendChild(this.host.nativeElement);
  }

  @HostListener('window:keydown.escape', ['$event'])
  onKeydownHandler(event: KeyboardEvent): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop) {
      this.closeModal();
    }
  }

  onBack(): void {
    this.back.emit();
  }

  closeModal(): void {
    this.close.emit();
  }
}
