import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../environments/environment';
import { cargarGoogleMaps } from './rrhh-google-maps';

export interface PuntoMapa { lat: number; lng: number }

/** Centro inicial (Ecuador) cuando todavía no hay un punto elegido. */
const CENTRO_INICIAL: PuntoMapa = { lat: -1.8312, lng: -78.1834 };

const coordenadaValida = (v: number | null, max: number): v is number => v !== null && Number.isFinite(v) && Math.abs(v) <= max;

/**
 * Mapa de Google para elegir la ubicación de una agencia (prototipo de RRHH): clic en el mapa o arrastrar el marcador, o escribir la
 * latitud y la longitud. El mapa solo se crea cuando el recuadro se ve (así no se cobra una carga de mapa por abrir la pantalla).
 * Sin clave, avisa que falta y deja las coordenadas escribirse a mano.
 */
@Component({
  selector: 'app-rrhh-mapa-ubicacion',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="space-y-3">
      <!-- Buscador de lugares: escribes y Google sugiere; al elegir uno el marcador salta ahí y luego lo ajustas en el mapa -->
      <div class="relative">
        <label [for]="id + '-buscar'" class="block text-xs font-bold text-violet-900 uppercase mb-1">Buscar un lugar</label>
        <div class="relative">
          <i-lucide name="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true"></i-lucide>
          <input [id]="id + '-buscar'" type="text" class="w-full p-2.5 pl-9 border border-violet-300 rounded-xl text-sm bg-white" [(ngModel)]="busqueda" (ngModelChange)="buscar()" (keydown.escape)="sugerencias = []" (keydown.enter)="$event.preventDefault(); elegirPrimera()" name="ubic-buscar" placeholder="Escribe la dirección o el nombre del lugar…" autocomplete="off" role="combobox" aria-autocomplete="list" [attr.aria-expanded]="sugerencias.length > 0" [attr.aria-controls]="id + '-lista'" [disabled]="estado !== 'listo'">
        </div>
        @if (sugerencias.length) {
          <ul [id]="id + '-lista'" role="listbox" class="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            @for (sg of sugerencias; track sg.texto) {
              <li role="option">
                <button type="button" class="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 focus:bg-violet-50 focus:outline-none flex items-start gap-2" (click)="elegirSugerencia(sg)">
                  <i-lucide name="map-pin" class="w-4 h-4 text-violet-600 shrink-0 mt-0.5" aria-hidden="true"></i-lucide><span>{{ sg.texto }}</span>
                </button>
              </li>
            }
          </ul>
        } @else if (buscando) {
          <p class="text-[11px] text-slate-500 mt-1" role="status">Buscando…</p>
        }
      </div>

      <div class="relative rounded-xl overflow-hidden border border-violet-200 bg-white" style="height: 280px">
        <div #mapa class="absolute inset-0" role="application" aria-label="Mapa para elegir la ubicación de la agencia"></div>
        @if (estado !== 'listo') {
          <div class="absolute inset-0 flex items-center justify-center p-4 text-center bg-slate-50/95 text-xs font-semibold" [ngClass]="estado === 'cargando' ? 'text-slate-500' : 'text-amber-900'" role="status">
            @switch (estado) {
              @case ('sin-clave') { <span>Falta la clave de Google Maps (<code>NG_APP_GOOGLE_MAPS_KEY</code> en el <code>.env</code>). Mientras tanto escribe la latitud y la longitud a mano.</span> }
              @case ('error') { <span>{{ mensajeError }}</span> }
              @default { <span>Cargando el mapa…</span> }
            }
          </div>
        }
      </div>
      <p class="text-[11px] text-violet-900">Busca el lugar arriba y luego ajusta el punto: haz clic en el mapa o arrastra el marcador.</p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label [for]="id + '-lat'" class="block text-xs font-bold text-violet-900 uppercase mb-1">Latitud</label>
          <input [id]="id + '-lat'" type="number" step="0.000001" class="w-full p-2.5 border border-violet-300 rounded-xl text-sm bg-white" [ngModel]="lat" (ngModelChange)="cambioManual('lat', $event)" name="ubic-lat" placeholder="-0.180653" inputmode="decimal">
        </div>
        <div>
          <label [for]="id + '-lng'" class="block text-xs font-bold text-violet-900 uppercase mb-1">Longitud</label>
          <input [id]="id + '-lng'" type="number" step="0.000001" class="w-full p-2.5 border border-violet-300 rounded-xl text-sm bg-white" [ngModel]="lng" (ngModelChange)="cambioManual('lng', $event)" name="ubic-lng" placeholder="-78.467834" inputmode="decimal">
        </div>
        <button type="button" class="btn btn-secondary" (click)="usarMiUbicacion()"><i-lucide name="map-pin" class="w-4 h-4" aria-hidden="true"></i-lucide> Usar mi ubicación</button>
      </div>
      @if (aviso) { <p class="text-xs font-semibold text-amber-900" role="status">{{ aviso }}</p> }
    </div>
  `,
})
export class RrhhMapaUbicacionComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lat: number | null = null;
  @Input() lng: number | null = null;
  @Output() ubicacionChange = new EventEmitter<PuntoMapa>();
  @ViewChild('mapa', { static: true }) private contenedor!: ElementRef<HTMLDivElement>;

  readonly id = `mapa-${Math.random().toString(36).slice(2, 8)}`;
  estado: 'esperando' | 'cargando' | 'sin-clave' | 'listo' | 'error' = 'esperando';
  mensajeError = '';
  aviso = '';
  busqueda = '';
  sugerencias: { texto: string; prediccion: any }[] = [];
  buscando = false;
  private temporizador: ReturnType<typeof setTimeout> | null = null;
  private libPlaces: any = null;
  private sesion: any = null;
  /** Cada búsqueda lleva un número para descartar respuestas viejas que lleguen tarde. */
  private numeroBusqueda = 0;

  private gm: any = null;
  private mapa: any = null;
  private marcador: any = null;
  private observador: ResizeObserver | null = null;
  private iniciado = false;

  ngAfterViewInit(): void {
    // El formulario vive dentro de un modal: el mapa se crea cuando el recuadro tiene tamaño, es decir, cuando de verdad se ve.
    this.observador = new ResizeObserver(() => {
      const caja = this.contenedor.nativeElement;
      if (!caja.offsetWidth || !caja.offsetHeight) return;
      if (!this.iniciado) void this.iniciar();
      else if (this.mapa) this.alRedimensionar();
    });
    this.observador.observe(this.contenedor.nativeElement);
  }

  ngOnChanges(): void {
    // La ubicación cambió desde fuera (otra agencia o un guardado): el marcador la sigue.
    if (this.mapa) this.ponerMarcador(false);
  }

  ngOnDestroy(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    this.observador?.disconnect();
    this.marcador?.setMap(null);
  }

  private async iniciar(): Promise<void> {
    this.iniciado = true;
    const clave = environment.googleMapsKey?.trim();
    if (!clave) { this.estado = 'sin-clave'; return; }
    this.estado = 'cargando';
    try {
      this.gm = await cargarGoogleMaps(clave);
      const centro = this.punto ?? CENTRO_INICIAL;
      this.mapa = new this.gm.Map(this.contenedor.nativeElement, {
        center: centro,
        zoom: this.punto ? 16 : 6,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      this.mapa.addListener('click', (e: any) => this.elegir({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
      this.estado = 'listo';
      this.ponerMarcador(true);
    } catch (e) {
      this.estado = 'error';
      this.mensajeError = e instanceof Error ? e.message : 'No se pudo cargar el mapa.';
    }
  }

  private get punto(): PuntoMapa | null {
    return coordenadaValida(this.lat, 90) && coordenadaValida(this.lng, 180) ? { lat: this.lat, lng: this.lng } : null;
  }

  private alRedimensionar(): void {
    this.gm.event.trigger(this.mapa, 'resize');
    const p = this.punto;
    if (p) this.mapa.setCenter(p);
  }

  /** Pone o mueve el marcador al punto actual; con `centrar` también acerca el mapa. */
  private ponerMarcador(centrar: boolean): void {
    if (!this.mapa) return;
    const p = this.punto;
    if (!p) { this.marcador?.setMap(null); this.marcador = null; return; }
    if (!this.marcador) {
      this.marcador = new this.gm.Marker({ position: p, map: this.mapa, draggable: true, title: 'Ubicación de la agencia' });
      this.marcador.addListener('dragend', (e: any) => this.elegir({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
    } else {
      this.marcador.setPosition(p);
      this.marcador.setMap(this.mapa);
    }
    if (centrar) { this.mapa.setCenter(p); this.mapa.setZoom(16); }
    else this.mapa.panTo(p);
  }

  private elegir(p: PuntoMapa): void {
    this.aviso = '';
    this.lat = Math.round(p.lat * 1e6) / 1e6;
    this.lng = Math.round(p.lng * 1e6) / 1e6;
    this.ponerMarcador(false);
    this.ubicacionChange.emit({ lat: this.lat, lng: this.lng });
  }

  // ───────────────────────── Buscador de lugares ─────────────────────────

  /** Espera un instante tras cada tecla y pide sugerencias a Google (Places API nueva), acotadas a Ecuador. */
  buscar(): void {
    if (this.temporizador) clearTimeout(this.temporizador);
    const texto = this.busqueda.trim();
    if (texto.length < 3 || this.estado !== 'listo') { this.sugerencias = []; this.buscando = false; return; }
    this.temporizador = setTimeout(() => void this.consultar(texto), 300);
  }

  private async consultar(texto: string): Promise<void> {
    const numero = ++this.numeroBusqueda;
    this.buscando = true;
    this.aviso = '';
    try {
      this.libPlaces ??= await this.gm.importLibrary('places');
      this.sesion ??= new this.libPlaces.AutocompleteSessionToken();
      const { suggestions } = await this.libPlaces.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: texto,
        sessionToken: this.sesion,
        includedRegionCodes: ['ec'],
        language: 'es',
      });
      if (numero !== this.numeroBusqueda) return;
      this.sugerencias = (suggestions ?? [])
        .filter((x: any) => x.placePrediction)
        .slice(0, 5)
        .map((x: any) => ({ texto: x.placePrediction.text.toString(), prediccion: x.placePrediction }));
      if (!this.sugerencias.length) this.aviso = 'No se encontró ese lugar. Prueba con otra dirección o elige el punto en el mapa.';
    } catch {
      if (numero !== this.numeroBusqueda) return;
      this.sugerencias = [];
      this.aviso = 'No se pudo buscar el lugar. Habilita «Places API (New)» en el proyecto de Google Cloud, o elige el punto en el mapa.';
    } finally {
      if (numero === this.numeroBusqueda) this.buscando = false;
    }
  }

  elegirPrimera(): void {
    if (this.sugerencias.length) void this.elegirSugerencia(this.sugerencias[0]);
  }

  /** Lleva el marcador al lugar elegido y acerca el mapa; luego se ajusta a mano. */
  async elegirSugerencia(sg: { texto: string; prediccion: any }): Promise<void> {
    this.sugerencias = [];
    this.busqueda = sg.texto;
    try {
      const lugar = sg.prediccion.toPlace();
      await lugar.fetchFields({ fields: ['location', 'viewport'] });
      if (!lugar.location) throw new Error('sin ubicación');
      // La sesión de facturación termina al elegir un lugar: la próxima búsqueda abre otra.
      this.sesion = null;
      this.elegir({ lat: lugar.location.lat(), lng: lugar.location.lng() });
      this.mapa.setZoom(17);
      this.aviso = 'Lugar encontrado. Ajusta el punto exacto arrastrando el marcador o haciendo clic en el mapa.';
    } catch {
      this.aviso = 'No se pudo ubicar ese lugar. Elige otro o marca el punto en el mapa.';
    }
  }

  cambioManual(campo: 'lat' | 'lng', valor: number | null): void {
    const v = valor === null || (valor as unknown) === '' ? null : Number(valor);
    if (campo === 'lat') this.lat = v; else this.lng = v;
    if (this.punto) { this.aviso = ''; this.ponerMarcador(true); this.ubicacionChange.emit(this.punto); }
  }

  usarMiUbicacion(): void {
    this.aviso = '';
    if (!navigator.geolocation) { this.aviso = 'Este navegador no permite obtener la ubicación.'; return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { this.elegir({ lat: pos.coords.latitude, lng: pos.coords.longitude }); if (this.mapa) { this.mapa.setZoom(17); } },
      () => { this.aviso = 'No se pudo obtener tu ubicación. Da el permiso o elige el punto en el mapa.'; },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }
}
