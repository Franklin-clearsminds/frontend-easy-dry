import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { Bahia, MaquinaFicha, Sucursal, TallerUbicacion } from '../../../core/models';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { BahiaService } from '../../../core/services/bahia.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { AuthService } from '../../../core/services/auth.service';
import { puedeEditarMaquina, puedeCambiarArchivosMaquina } from '../../../core/utils/maquinaria-permisos';
import { ToastService } from '../../../shared/services/toast.service';

import { mensajeError } from '../trabajo-acciones/trabajo-acciones.component';

/**
 * Roles que pueden quedar asignados como responsables de una máquina (mismo criterio del servidor,
 * ver `ROLES_OPERADOR` en `maquinaria.permisos.ts`): solo pulidores, fijos o móviles. El líder NO
 * entra aquí — ya ve y reporta toda la maquinaria de su agencia sin necesitar asignación individual.
 */
const ROLES_OPERADOR_MAQUINA = ['PULIDOR'];

interface DestinoOpcion {
  id: string;
  nombre: string;
  esTaller: boolean;
}

/**
 * Diálogos de acciones sobre la máquina: editar, dar de baja / reactivar, asignar operador, ventana de adelanto y
 * transferir (agencia, bahía o taller). Los permisos por rol se controlan en el host; el backend valida siempre.
 */
@Component({
  selector: 'app-maquina-acciones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, TecnicoSearchSelectComponent],
  template: `
    <!-- ================= EDITAR ================= -->
    <app-modal [isOpen]="edi.open" [title]="'Editar máquina: ' + edi.codigo" icon="pencil" size="md" zClass="z-[10100]" (close)="edi.open = false">
      @if (edi.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-500">Aquí no se cambia la ubicación (agencia/bahía): para eso usa <strong>Transferir</strong>. Cada cambio queda en la línea de tiempo.</p>
          @if (puedeEditarDatos) {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label for="ma-edi-nombre" class="field-label">Nombre</label>
              <input id="ma-edi-nombre" type="text" [(ngModel)]="edi.nombre" name="edi-nombre" class="field"></div>
            <div><label for="ma-edi-tipo" class="field-label">Tipo</label>
              <input id="ma-edi-tipo" type="text" [(ngModel)]="edi.tipo" name="edi-tipo" class="field"></div>
            <div><label for="ma-edi-marca" class="field-label">Marca</label>
              <input id="ma-edi-marca" type="text" [(ngModel)]="edi.marca" name="edi-marca" class="field"></div>
            <div><label for="ma-edi-modelo" class="field-label">Modelo</label>
              <input id="ma-edi-modelo" type="text" [(ngModel)]="edi.modelo" name="edi-modelo" class="field"></div>
            <div><label for="ma-edi-serie" class="field-label">Serie</label>
              <input id="ma-edi-serie" type="text" [(ngModel)]="edi.serie" name="edi-serie" class="field"></div>
            <div><label for="ma-edi-horas" class="field-label">Horas de uso</label>
              <input id="ma-edi-horas" type="number" min="0" [(ngModel)]="edi.horasUso" name="edi-horas" class="field"></div>
          </div>
          }
          @if (puedeArchivos) {
          <div class="space-y-4">
            <div>
              <label for="ma-edi-foto" class="field-label">Reemplazar foto (opcional)</label>
              <input id="ma-edi-foto" type="file" accept="image/*" (change)="edi.foto = $any($event.target).files?.[0] || null" class="w-full text-xs">
            </div>
            <div>
              <label for="ma-edi-ficha" class="field-label">Reemplazar ficha técnica (imagen, opcional)</label>
              <input id="ma-edi-ficha" type="file" accept="image/*" (change)="edi.ficha = $any($event.target).files?.[0] || null" class="w-full text-xs">
            </div>
          </div>
          }
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="edi.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarEdicion()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">
          {{ enviando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ACTIVAR / DESACTIVAR ================= -->
    <app-modal [isOpen]="act.open" [title]="act.activar ? 'Reactivar máquina' : 'Dar de baja la máquina'" [icon]="act.activar ? 'check-circle-2' : 'x-circle'" size="sm" zClass="z-[10100]" (close)="act.open = false">
      @if (act.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-700"><strong>{{ act.codigo }} — {{ act.nombre }}</strong></p>
          @if (act.activar) {
            <p class="text-xs text-slate-600">La máquina volverá a estar activa y podrá recibir incidencias y mantenimientos.</p>
          } @else {
            <p class="text-xs text-slate-600">Dar de baja es reversible: la máquina deja de estar activa pero conserva todo su historial.</p>
            <div>
              <label for="ma-act-motivo" class="field-label">Motivo (obligatorio)</label>
              <textarea id="ma-act-motivo" [(ngModel)]="act.motivo" name="act-motivo" rows="3" class="field font-medium" placeholder="Ej: equipo obsoleto, daño irreparable..."></textarea>
            </div>
          }
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="act.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarActivacion()" [disabled]="enviando"
          class="btn w-full sm:w-auto"
          [ngClass]="act.activar ? 'btn-primary' : 'btn-danger'">
          {{ act.activar ? 'Reactivar' : 'Dar de baja' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ASIGNAR OPERADOR ================= -->
    <!-- ================= VENTANA DE ADELANTO ================= -->
    <app-modal [isOpen]="ven.open" title="Ventana de adelanto de mantenimiento" icon="calendar-clock" size="sm" zClass="z-[10100]" (close)="ven.open = false">
      @if (ven.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-700"><strong>{{ ven.codigo }} — {{ ven.nombre }}</strong></p>
          <p class="text-xs text-slate-500">Cuánto tiempo antes de la fecha programada se puede ejecutar un mantenimiento. Si falta más que esta ventana, el servidor lo bloquea.</p>
          <div class="grid grid-cols-2 gap-4">
            <div><label for="ma-ven-sem" class="field-label">Semanas</label>
              <input id="ma-ven-sem" type="number" min="0" [(ngModel)]="ven.semanas" name="ven-sem" class="field"></div>
            <div><label for="ma-ven-dias" class="field-label">Días</label>
              <input id="ma-ven-dias" type="number" min="0" [(ngModel)]="ven.dias" name="ven-dias" class="field"></div>
          </div>
          <p class="text-xs font-bold text-slate-700">Total: {{ (ven.semanas || 0) * 7 + (ven.dias || 0) }} día(s)</p>
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="ven.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarVentana()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">Guardar</button>
      </div>
    </app-modal>

    <!-- ================= TRANSFERIR ================= -->
    <app-modal [isOpen]="tra.open" [title]="'Transferir / Asignar: ' + tra.codigo" icon="refresh-cw" size="md" zClass="z-[10100]" (close)="tra.open = false">
      @if (tra.open) {
        <div class="space-y-4">
          <div class="p-3 bg-slate-50 rounded-xl border text-xs break-words">
            <p class="font-bold text-slate-800">Ubicación actual</p>
            <p class="text-slate-600">{{ tra.origen }}</p>
          </div>
          <p class="text-xs text-slate-500">Elige a dónde va la máquina: otra agencia/taller, o directamente a un pulidor fijo o móvil (queda como su responsable, para reportar y trabajar con ella).</p>

          <div class="flex bg-slate-100 rounded-xl p-1 gap-1">
            <button type="button" (click)="cambiarTipoDestino('AGENCIA')"
              class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
              [ngClass]="tra.tipo === 'AGENCIA' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500'">
              Agencia / Taller
            </button>
            <button type="button" (click)="cambiarTipoDestino('PULIDOR')"
              class="flex-1 py-2 rounded-lg text-xs font-bold transition-colors"
              [ngClass]="tra.tipo === 'PULIDOR' ? 'bg-white text-easydry-blue shadow-sm' : 'text-slate-500'">
              Pulidor
            </button>
          </div>

          @if (tra.tipo === 'AGENCIA') {
            <div class="space-y-4">
              <div>
                <label class="field-label">Agencia o taller destino</label>
                <app-tecnico-search-select [tecnicos]="destinosBuscables" placeholder="Buscar agencia o taller..."
                  vacioTexto="No hay agencias o talleres que coincidan."
                  [selectedId]="tra.destino" (selected)="onSeleccionAgencia($event)"></app-tecnico-search-select>
              </div>
              <div>
                <label for="ma-tra-bahia" class="field-label">Bahía destino (opcional)</label>
                <select id="ma-tra-bahia" [(ngModel)]="tra.bahiaId" name="tra-bahia" class="field select-chevron font-semibold">
                  <option value="">Sin bahía</option>
                  @for (b of tra.bahias; track b.id) { <option [value]="b.id">{{ b.nombre }}</option> }
                </select>
              </div>
              <div>
                <label for="ma-tra-motivo" class="field-label">Motivo (obligatorio)</label>
                <input id="ma-tra-motivo" type="text" [(ngModel)]="tra.motivo" name="tra-motivo" class="field" placeholder="Ej: mantenimiento correctivo en taller">
              </div>
            </div>
          } @else {
            <div>
              @if (tra.ficha?.operadorAsignado) {
                <div class="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-800 mb-3" role="status">
                  Responsable actual: <strong>{{ tra.ficha?.operadorAsignado?.nombre }}</strong>
                </div>
              }
              <label class="field-label">Pulidor responsable (fijo o móvil)</label>
              <app-tecnico-search-select [tecnicos]="tra.pulidores" placeholder="Buscar pulidor..."
                vacioTexto="No hay pulidores que coincidan."
                [selectedId]="tra.destino" (selected)="onSeleccionPulidor($event)"></app-tecnico-search-select>
              @if (tra.pulidores.length === 0) {
                <p class="text-xs text-slate-500 mt-1">No hay pulidores disponibles para la agencia o región de esta máquina.</p>
              }
            </div>
          }
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        @if (tra.tipo === 'PULIDOR' && tra.ficha?.operadorAsignado) {
          <button type="button" (click)="quitarAsignacion()" [disabled]="enviando" class="btn btn-danger w-full sm:w-auto">Quitar asignación</button>
        }
        <button type="button" (click)="tra.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarTransferencia()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">{{ tra.tipo === 'PULIDOR' ? 'Confirmar asignación' : 'Confirmar transferencia' }}</button>
      </div>
    </app-modal>
  `,
})
export class MaquinaAccionesComponent {
  private maquinariaService = inject(MaquinariaService);
  private authPermisos = inject(AuthService);
  get puedeEditarDatos(): boolean { return puedeEditarMaquina(this.authPermisos); }
  get puedeArchivos(): boolean { return puedeCambiarArchivosMaquina(this.authPermisos); }
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private usuarioService = inject(UsuarioService);
  private storage = inject(StorageUploadService);
  private toast = inject(ToastService);

  /** Se emite tras una acción exitosa: el host recarga la ficha y sus listas. */
  @Output() hecho = new EventEmitter<string>();

  enviando = false;
  error = '';
  destinos: DestinoOpcion[] = [];

  edi = { open: false, id: '', codigo: '', nombre: '', tipo: '', marca: '', modelo: '', serie: '', horasUso: 0, foto: null as File | null, ficha: null as File | null };
  act = { open: false, id: '', codigo: '', nombre: '', activar: false, motivo: '' };
  ven = { open: false, id: '', codigo: '', nombre: '', semanas: 0, dias: 0 };
  tra = {
    open: false, id: '', codigo: '', origen: '', tipo: 'AGENCIA' as 'AGENCIA' | 'PULIDOR', destino: '', bahiaId: '', motivo: '',
    bahias: [] as Bahia[], pulidores: [] as TecnicoOpcion[], ficha: null as MaquinaFicha | null,
  };

  /** Agencias/talleres en el mismo formato del buscador (reutiliza `app-tecnico-search-select`). */
  get destinosBuscables(): TecnicoOpcion[] {
    return this.destinos.map(d => ({ id: d.id, nombre: d.nombre, rolLabel: d.esTaller ? 'Taller' : 'Agencia' }));
  }

  private reset(): void {
    this.error = '';
    this.enviando = false;
  }

  private ok(titulo: string, detalle: string, evento: string): void {
    this.toast.success(titulo, detalle);
    this.hecho.emit(evento);
  }

  // ---- Editar ----
  editar(f: MaquinaFicha): void {
    this.reset();
    this.edi = {
      open: true, id: f.id, codigo: f.codigo, nombre: f.nombre, tipo: f.tipo || '', marca: f.marca || '',
      modelo: f.modelo || '', serie: f.serie || '', horasUso: f.horasUso || 0, foto: null, ficha: null,
    };
  }

  async confirmarEdicion(): Promise<void> {
    this.error = '';
    if (!this.edi.nombre.trim()) { this.error = 'El nombre es obligatorio.'; return; }
    this.enviando = true;
    try {
      let fotoUrl: string | undefined;
      let fichaTecnicaUrl: string | undefined;
      if (this.edi.foto) {
        fotoUrl = await this.storage.uploadMedia(this.edi.foto, {
          category: 'MAQUINARIA_IMAGEN', type: 'FOTO_MAQUINA', maquinariaId: this.edi.id, maquinariaNombre: this.edi.nombre,
          maquinariaCodigo: this.edi.codigo, fileName: this.edi.foto.name, contentType: this.edi.foto.type || 'image/jpeg',
        });
      }
      if (this.edi.ficha) {
        fichaTecnicaUrl = await this.storage.uploadMedia(this.edi.ficha, {
          category: 'MAQUINARIA_FICHA', type: 'FICHA_TECNICA', maquinariaId: this.edi.id, maquinariaNombre: this.edi.nombre,
          maquinariaCodigo: this.edi.codigo, fileName: this.edi.ficha.name, contentType: this.edi.ficha.type || 'image/jpeg',
        });
      }
      await firstValueFrom(this.maquinariaService.actualizarMaquina(this.edi.id, {
        nombre: this.edi.nombre.trim(),
        tipo: this.edi.tipo.trim() || undefined,
        marca: this.edi.marca.trim(),
        modelo: this.edi.modelo.trim(),
        serie: this.edi.serie.trim(),
        horasUso: Number(this.edi.horasUso || 0),
        fotoUrl,
        fichaTecnicaUrl,
      }));
      this.edi.open = false;
      this.ok('Máquina actualizada', `${this.edi.codigo} se guardó correctamente.`, 'MAQUINA_EDITADA');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ---- Activar / desactivar ----
  cambiarActiva(f: MaquinaFicha, activar: boolean): void {
    this.reset();
    this.act = { open: true, id: f.id, codigo: f.codigo, nombre: f.nombre, activar, motivo: '' };
  }

  async confirmarActivacion(): Promise<void> {
    this.error = '';
    if (!this.act.activar && !this.act.motivo.trim()) { this.error = 'El motivo es obligatorio para dar de baja la máquina.'; return; }
    this.enviando = true;
    try {
      await firstValueFrom(this.maquinariaService.setActiva(this.act.id, this.act.activar, this.act.motivo));
      this.act.open = false;
      this.ok(this.act.activar ? 'Máquina reactivada' : 'Máquina dada de baja', this.act.codigo,
        this.act.activar ? 'MAQUINA_ACTIVADA' : 'MAQUINA_DESACTIVADA');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ---- Operador ----
  /**
   * Pulidores (fijos o móviles), nunca líderes: el líder ya ve y reporta toda la maquinaria de su
   * agencia por ser líder, no necesita asignación individual. `getUsuarios()` ya llega filtrada por
   * el alcance del usuario que pide el listado (`usuarios.ver`): el admin ve pulidores de todo el
   * país; el coordinador de mantenimiento, solo los de su región — y el backend de
   * `asignar-operador` rechaza igual cualquier intento de asignar fuera de esa región. Con etiqueta
   * clara (Fijo/Móvil · agencia o región) para no confundirlos.
   */
  private async cargarOpcionesOperador(): Promise<TecnicoOpcion[]> {
    try {
      const usuarios = await firstValueFrom(this.usuarioService.getUsuarios(true, true));
      return (usuarios || [])
        .filter(u => ROLES_OPERADOR_MAQUINA.includes(String(u.rolNombre || '').toUpperCase()))
        .map(u => {
          const esFijo = u.modalidadPulidor === 'FIJO' || !!u.agenciaId;
          const sede = u.agenciaId ? (u.agencia || 'sede fija') : (u.region || 'zona');
          const rolLabel = `${esFijo ? 'Pulidor Fijo' : 'Pulidor Móvil'} · ${sede}`;
          return { id: String(u.id), nombre: `${u.nombre} ${u.apellido}`.trim(), email: u.email, rolLabel };
        });
    } catch {
      return [];
    }
  }

  /** Quita al pulidor responsable de la máquina, desde el propio modal "Transferir / Asignar". */
  async quitarAsignacion(): Promise<void> {
    this.error = '';
    this.enviando = true;
    try {
      await firstValueFrom(this.maquinariaService.asignarOperador(this.tra.id, null));
      this.tra.open = false;
      this.ok('Asignación quitada', this.tra.codigo, 'OPERADOR_ASIGNADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ---- Ventana de adelanto ----
  configurarVentana(f: MaquinaFicha): void {
    this.reset();
    const total = f.ventanaAdelantoDias || 0;
    this.ven = { open: true, id: f.id, codigo: f.codigo, nombre: f.nombre, semanas: Math.floor(total / 7), dias: total % 7 };
  }

  async confirmarVentana(): Promise<void> {
    this.error = '';
    if ((this.ven.semanas || 0) < 0 || (this.ven.dias || 0) < 0) { this.error = 'Los valores no pueden ser negativos.'; return; }
    this.enviando = true;
    try {
      await firstValueFrom(this.maquinariaService.configurarVentanaAdelanto(this.ven.id, Number(this.ven.dias || 0), Number(this.ven.semanas || 0)));
      this.ven.open = false;
      this.ok('Ventana actualizada', `${this.ven.codigo}: ${(this.ven.semanas || 0) * 7 + (this.ven.dias || 0)} día(s) de adelanto.`, 'VENTANA_ADELANTO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ---- Transferir / Asignar (un solo destino: agencia, taller o pulidor) ----
  async transferir(f: MaquinaFicha): Promise<void> {
    this.reset();
    const [sucursales, talleres, pulidores] = await Promise.all([
      firstValueFrom(this.sucursalService.getSucursales()).catch(() => [] as Sucursal[]),
      firstValueFrom(this.maquinariaService.getTalleres()).catch(() => [] as TallerUbicacion[]),
      this.cargarOpcionesOperador(),
    ]);
    const mapa = new Map<string, DestinoOpcion>();
    talleres.forEach(t => mapa.set(String(t.id), { id: String(t.id), nombre: t.nombre, esTaller: true }));
    sucursales.forEach(s => {
      if (!mapa.has(String(s.id))) mapa.set(String(s.id), { id: String(s.id), nombre: s.nombre, esTaller: false });
    });
    this.destinos = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.tra = {
      open: true, id: f.id, codigo: f.codigo, origen: `${f.agenciaNombre || 'Sin agencia'} — ${f.bahiaNombre || 'Sin bahía'}`,
      tipo: 'AGENCIA', destino: '', bahiaId: '', motivo: '', bahias: [], pulidores, ficha: f,
    };
  }

  /** Cambia el switch Agencia/Pulidor: limpia el destino elegido (son listas distintas). */
  cambiarTipoDestino(tipo: 'AGENCIA' | 'PULIDOR'): void {
    if (this.tra.tipo === tipo) return;
    this.tra.tipo = tipo;
    this.tra.destino = '';
    this.tra.bahiaId = '';
    this.tra.bahias = [];
    this.error = '';
  }

  async onSeleccionAgencia(op: TecnicoOpcion | null): Promise<void> {
    this.tra.destino = op ? String(op.id) : '';
    this.tra.bahiaId = '';
    this.tra.bahias = [];
    if (!this.tra.destino) return;
    try {
      this.tra.bahias = await firstValueFrom(this.bahiaService.getBahiasPorSucursal(this.tra.destino));
    } catch { /* sin bahías */ }
  }

  onSeleccionPulidor(op: TecnicoOpcion | null): void {
    this.tra.destino = op ? String(op.id) : '';
  }

  async confirmarTransferencia(): Promise<void> {
    this.error = '';
    if (!this.tra.destino) {
      this.error = this.tra.tipo === 'PULIDOR' ? 'Selecciona el pulidor responsable.' : 'Selecciona la agencia o taller de destino.';
      return;
    }
    this.enviando = true;
    try {
      if (this.tra.tipo === 'PULIDOR') {
        const pulidor = this.tra.pulidores.find(p => String(p.id) === this.tra.destino);
        await firstValueFrom(this.maquinariaService.asignarOperador(this.tra.id, this.tra.destino));
        this.tra.open = false;
        this.ok('Operador asignado', `${this.tra.codigo} quedó a cargo de ${pulidor?.nombre || 'el pulidor elegido'}.`, 'OPERADOR_ASIGNADO');
      } else {
        if (!this.tra.motivo.trim()) { this.error = 'Indica el motivo de la transferencia.'; this.enviando = false; return; }
        await firstValueFrom(this.maquinariaService.transferirMaquinaria({
          maquinariaId: this.tra.id,
          destinoAgenciaId: this.tra.destino,
          destinoBahiaId: this.tra.bahiaId || undefined,
          motivo: this.tra.motivo.trim(),
        }));
        this.tra.open = false;
        this.ok('Transferencia exitosa', `${this.tra.codigo} fue trasladada.`, 'MOVIMIENTO');
      }
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }
}
