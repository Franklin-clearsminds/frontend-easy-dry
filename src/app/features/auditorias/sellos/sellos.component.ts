import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { SellosService } from '../../../core/services/sellos.service';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PasswordRequisitosComponent } from '../../../shared/components/password-requisitos/password-requisitos.component';
import { SelloConfig, mensajeError } from '../../../core/models/auditorias.model';
import { motivoPasswordDebil } from '../../../core/utils/password-politica';

/**
 * El logo se achica antes de guardarlo: queda liviano y nítido como marca de agua. Se prueban lados cada vez menores y, si el PNG
 * (que pesa mucho en imágenes con detalle) no cabe, WEBP y JPEG, hasta quedar por debajo del tope que acepta el servidor.
 */
const LADOS_LOGO = [420, 340, 280, 220, 160];
const MAX_CARACTERES_LOGO = 380_000;

/**
 * Configuración de los sellos de los jefes de taller (solo Admin y Super Admin). Cada sello tiene nombre, apellido, un logo que
 * sale como marca de agua bajo la firma del jefe de taller y una contraseña, que se pide al calificar un informe.
 */
@Component({
  selector: 'app-sellos',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PasswordRequisitosComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold mb-2">
            <i-lucide name="pen-tool" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide>
            <span>Auditorías</span>
          </div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Configuración de sellos</h1>
          <p class="text-slate-500 text-xs mt-1 max-w-2xl">
            Un sello por jefe de taller: su nombre, el logo que sale como marca de agua bajo su firma y la contraseña que se le pide al
            calificar un informe de inspección. Quien elabora el informe solo ve el nombre.
          </p>
        </div>
        @if (puedeGestionar) {
          <button type="button" class="btn btn-cta w-full sm:w-auto" (click)="abrirNuevo()">
            <i-lucide name="plus" class="w-4 h-4" aria-hidden="true"></i-lucide> Nuevo sello
          </button>
        }
      </div>

      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 p-10 text-center text-sm text-slate-500" role="status">Cargando sellos…</div>
      } @else if (error) {
        <div class="estado-error" role="alert">{{ error }} <button type="button" class="underline font-bold" (click)="cargar()">Reintentar</button></div>
      } @else if (!sellos.length) {
        <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
          <i-lucide name="pen-tool" class="w-8 h-8 mx-auto text-slate-400" aria-hidden="true"></i-lucide>
          <p class="font-bold text-slate-800">Aún no hay sellos</p>
          <p class="text-sm text-slate-500">Crea el sello de cada jefe de taller para poder calificar y firmar informes.</p>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          @for (s of sellos; track s.id) {
            <article class="bg-white rounded-2xl border shadow-easydry p-5 space-y-4" [ngClass]="s.estado ? 'border-slate-100' : 'border-slate-200 opacity-75'">
              <div class="flex items-start gap-4">
                <div class="w-20 h-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                  @if (s.logo) { <img [src]="s.logo" [alt]="'Logo de ' + s.nombre" class="w-full h-full object-contain p-1"> }
                  @else { <i-lucide name="image" class="w-7 h-7 text-slate-300" aria-hidden="true"></i-lucide> }
                </div>
                <div class="min-w-0 flex-1">
                  <h2 class="font-extrabold text-slate-900 truncate">{{ s.nombre }} {{ s.apellido }}</h2>
                  <p class="text-xs text-slate-500 mt-0.5">{{ s.logo ? 'Con logo como marca de agua' : 'Sin logo' }}</p>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <span class="badge" [ngClass]="s.estado ? 'badge-ok' : 'badge-neutral'">{{ s.estado ? 'Activo' : 'Inactivo' }}</span>
                    @if (s.bloqueado) { <span class="badge badge-critical" title="Demasiados intentos con contraseña incorrecta. Asigna una contraseña nueva para desbloquearlo.">Bloqueado</span> }
                  </div>
                </div>
              </div>
              @if (puedeGestionar) {
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirEditar(s)"><i-lucide name="pencil" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Editar</button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="abrirPassword(s)"><i-lucide name="lock" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> Cambiar contraseña</button>
                  <button type="button" class="btn btn-secondary btn-sm" (click)="alternarEstado(s)" [disabled]="trabajando">
                    <i-lucide [name]="s.estado ? 'user-x' : 'user-check'" class="w-3.5 h-3.5" aria-hidden="true"></i-lucide> {{ s.estado ? 'Desactivar' : 'Activar' }}
                  </button>
                </div>
              }
            </article>
          }
        </div>
      }

      <app-modal [isOpen]="!!selloPass" [title]="'Cambiar contraseña · ' + (selloPass?.nombre ?? '') + ' ' + (selloPass?.apellido ?? '')" icon="lock" size="md" (close)="cerrarPassword()">
        <form class="space-y-4" (ngSubmit)="guardarPassword()" autocomplete="off">
          <p class="text-xs text-slate-600">La contraseña anterior deja de servir de inmediato. Si el sello estaba bloqueado por intentos fallidos, se desbloquea. Avísale al jefe de taller su contraseña nueva.</p>
          <div>
            <label class="field-label" for="sello-pass-nueva">Contraseña nueva *</label>
            <div class="relative">
              <input id="sello-pass-nueva" name="passNueva" [type]="verNueva ? 'text' : 'password'" class="field pr-11" [(ngModel)]="formPass.nueva" autocomplete="new-password">
              <button type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800 rounded-r-xl" (click)="verNueva = !verNueva" [attr.aria-label]="verNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <i-lucide [name]="verNueva ? 'eye-off' : 'eye'" class="w-4 h-4" aria-hidden="true"></i-lucide>
              </button>
            </div>
            <app-password-requisitos [password]="formPass.nueva"></app-password-requisitos>
          </div>
          <div>
            <label class="field-label" for="sello-pass-conf">Repite la contraseña nueva *</label>
            <div class="relative">
              <input id="sello-pass-conf" name="passConf" [type]="verConfirmacion ? 'text' : 'password'" class="field pr-11" [(ngModel)]="formPass.confirmacion" autocomplete="new-password">
              <button type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800 rounded-r-xl" (click)="verConfirmacion = !verConfirmacion" [attr.aria-label]="verConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <i-lucide [name]="verConfirmacion ? 'eye-off' : 'eye'" class="w-4 h-4" aria-hidden="true"></i-lucide>
              </button>
            </div>
            @if (formPass.confirmacion && formPass.confirmacion !== formPass.nueva) { <p class="text-xs font-semibold text-rose-600 mt-1">No coincide con la contraseña nueva.</p> }
          </div>
          @if (errorPass) { <p class="text-xs font-semibold text-rose-700" role="alert">{{ errorPass }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="cerrarPassword()">Cancelar</button>
            <button type="submit" class="btn btn-cta" [disabled]="trabajando">{{ trabajando ? 'Guardando…' : 'Cambiar contraseña' }}</button>
          </div>
        </form>
      </app-modal>

      <app-modal [isOpen]="modalAbierto" [title]="editandoId ? 'Editar sello' : 'Nuevo sello'" icon="pen-tool" size="md" (close)="cerrar()">
        <form class="space-y-4" (ngSubmit)="guardar()" autocomplete="off">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="field-label" for="sello-nombre">Nombre *</label>
              <input id="sello-nombre" name="nombre" class="field" [(ngModel)]="form.nombre" maxlength="80" autocomplete="off">
            </div>
            <div>
              <label class="field-label" for="sello-apellido">Apellido *</label>
              <input id="sello-apellido" name="apellido" class="field" [(ngModel)]="form.apellido" maxlength="80" autocomplete="off">
            </div>
          </div>

          <div>
            <label class="field-label" for="sello-logo">Logo (marca de agua bajo su firma)</label>
            <div class="flex items-center gap-4">
              <div class="w-24 h-24 shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                @if (form.logo) { <img [src]="form.logo" alt="Vista previa del logo" class="w-full h-full object-contain p-1" style="opacity: 0.6"> }
                @else { <i-lucide name="image" class="w-7 h-7 text-slate-300" aria-hidden="true"></i-lucide> }
              </div>
              <div class="space-y-2 min-w-0">
                <input id="sello-logo" type="file" accept="image/png,image/jpeg,image/webp" class="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-bold file:text-slate-700 hover:file:bg-slate-200" (change)="elegirLogo($event)">
                @if (form.logo) { <button type="button" class="text-xs font-bold text-rose-600 hover:underline" (click)="form.logo = ''">Quitar logo</button> }
                <p class="text-[11px] text-slate-500">PNG, JPG o WEBP. Se ajusta solo a un tamaño liviano. Se ve opaco debajo de la firma.</p>
              </div>
            </div>
          </div>

          @if (!editandoId) {
            <div>
              <label class="field-label" for="sello-pass">Contraseña *</label>
              <div class="relative">
              <input id="sello-pass" name="password" [type]="verPassword ? 'text' : 'password'" class="field pr-11" [(ngModel)]="form.password" autocomplete="new-password">
              <button type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-800 rounded-r-xl" (click)="verPassword = !verPassword" [attr.aria-label]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                <i-lucide [name]="verPassword ? 'eye-off' : 'eye'" class="w-4 h-4" aria-hidden="true"></i-lucide>
              </button>
            </div>
              <app-password-requisitos [password]="form.password"></app-password-requisitos>
            </div>
          } @else {
            <p class="text-[11px] text-slate-500">Para cambiar la contraseña usa el botón «Cambiar contraseña» de la tarjeta del sello.</p>
          }

          @if (errorForm) { <p class="text-xs font-semibold text-rose-700" role="alert">{{ errorForm }}</p> }
          <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button type="button" class="btn btn-secondary" (click)="cerrar()">Cancelar</button>
            <button type="submit" class="btn btn-cta" [disabled]="trabajando">{{ trabajando ? 'Guardando…' : (editandoId ? 'Guardar cambios' : 'Crear sello') }}</button>
          </div>
        </form>
      </app-modal>
    </div>
  `,
})
export class SellosComponent implements OnInit {
  private readonly api = inject(SellosService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly puedeGestionar = this.auth.puede('sellos.gestionar');

  sellos: SelloConfig[] = [];
  cargando = true;
  error = '';
  trabajando = false;
  modalAbierto = false;
  editandoId: string | null = null;
  errorForm = '';
  form = this.formVacio();
  verPassword = false;

  /** Cambio de contraseña de un sello: tiene su propio modal, aparte de la edición de nombre y logo. */
  selloPass: SelloConfig | null = null;
  formPass = { nueva: '', confirmacion: '' };
  errorPass = '';
  verNueva = false;
  verConfirmacion = false;

  private formVacio() {
    return { nombre: '', apellido: '', logo: '', password: '' };
  }

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      this.sellos = await firstValueFrom(this.api.listar());
    } catch (e) {
      this.error = mensajeError(e, 'No se pudieron cargar los sellos.');
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevo(): void {
    this.editandoId = null;
    this.verPassword = false;
    this.form = this.formVacio();
    this.errorForm = '';
    this.modalAbierto = true;
  }

  abrirEditar(s: SelloConfig): void {
    this.editandoId = s.id;
    this.form = { nombre: s.nombre, apellido: s.apellido, logo: s.logo ?? '', password: '' };
    this.errorForm = '';
    this.modalAbierto = true;
  }

  cerrar(): void {
    this.modalAbierto = false;
  }

  abrirPassword(s: SelloConfig): void {
    this.selloPass = s;
    this.formPass = { nueva: '', confirmacion: '' };
    this.errorPass = '';
    this.verNueva = false;
    this.verConfirmacion = false;
  }

  cerrarPassword(): void {
    this.selloPass = null;
  }

  async guardarPassword(): Promise<void> {
    const s = this.selloPass;
    if (!s) return;
    this.errorPass = '';
    const { nueva, confirmacion } = this.formPass;
    if (!nueva) { this.errorPass = 'Escribe la contraseña nueva.'; return; }
    const motivo = motivoPasswordDebil(nueva);
    if (motivo) { this.errorPass = motivo; return; }
    if (nueva !== confirmacion) { this.errorPass = 'Las dos contraseñas no coinciden.'; return; }
    this.trabajando = true;
    try {
      await firstValueFrom(this.api.editar(s.id, { password: nueva }));
      this.toast.success('Contraseña cambiada', `La contraseña de ${s.nombre} ${s.apellido} se actualizó.`);
      this.selloPass = null;
      await this.cargar();
    } catch (e) {
      this.errorPass = mensajeError(e, 'No se pudo cambiar la contraseña.');
    } finally {
      this.trabajando = false;
    }
  }

  /** Lee la imagen elegida y la achica en un lienzo: el logo guardado es liviano aunque el archivo original no lo sea. */
  async elegirLogo(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.errorForm = '';
    if (!/^image\/(png|jpeg|webp)$/.test(archivo.type)) { this.errorForm = 'El logo debe ser una imagen PNG, JPG o WEBP.'; return; }
    try {
      const origen = await new Promise<string>((ok, mal) => {
        const lector = new FileReader();
        lector.onload = () => ok(String(lector.result));
        lector.onerror = () => mal(lector.error);
        lector.readAsDataURL(archivo);
      });
      const img = await new Promise<HTMLImageElement>((ok, mal) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => mal(new Error('imagen no válida'));
        i.src = origen;
      });
      const logo = this.comprimirLogo(img);
      if (!logo) { this.errorForm = 'No se pudo reducir el logo a un tamaño aceptable. Prueba con una imagen más sencilla.'; return; }
      this.form.logo = logo;
    } catch {
      this.errorForm = 'No se pudo leer la imagen. Prueba con otra.';
    }
  }

  /** Devuelve el logo en data URL con el primer lado y formato que quepan bajo el tope, o null si ninguno cabe. */
  private comprimirLogo(img: HTMLImageElement): string | null {
    for (const lado of LADOS_LOGO) {
      const escala = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
      const lienzo = document.createElement('canvas');
      lienzo.width = Math.max(1, Math.round(img.naturalWidth * escala));
      lienzo.height = Math.max(1, Math.round(img.naturalHeight * escala));
      lienzo.getContext('2d')!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
      // PNG primero (conserva la transparencia); si pesa demasiado, WEBP y por último JPEG.
      for (const [tipo, calidad] of [['image/png', undefined], ['image/webp', 0.9], ['image/jpeg', 0.88]] as const) {
        const url = lienzo.toDataURL(tipo, calidad);
        if (url.startsWith(`data:${tipo}`) && url.length <= MAX_CARACTERES_LOGO) return url;
      }
    }
    return null;
  }

  async guardar(): Promise<void> {
    const f = this.form;
    this.errorForm = '';
    if (!f.nombre.trim() || !f.apellido.trim()) { this.errorForm = 'El nombre y el apellido son obligatorios.'; return; }
    if (!this.editandoId) {
      if (!f.password) { this.errorForm = 'La contraseña es obligatoria.'; return; }
      const motivo = motivoPasswordDebil(f.password);
      if (motivo) { this.errorForm = motivo; return; }
    }
    this.trabajando = true;
    try {
      if (this.editandoId) {
        await firstValueFrom(this.api.editar(this.editandoId, { nombre: f.nombre.trim(), apellido: f.apellido.trim(), logo: f.logo }));
        this.toast.success('Sello actualizado', `${f.nombre.trim()} ${f.apellido.trim()} se actualizó.`);
      } else {
        await firstValueFrom(this.api.crear({ nombre: f.nombre.trim(), apellido: f.apellido.trim(), logo: f.logo || undefined, password: f.password }));
        this.toast.success('Sello creado', `${f.nombre.trim()} ${f.apellido.trim()} ya puede firmar informes.`);
      }
      this.modalAbierto = false;
      await this.cargar();
    } catch (e) {
      this.errorForm = mensajeError(e, 'No se pudo guardar el sello.');
    } finally {
      this.trabajando = false;
    }
  }

  async alternarEstado(s: SelloConfig): Promise<void> {
    this.trabajando = true;
    try {
      await firstValueFrom(this.api.editar(s.id, { estado: s.estado ? 0 : 1 }));
      this.toast.success(s.estado ? 'Sello desactivado' : 'Sello activado', `${s.nombre} ${s.apellido}.`);
      await this.cargar();
    } catch (e) {
      this.toast.error('No se pudo cambiar el estado', mensajeError(e));
    } finally {
      this.trabajando = false;
    }
  }
}
