import { Component, EventEmitter, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { RegionService } from '../../../core/services/region.service';
import { ClienteService } from '../../../core/services/cliente.service';
import { ToastService } from '../../../shared/services/toast.service';
import { RetosService } from '../../../core/services/retos.service';

import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Sucursal, RegionOperativa, ClienteSucursal } from '../../../core/models';

@Component({
  selector: 'app-crear-reto-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent],
  template: `
    <app-modal [isOpen]="true" size="lg" title="Nuevo Reto Comercial" icon="trophy" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
            @if (!puedeCrear) {
              <p role="alert" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
                Tu usuario no tiene una región asignada, por eso no puede crear retos. Pide a un administrador que la configure.
              </p>
            }
            
            <div>
              <label for="crear-reto-modal-f1" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Título del Reto *</label>
              <input id="crear-reto-modal-f1" formControlName="titulo" type="text" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Ej: Especialista Estrella del Mes">
            </div>

            <div>
              <label for="crear-reto-modal-f2" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Descripción</label>
              <textarea id="crear-reto-modal-f2" formControlName="descripcion" rows="2" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Breve descripción o motivación"></textarea>
            </div>

            <div>
              <label for="crear-reto-modal-f3" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Premio *</label>
              <input id="crear-reto-modal-f3" formControlName="premio" type="text" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue" placeholder="Ej: Bono de $100, Día Libre">
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="crear-reto-modal-f4" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha Inicio *</label>
                <input id="crear-reto-modal-f4" formControlName="fechaInicio" type="date" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
              </div>
              <div>
                <label for="crear-reto-modal-f5" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Fecha Fin *</label>
                <input id="crear-reto-modal-f5" formControlName="fechaFin" type="date" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              
              <!-- Región -->
              <div>
                <label for="crear-reto-modal-f6" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Región</label>
                <select id="crear-reto-modal-f6" formControlName="region" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue disabled:opacity-70">
                  @if (!regionFija) {
                    <option value="Todas">Todas las Regiones</option>
                  }
                  @for (r of regiones; track r.id) {
                    <option [value]="r.nombre">{{ r.nombre }}</option>
                  }
                </select>
                @if (regionFija) {
                  <p class="text-xs text-slate-500 mt-1">Solo retos para tu región.</p>
                }
              </div>

              <!-- Cliente -->
              <div>
                <label for="crear-reto-modal-f7" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Cliente</label>
                <select id="crear-reto-modal-f7" formControlName="marca" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  <option value="Todas">Todos los Clientes</option>
                  @for (c of clientes; track c.id) {
                    <option [value]="c.nombre">{{ c.nombre }}</option>
                  }
                </select>
              </div>

              <!-- Quien actúa en todo el país elige libremente; con alcance de región solo ve las agencias de su región -->
              <div>
                <label for="crear-reto-modal-f8" class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Sucursal Específica</label>
                <select id="crear-reto-modal-f8" formControlName="sucursalId" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:border-easydry-blue focus:ring-easydry-blue">
                  <option value="">Todas (Aplica Región/Cliente)</option>
                  @for (s of sucursalesDisponibles; track s.id) {
                    <option [value]="s.id">{{ s.nombre }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="pt-2 border-t border-slate-100">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Criterios de Evaluación (Múltiple) *</label>
              <div class="flex flex-wrap gap-2">
                @for (crit of opcionesCriterios; track crit) {
                  <button type="button" (click)="toggleCriterio(crit)" 
                    class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5"
                    [ngClass]="hasCriterio(crit) ? 'bg-easydry-blue text-white border-easydry-blue shadow-sm' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'">
                    @if (hasCriterio(crit)) { <i-lucide aria-hidden="true" name="check" class="w-3.5 h-3.5"></i-lucide> }
                    {{ crit }}
                  </button>
                }
              </div>
              @if (form.get('criterios')?.invalid && form.get('criterios')?.touched) {
                <p class="text-xs text-red-500 mt-1">Selecciona al menos un criterio.</p>
              }
            </div>
          </form>

      <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full">
        <button (click)="close.emit()" class="btn btn-secondary w-full sm:w-auto">
          Cancelar
        </button>
        <button (click)="onSubmit()" [disabled]="form.invalid || guardando || !puedeCrear" class="btn btn-cta w-full sm:w-auto">
          <i-lucide aria-hidden="true" name="check" class="w-4 h-4"></i-lucide> Activar Reto
        </button>
      </div>
    </app-modal>
  `
})
export class CrearRetoModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  form: FormGroup;
  sucursales: Sucursal[] = [];
  regiones: RegionOperativa[] = [];
  clientes: ClienteSucursal[] = [];
  /** Con alcance de región solo se crean retos para la región propia (el servidor lo exige también). */
  regionFija = false;
  /** false si el ámbito del usuario no permite crear retos (sin región asignada). */
  puedeCrear = true;
  guardando = false;

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
  private regionService = inject(RegionService);
  private clienteService = inject(ClienteService);
  private retosService = inject(RetosService);
  private toast = inject(ToastService);

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

  /** Agencias que se pueden elegir: las de la región elegida (o, con alcance de región, las de la región propia). */
  get sucursalesDisponibles(): Sucursal[] {
    const region = String(this.form.getRawValue().region || 'Todas');
    if (region === 'Todas') return this.sucursales;
    return this.sucursales.filter(s => String(s.regionNombre || '').toLowerCase() === region.toLowerCase());
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const ambito = user?.ambito;
    const miRegion = String(user?.region || '').trim();

    this.regionService.getRegiones().subscribe(list => {
      const activas = list.filter(r => r.estado === 'Activa');
      // Con alcance de región solo aparece la región propia.
      this.regiones = this.regionFija ? activas.filter(r => r.nombre.toLowerCase() === miRegion.toLowerCase()) : activas;
    });
    this.clienteService.getClientes().subscribe(list => {
      this.clientes = list.filter(c => c.estado === 'Activa');
    });
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });

    if (ambito === 'REGION') {
      this.regionFija = true;
      if (miRegion) {
        this.form.patchValue({ region: miRegion });
        this.form.get('region')?.disable();
      } else {
        this.puedeCrear = false;
      }
    } else if (ambito !== 'GLOBAL') {
      // Con alcance de agencia o propio el servidor no permite crear retos.
      this.puedeCrear = false;
    }

    // Al cambiar de región se descarta la agencia elegida si ya no pertenece a ella.
    this.form.get('region')?.valueChanges.subscribe(() => {
      const id = this.form.get('sucursalId')?.value;
      if (id && !this.sucursalesDisponibles.some(s => String(s.id) === String(id))) {
        this.form.patchValue({ sucursalId: '' });
      }
    });
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
      sucursalesIds: val.sucursalId ? [String(val.sucursalId)] : [],
      criterios: val.criterios && val.criterios.length > 0 ? val.criterios : ['Sin criterios específicos']
    };

    this.guardando = true;
    this.retosService.crearReto(nuevoReto).subscribe({
      next: (reto) => {
        this.guardando = false;
        this.created.emit(reto);
      },
      error: (err) => {
        this.guardando = false;
        const m = err?.error?.message;
        this.toast.error('No se pudo crear el reto', Array.isArray(m) ? m.join(' ') : (typeof m === 'string' && m ? m : 'El servidor no aceptó el reto.'));
      }
    });
  }
}
