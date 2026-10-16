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
import { CatalogoServiciosService } from '../../../core/services/catalogo-servicios.service';

import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { Sucursal, RegionOperativa, ClienteSucursal, CatalogoServicio } from '../../../core/models';
import {
  ETIQUETA_METRICA,
  ETIQUETA_PARTICIPANTE,
  ETIQUETA_TIPO_SERVICIO,
  MetricaReto,
  ModoGanadorReto,
  NuevoReto,
  ParticipanteReto,
  PersonaReto,
  TIPOS_SERVICIO_POR_PARTICIPANTE,
  TipoServicioReto,
  resumenGanador,
} from '../../../core/models/reto.model';

@Component({
  selector: 'app-crear-reto-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, LucideAngularModule, ModalComponent],
  template: `
    <app-modal [isOpen]="true" size="lg" title="Nuevo Reto" icon="trophy" (close)="close.emit()">
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
        @if (!puedeCrear) {
          <p role="alert" class="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold">
            Tu usuario no tiene una región asignada, por eso no puede crear retos. Pide a un administrador que la configure.
          </p>
        }

        <!-- 1. Quiénes compiten -->
        <fieldset>
          <legend class="paso"><span class="paso-num">1</span> ¿Quiénes compiten?</legend>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" aria-label="Quiénes compiten">
            @for (p of participantes; track p) {
              <button type="button" role="radio" [attr.aria-checked]="tipoReto === p" (click)="cambiarParticipante(p)"
                class="opcion flex-col py-3" [class.opcion-activa]="tipoReto === p">
                <i-lucide aria-hidden="true" [name]="etiquetaParticipante[p].icono" class="w-5 h-5"></i-lucide>
                <span>{{ etiquetaParticipante[p].plural }}</span>
              </button>
            }
          </div>
        </fieldset>

        <!-- 2. Qué servicios cuentan -->
        <fieldset>
          <legend class="paso"><span class="paso-num">2</span> ¿Qué servicios cuentan?</legend>
          <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Qué servicios cuentan">
            @for (t of tiposServicioPermitidos; track t) {
              <button type="button" role="radio" [attr.aria-checked]="tipoServicios === t" (click)="cambiarTipoServicios(t)"
                class="opcion" [class.opcion-activa]="tipoServicios === t">{{ etiquetaTipoServicio[t] }}</button>
            }
          </div>
          @if (tipoReto === 'LAVADOR' || tipoReto === 'PULIDOR') {
            <p class="text-xs text-slate-500 mt-1.5">Los {{ tipoReto === 'LAVADOR' ? 'lavadores solo hacen servicios generales' : 'pulidores solo hacen servicios especiales' }}.</p>
          }
          @if (tipoServicios === 'ESPECIFICOS') {
            <div class="mt-3">
              <span class="campo">Servicios del catálogo a contar *</span>
              <div class="lista grid grid-cols-1 sm:grid-cols-2 gap-1">
                @for (servicio of serviciosElegibles; track servicio.id) {
                  <label class="item">
                    <input type="checkbox" [checked]="hasServicio(servicio.id)" (change)="toggleServicio(servicio.id)" class="check">
                    <span class="flex-1">{{ servicio.nombre }}</span>
                    @if (tipoReto === 'AGENCIA' || tipoReto === 'BAHIA') {
                      <span class="text-[10px] font-bold uppercase text-slate-400">{{ servicio.categoria === 'ESPECIAL' ? 'Especial' : 'General' }}</span>
                    }
                  </label>
                } @empty {
                  <p class="px-2 py-1.5 text-xs text-amber-700">No hay servicios activos de este tipo.</p>
                }
              </div>
              @if (!catalogoServicioIds.length) {
                <p class="text-xs text-red-500 mt-1">Selecciona uno o varios servicios.</p>
              }
            </div>
          }
        </fieldset>

        <!-- 3. Dónde -->
        <fieldset class="space-y-3">
          <legend class="paso"><span class="paso-num">3</span> ¿Dónde?</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="crear-reto-region" class="campo">Región</label>
              <select id="crear-reto-region" formControlName="region" class="entrada font-bold">
                @if (!regionFija) {
                  <option value="Todas">Todas las regiones</option>
                }
                @for (r of regiones; track r.id) {
                  <option [value]="r.nombre">{{ r.nombre }}</option>
                }
              </select>
              @if (regionFija) {
                <p class="text-xs text-slate-500 mt-1">Solo retos para tu región.</p>
              }
            </div>
            <div>
              <label for="crear-reto-cliente" class="campo">Cliente</label>
              <select id="crear-reto-cliente" formControlName="marca" class="entrada font-bold">
                <option value="Todas">Todos los clientes</option>
                @for (c of clientes; track c.id) {
                  <option [value]="c.nombre">{{ c.nombre }}</option>
                }
              </select>
            </div>
          </div>

          <div>
            <span class="campo">{{ tipoReto === 'AGENCIA' ? 'Agencias que compiten' : 'Agencias' }}</span>
            <div class="lista">
              <label class="item font-bold">
                <input type="checkbox" [checked]="!sucursalesIds.length" (change)="sucursalesIds = []; limpiarDependientes()" class="check">
                Todas las agencias que coinciden con región y cliente
              </label>
              @for (s of sucursalesDisponibles; track s.id) {
                <label class="item">
                  <input type="checkbox" [checked]="sucursalesIds.includes(s.id + '')" (change)="sucursalesIds = alternar(sucursalesIds, s.id + ''); limpiarDependientes()" class="check">
                  {{ s.nombre }}
                </label>
              } @empty {
                <p class="px-2 py-1.5 text-xs text-slate-500">No hay agencias para la región y el cliente elegidos.</p>
              }
            </div>
          </div>

          @if (tipoReto === 'LAVADOR' || tipoReto === 'PULIDOR') {
            <div>
              <span class="campo">{{ etiquetaParticipante[tipoReto].plural }} que compiten</span>
              <div class="lista">
                <label class="item font-bold">
                  <input type="checkbox" [checked]="!personasIds.length" (change)="personasIds = []" class="check">
                  Todos los {{ etiquetaParticipante[tipoReto].plural.toLowerCase() }} de región, cliente y agencias elegidos
                </label>
                @for (persona of personasDisponibles; track persona.id) {
                  <label class="item">
                    <input type="checkbox" [checked]="personasIds.includes(persona.id)" (change)="personasIds = alternar(personasIds, persona.id)" class="check">
                    <span class="flex-1">{{ persona.nombre }}</span>
                    <span class="text-slate-500">{{ persona.agenciaNombre }}</span>
                  </label>
                } @empty {
                  @if (cargandoPersonas) {
                    <p class="px-2 py-1.5 text-xs text-slate-500">Cargando…</p>
                  } @else if (errorPersonas) {
                    <p role="alert" class="px-2 py-1.5 text-xs text-red-600">{{ errorPersonas }}</p>
                  } @else {
                    <p class="px-2 py-1.5 text-xs text-slate-500">No hay {{ etiquetaParticipante[tipoReto].plural.toLowerCase() }} para los filtros elegidos.</p>
                  }
                }
              </div>
            </div>
          }
        </fieldset>

        <!-- 4. Qué se mide -->
        <fieldset>
          <legend class="paso"><span class="paso-num">4</span> ¿Qué se mide?</legend>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Qué se mide">
            @for (m of metricas; track m) {
              <button type="button" role="radio" [attr.aria-checked]="metrica === m" (click)="metrica = m"
                class="opcion" [class.opcion-activa]="metrica === m">{{ etiquetaMetrica[m].nombre }}</button>
            }
          </div>
        </fieldset>

        <!-- 5. Cómo se gana -->
        <fieldset>
          <legend class="paso"><span class="paso-num">5</span> ¿Cómo se gana?</legend>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label class="opcion justify-start text-left" [class.opcion-activa]="modoGanador === 'RANKING'">
              <input type="radio" name="modoGanador" [checked]="modoGanador === 'RANKING'" (change)="modoGanador = 'RANKING'" class="check">
              <span class="flex-1">Ganan los primeros del ranking</span>
              <input type="number" min="1" max="50" step="1" aria-label="Cuántos ganan" formControlName="cantidadGanadores"
                (focus)="modoGanador = 'RANKING'" class="w-16 p-1.5 border border-slate-200 rounded-lg text-xs text-center">
            </label>
            <label class="opcion justify-start text-left" [class.opcion-activa]="modoGanador === 'META'">
              <input type="radio" name="modoGanador" [checked]="modoGanador === 'META'" (change)="modoGanador = 'META'" class="check">
              <span class="flex-1">Ganan todos los que lleguen a</span>
              <input type="number" [min]="metrica === 'MONTO' ? 0.01 : 1" [step]="metrica === 'MONTO' ? 0.01 : 1" aria-label="Meta"
                formControlName="meta" (focus)="modoGanador = 'META'" class="w-20 p-1.5 border border-slate-200 rounded-lg text-xs text-center">
            </label>
          </div>
          <p class="text-xs text-slate-500 mt-1.5">Si dos quedan iguales, va primero quien llegó antes a esa cantidad.</p>
          @if (errorGanador) {
            <p class="text-xs text-red-500 mt-1">{{ errorGanador }}</p>
          }
        </fieldset>

        <!-- 6. Datos del reto -->
        <fieldset class="space-y-3">
          <legend class="paso"><span class="paso-num">6</span> Datos del reto</legend>
          <div>
            <label for="crear-reto-titulo" class="campo">Título *</label>
            <input id="crear-reto-titulo" formControlName="titulo" type="text" class="entrada font-bold" placeholder="Ej: Pulidor estrella de octubre">
          </div>
          <div>
            <label for="crear-reto-premio" class="campo">Premio *</label>
            <input id="crear-reto-premio" formControlName="premio" type="text" class="entrada font-bold" placeholder="Ej: Bono de $100, día libre">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label for="crear-reto-inicio" class="campo">Fecha inicio *</label>
              <input id="crear-reto-inicio" formControlName="fechaInicio" type="date" class="entrada">
            </div>
            <div>
              <label for="crear-reto-fin" class="campo">Fecha fin *</label>
              <input id="crear-reto-fin" formControlName="fechaFin" type="date" class="entrada" [min]="form.get('fechaInicio')?.value">
            </div>
          </div>
          @if (fechasInvalidas) {
            <p class="text-xs text-red-500">La fecha de fin no puede ser anterior a la de inicio.</p>
          }
          <div>
            <label for="crear-reto-descripcion" class="campo">Descripción</label>
            <textarea id="crear-reto-descripcion" formControlName="descripcion" rows="2" class="entrada" placeholder="Breve descripción o motivación"></textarea>
          </div>
        </fieldset>

        <!-- Resumen -->
        <div class="rounded-xl border border-easydry-blue/30 bg-sky-50/60 p-3 text-xs text-slate-700" aria-live="polite">
          <p class="font-extrabold text-easydry-blue uppercase tracking-wider text-[11px] mb-1">Así queda el reto</p>
          <p>{{ resumen }}</p>
          <p class="text-slate-500 mt-1">Se cierra solo al terminar el último día y el ganador sale del ranking.</p>
        </div>
      </form>

      <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 w-full">
        <button (click)="close.emit()" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button (click)="onSubmit()" [disabled]="!puedeEnviar" class="btn btn-cta w-full sm:w-auto">
          <i-lucide aria-hidden="true" name="check" class="w-4 h-4"></i-lucide> {{ guardando ? 'Creando…' : 'Activar Reto' }}
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
    .paso { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; font-size: .75rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: rgb(51 65 85); }
    .paso-num { display: inline-flex; width: 1.25rem; height: 1.25rem; align-items: center; justify-content: center; border-radius: 9999px; background: var(--color-easydry-blue, #004282); color: #fff; font-size: .7rem; }
    .campo { display: block; margin-bottom: .25rem; font-size: .75rem; font-weight: 700; color: rgb(51 65 85); text-transform: uppercase; letter-spacing: .05em; }
    .entrada { width: 100%; padding: .625rem; background: rgb(248 250 252); border: 1px solid rgb(226 232 240); border-radius: .75rem; font-size: .75rem; color: rgb(30 41 59); }
    .entrada:disabled { opacity: .7; }
    .opcion { display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .5rem .75rem; border-radius: .75rem; border: 1px solid rgb(226 232 240); background: rgb(248 250 252); font-size: .75rem; font-weight: 700; color: rgb(71 85 105); cursor: pointer; transition: background-color .15s, border-color .15s, color .15s; }
    .opcion:hover { background: rgb(241 245 249); }
    .opcion-activa { background: var(--color-easydry-blue, #004282); border-color: var(--color-easydry-blue, #004282); color: #fff; }
    .opcion-activa:hover { background: var(--color-easydry-blue, #004282); }
    .opcion-activa input[type=number] { color: rgb(30 41 59); }
    .lista { border: 1px solid rgb(226 232 240); border-radius: .75rem; background: rgb(248 250 252); padding: .5rem; max-height: 9rem; overflow-y: auto; }
    .item { display: flex; align-items: center; gap: .5rem; padding: .375rem .5rem; border-radius: .5rem; font-size: .75rem; color: rgb(51 65 85); cursor: pointer; }
    .item:hover { background: #fff; }
    .check { border-radius: .25rem; border-color: rgb(203 213 225); color: var(--color-easydry-blue, #004282); }
  `],
})
export class CrearRetoModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<any>();

  readonly participantes: ParticipanteReto[] = ['AGENCIA', 'BAHIA', 'LAVADOR', 'PULIDOR'];
  readonly metricas: MetricaReto[] = ['SERVICIOS', 'AUTOS', 'MONTO'];
  readonly etiquetaParticipante = ETIQUETA_PARTICIPANTE;
  readonly etiquetaTipoServicio = ETIQUETA_TIPO_SERVICIO;
  readonly etiquetaMetrica = ETIQUETA_METRICA;

  form: FormGroup;
  tipoReto: ParticipanteReto = 'AGENCIA';
  tipoServicios: TipoServicioReto = 'TODOS';
  metrica: MetricaReto = 'SERVICIOS';
  modoGanador: ModoGanadorReto = 'RANKING';
  catalogoServicioIds: number[] = [];
  sucursalesIds: string[] = [];
  personasIds: string[] = [];

  sucursales: Sucursal[] = [];
  servicios: CatalogoServicio[] = [];
  personas: Record<'LAVADOR' | 'PULIDOR', PersonaReto[] | null> = { LAVADOR: null, PULIDOR: null };
  regiones: RegionOperativa[] = [];
  clientes: ClienteSucursal[] = [];
  /** Con alcance de región solo se crean retos para la región propia (el servidor lo exige también). */
  regionFija = false;
  /** false si el ámbito del usuario no permite crear retos (sin región asignada). */
  puedeCrear = true;
  guardando = false;
  cargandoPersonas = false;
  errorPersonas = '';

  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private sucursalService = inject(SucursalService);
  private regionService = inject(RegionService);
  private clienteService = inject(ClienteService);
  private retosService = inject(RetosService);
  private catalogoServiciosService = inject(CatalogoServiciosService);
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
      cantidadGanadores: [1],
      meta: [null as number | null],
    });
  }

  ngOnInit(): void {
    const user = this.auth.getCurrentUser();
    const ambito = user?.ambito;
    const miRegion = String(user?.region || '').trim();

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

    this.regionService.getRegionesLista().subscribe(list => {
      const activas = list.filter(r => r.estado === 'Activa');
      this.regiones = this.regionFija ? activas.filter(r => r.nombre.toLowerCase() === miRegion.toLowerCase()) : activas;
    });
    this.clienteService.getClientesLista().subscribe(list => {
      this.clientes = list.filter(c => c.estado === 'Activa');
    });
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
    this.catalogoServiciosService.getServiciosActivos().subscribe(list => {
      this.servicios = list.filter(s => s.categoria === 'GENERAL' || s.categoria === 'ESPECIAL');
    });

    this.form.get('region')?.valueChanges.subscribe(() => this.limpiarDependientes(true));
    this.form.get('marca')?.valueChanges.subscribe(() => this.limpiarDependientes(true));
  }

  // ── Opciones dependientes ──

  get tiposServicioPermitidos(): TipoServicioReto[] {
    return TIPOS_SERVICIO_POR_PARTICIPANTE[this.tipoReto];
  }

  /** Catálogo elegible como servicio específico: lavadores solo generales, pulidores solo especiales. */
  get serviciosElegibles(): CatalogoServicio[] {
    const categoria = this.tipoReto === 'LAVADOR' ? 'GENERAL' : this.tipoReto === 'PULIDOR' ? 'ESPECIAL' : null;
    return categoria ? this.servicios.filter(s => s.categoria === categoria) : this.servicios;
  }

  private coincide(regionNombre: string | undefined, clienteNombre: string | undefined): boolean {
    const { region, marca } = this.form.getRawValue();
    const okRegion = !region || region === 'Todas' || String(regionNombre || '').toLowerCase() === String(region).toLowerCase();
    const okCliente = !marca || marca === 'Todas' || String(clienteNombre || '').toLowerCase() === String(marca).toLowerCase();
    return okRegion && okCliente;
  }

  get sucursalesDisponibles(): Sucursal[] {
    return this.sucursales.filter(s => this.coincide(s.regionNombre, s.clienteNombre || s.marcaNombre));
  }

  get personasDisponibles(): PersonaReto[] {
    if (this.tipoReto !== 'LAVADOR' && this.tipoReto !== 'PULIDOR') return [];
    return (this.personas[this.tipoReto] || []).filter(p =>
      this.coincide(p.regionNombre, p.clienteNombre) && (!this.sucursalesIds.length || this.sucursalesIds.includes(p.agenciaId)));
  }

  cambiarParticipante(p: ParticipanteReto): void {
    if (this.tipoReto === p) return;
    this.tipoReto = p;
    this.personasIds = [];
    if (!this.tiposServicioPermitidos.includes(this.tipoServicios)) this.tipoServicios = this.tiposServicioPermitidos[0];
    const elegibles = new Set(this.serviciosElegibles.map(s => s.id));
    this.catalogoServicioIds = this.catalogoServicioIds.filter(id => elegibles.has(id));
    if ((p === 'LAVADOR' || p === 'PULIDOR') && this.personas[p] === null) this.cargarPersonas(p);
  }

  cambiarTipoServicios(t: TipoServicioReto): void {
    this.tipoServicios = t;
    if (t !== 'ESPECIFICOS') this.catalogoServicioIds = [];
  }

  hasServicio(id: number): boolean {
    return this.catalogoServicioIds.includes(id);
  }

  toggleServicio(id: number): void {
    this.catalogoServicioIds = this.hasServicio(id) ? this.catalogoServicioIds.filter(s => s !== id) : [...this.catalogoServicioIds, id];
  }

  alternar(lista: string[], id: string): string[] {
    return lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id];
  }

  /** Quita de lo elegido lo que ya no coincide con los filtros de arriba. */
  limpiarDependientes(tambienAgencias = false): void {
    if (tambienAgencias) {
      const agencias = new Set(this.sucursalesDisponibles.map(s => String(s.id)));
      this.sucursalesIds = this.sucursalesIds.filter(id => agencias.has(id));
    }
    const personas = new Set(this.personasDisponibles.map(p => p.id));
    this.personasIds = this.personasIds.filter(id => personas.has(id));
  }

  private cargarPersonas(tipo: 'LAVADOR' | 'PULIDOR'): void {
    this.cargandoPersonas = true;
    this.errorPersonas = '';
    this.retosService.getPersonasReto(tipo).subscribe({
      next: (personas) => {
        this.personas[tipo] = personas;
        this.cargandoPersonas = false;
      },
      error: () => {
        this.cargandoPersonas = false;
        this.errorPersonas = 'No se pudo cargar la lista. Cierra y vuelve a abrir el reto para reintentar.';
      },
    });
  }

  // ── Validación y resumen ──

  get fechasInvalidas(): boolean {
    const { fechaInicio, fechaFin } = this.form.getRawValue();
    return !!fechaInicio && !!fechaFin && fechaFin < fechaInicio;
  }

  get errorGanador(): string {
    if (this.modoGanador === 'RANKING') {
      const n = Number(this.form.get('cantidadGanadores')?.value);
      return Number.isInteger(n) && n >= 1 && n <= 50 ? '' : 'Indica cuántos ganan (de 1 a 50).';
    }
    const meta = Number(this.form.get('meta')?.value);
    if (!(meta > 0)) return 'Indica la meta que hay que alcanzar.';
    if (this.metrica !== 'MONTO' && !Number.isInteger(meta)) return 'La meta de servicios o autos debe ser un número entero.';
    return '';
  }

  get puedeEnviar(): boolean {
    return this.puedeCrear && !this.guardando && this.form.valid && !this.fechasInvalidas && !this.errorGanador &&
      (this.tipoServicios !== 'ESPECIFICOS' || this.catalogoServicioIds.length > 0);
  }

  get resumen(): string {
    const { region, marca, fechaInicio, fechaFin, cantidadGanadores, meta } = this.form.getRawValue();
    const quienes = this.personasIds.length
      ? `${this.personasIds.length} ${this.etiquetaParticipante[this.tipoReto].plural.toLowerCase()}`
      : this.tipoReto === 'AGENCIA' && this.sucursalesIds.length ? `${this.sucursalesIds.length} agencia(s)`
      : `${this.etiquetaParticipante[this.tipoReto].plural}`;
    const servicios = this.tipoServicios === 'ESPECIFICOS'
      ? `${this.catalogoServicioIds.length} servicio(s) específico(s)`
      : this.etiquetaTipoServicio[this.tipoServicios].toLowerCase();
    const donde = [region && region !== 'Todas' ? region : 'todas las regiones', marca && marca !== 'Todas' ? marca : null]
      .filter(Boolean).join(' · ');
    const gana = resumenGanador({ modoGanador: this.modoGanador, cantidadGanadores: Number(cantidadGanadores) || 1, meta: Number(meta) || 0, metrica: this.metrica });
    const fechas = fechaInicio && fechaFin ? ` Del ${fechaInicio} al ${fechaFin}.` : '';
    return `Compiten ${quienes} (${donde}). Cuenta ${servicios}; se mide ${this.etiquetaMetrica[this.metrica].nombre.toLowerCase()}. ${gana}.${fechas}`;
  }

  onSubmit() {
    if (!this.puedeEnviar) return;
    const val = this.form.getRawValue();
    const nuevoReto: NuevoReto = {
      titulo: val.titulo,
      descripcion: val.descripcion,
      premio: val.premio,
      fechaInicio: val.fechaInicio,
      fechaFin: val.fechaFin,
      regiones: val.region === 'Todas' || !val.region ? ['Todas'] : [val.region],
      marcas: val.marca === 'Todas' || !val.marca ? ['Todas'] : [val.marca],
      sucursalesIds: this.sucursalesIds,
      tipoReto: this.tipoReto,
      tipoServicios: this.tipoServicios,
      catalogoServicioIds: this.catalogoServicioIds,
      metrica: this.metrica,
      modoGanador: this.modoGanador,
      cantidadGanadores: Number(val.cantidadGanadores) || 1,
      meta: val.meta != null ? Number(val.meta) : undefined,
      pulidoresIds: this.tipoReto === 'PULIDOR' ? this.personasIds : [],
      lavadoresIds: this.tipoReto === 'LAVADOR' ? this.personasIds : [],
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
