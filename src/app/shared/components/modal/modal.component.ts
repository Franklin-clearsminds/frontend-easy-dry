import { Component, Input, Output, EventEmitter, inject, OnInit, ElementRef } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
           [ngClass]="zClass">
        <div 
          class="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-fade-in"
          (click)="$event.stopPropagation()">
          
          <!-- Modal Header -->
          <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-easydry-blue to-easydry-blue-dark text-white flex items-center justify-between">
            <div class="flex items-center gap-3">
              @if (icon) {
                <div class="p-2 rounded-xl bg-white/10 text-easydry-green">
                  <i-lucide [name]="icon" class="w-5 h-5"></i-lucide>
                </div>
              }
              <h3 class="font-bold text-lg font-outfit tracking-wide">{{ title }}</h3>
            </div>
            <button 
              (click)="closeModal()" 
              class="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
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
export class ModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() icon = '';
  /** z-index sobre sidebar (z-50) y header */
  @Input() zClass = 'z-[9999]';
  @Output() close = new EventEmitter<void>();

  private host = inject(ElementRef<HTMLElement>);
  private doc = inject(DOCUMENT);

  ngOnInit(): void {
    this.doc.body.appendChild(this.host.nativeElement);
  }

  closeModal() {
    this.close.emit();
  }
}
