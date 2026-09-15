import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { RetosService } from '../../../core/services/retos.service';

import { ModalComponent } from '../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-crear-reto-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent],
  template: `
    <app-modal [isOpen]="true" title="Nuevo Reto Comercial" icon="trophy" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título del Reto *</label>
              <input formControlName="titulo" type="text" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Ej: Especialista Estrella del Mes">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción</label>
              <textarea formControlName="descripcion" rows="2" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Breve descripción o motivación"></textarea>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Premio *</label>
              <input formControlName="premio" type="text" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Ej: Bono de $100, Día Libre">
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha Inicio *</label>
                <input formControlName="fechaInicio" type="date" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
              </div>
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha Fin *</label>
                <input formControlName="fechaFin" type="date" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              
              <!-- Región -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Región</label>
                <select formControlName="region" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  <option value="Todas">Todas las Regiones</option>
                  <option value="Costa">Costa</option>
                  <option value="Sierra">Sierra</option>
                  <option value="Austro">Austro</option>
                </select>
              </div>

              <!-- Cliente -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cliente</label>
                <select formControlName="marca" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  <option value="Todas">Todos los Clientes</option>
                  <option value="EasyDry">EasyDry</option>
                  <option value="EasyDry Premium">EasyDry Premium</option>
                  <option value="EasyDry Express">EasyDry Express</option>
                </select>
              </div>

              <!-- Solo SuperAdmin/Admin pueden elegir "Todas" o cambiar esto libremente. Los gerentes lo tendrán readonly/bloqueado -->
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sucursal Específica</label>
                <select formControlName="sucursalId" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  @if (canSelectGlobal) {
                    <option value="">Todas (Aplica Región/Cliente)</option>
                  }
                  @for (s of sucursales; track s.id) {
                    <option [value]="s.id">{{ s.nombre }}</option>
                  }
                </select>
                @if (!canSelectGlobal) {
                  <p class="text-[10px] text-slate-500 mt-1">Solo retos para tu sucursal.</p>
                }
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Criterios de Evaluación (Múltiple) *</label>
              <div class="flex flex-wrap gap-2">
                @for (crit of opcionesCriterios; track crit) {
                  <button type="button" (click)="toggleCriterio(crit)" 
                    class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5"
                    [ngClass]="hasCriterio(crit) ? 'bg-easydry-blue text-white border-easydry-blue shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'">
                    @if (hasCriterio(crit)) { <i-lucide name="check" class="w-3.5 h-3.5"></i-lucide> }
                    {{ crit }}
                  </button>
                }
              </div>
              @if (form.get('criterios')?.invalid && form.get('criterios')?.touched) {
                <p class="text-xs text-red-500 mt-1">Selecciona al menos un criterio.</p>
              }
            </div>
          </form>

      <div modal-footer class="flex justify-end gap-3 w-full">
        <button (click)="close.emit()" class="px-4 py-2 font-bold text-sm text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors">
          Cancelar
        </button>
        <button (click)="onSubmit()" [disabled]="form.invalid" class="px-5 py-2 font-bold text-sm text-slate-900 bg-easydry-green hover:bg-easydry-green-dark rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
          <i-lucide name="check" class="w-4 h-4"></i-lucide> Activar Reto
        </button>
      </div>
    </app-modal>
  `
})
export class CrearRetoModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  form: FormGroup;
  sucursales: any[] = [];
  canSelectGlobal = false;

  opcionesCriterios = [
    'Mejor Tiempo de Secado Promedio',
    'Mayor Número de Vehículos Atendidos',
    'Cero Incidentes de Daño',
    'Aprobaciones de Calidad Perfectas',
    'Menor Consumo de Químicos'
  ];

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private sucursalService = inject(SucursalService);
  private retosService = inject(RetosService);

  constructor() {
    const today = new Date().toISOString().split('T')[0];
    this.form = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: [''],
      premio: ['', Validators.required],
      fechaInicio: [today, Validators.required],
      fechaFin: ['', Validators.required],
      region: ['Todas', Validators.required],
      marca: ['Todas', Validators.required],
      sucursalId: [''],
      criterios: [[], Validators.required]
    });
  }

  toggleCriterio(crit: string) {
    const arr = this.form.get('criterios')?.value as string[];
    if (arr.includes(crit)) {
      this.form.patchValue({ criterios: arr.filter(c => c !== crit) });
    } else {
      this.form.patchValue({ criterios: [...arr, crit] });
    }
    this.form.get('criterios')?.markAsTouched();
  }

  hasCriterio(crit: string): boolean {
    return (this.form.get('criterios')?.value as string[]).includes(crit);
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const todasSucursales = this.sucursalService.getActivas();

    if (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') {
      this.canSelectGlobal = true;
      this.sucursales = todasSucursales;
    } else {
      this.canSelectGlobal = false;
      // Solo sucursal del gerente
      if (user?.sucursal) {
        this.sucursales = todasSucursales.filter((s: any) => s.id === user.sucursal);
        this.form.patchValue({ sucursalId: user.sucursal, region: 'Todas', marca: 'Todas' });
      }
      this.form.get('sucursalId')?.disable();
      this.form.get('region')?.disable();
      this.form.get('marca')?.disable();
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    const nuevoReto = {
      titulo: val.titulo,
      descripcion: val.descripcion,
      premio: val.premio,
      fechaInicio: val.fechaInicio,
      fechaFin: val.fechaFin,
      regiones: val.region === 'Todas' || !val.region ? ['Todas'] : [val.region],
      marcas: val.marca === 'Todas' || !val.marca ? ['Todas'] : [val.marca],
      sucursalesIds: val.sucursalId ? [Number(val.sucursalId)] : [],
      criterios: val.criterios && val.criterios.length > 0 ? val.criterios : ['Sin criterios específicos']
    };

    this.retosService.crearReto(nuevoReto).subscribe(reto => {
      this.created.emit(reto);
    });
  }
}
