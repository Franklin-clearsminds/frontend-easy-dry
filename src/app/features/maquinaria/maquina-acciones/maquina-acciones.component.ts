import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { Bahia, MaquinaFicha, Sucursal, TallerUbicacion } from '../../../core/models';
import { ROLE_LABELS } from '../../../core/models/roles.model';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { SucursalService } from '../../../core/services/sucursal.service';
import { BahiaService } from '../../../core/services/bahia.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { ToastService } from '../../../shared/services/toast.service';
import { ROLES_OPERADOR_MAQUINA } from '../../../core/utils/maquinaria-permisos';
import { mensajeError } from '../trabajo-acciones/trabajo-acciones.component';

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
    <app-modal [isOpen]="edi.open" [title]="'Editar máquina: ' + edi.codigo" icon="pencil" zClass="z-[10100]" (close)="edi.open = false">
      @if (edi.open) {
        <div class="space-y-4">
          <p class="text-[11px] text-slate-500">Aquí no se cambia la ubicación (agencia/bahía): para eso usa <strong>Transferir</strong>. Cada cambio queda en la línea de tiempo.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
              <input type="text" [(ngModel)]="edi.nombre" name="edi-nombre" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
              <input type="text" [(ngModel)]="edi.tipo" name="edi-tipo" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Marca</label>
              <input type="text" [(ngModel)]="edi.marca" name="edi-marca" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Modelo</label>
              <input type="text" [(ngModel)]="edi.modelo" name="edi-modelo" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Serie</label>
              <input type="text" [(ngModel)]="edi.serie" name="edi-serie" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Horas de uso</label>
              <input type="number" min="0" [(ngModel)]="edi.horasUso" name="edi-horas" class="w-full p-2.5 border rounded-xl text-sm"></div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Reemplazar foto (opcional)</label>
              <input type="file" accept="image/*" (change)="edi.foto = $any($event.target).files?.[0] || null" class="w-full text-xs">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Reemplazar ficha técnica (imagen, opcional)</label>
              <input type="file" accept="image/*" (change)="edi.ficha = $any($event.target).files?.[0] || null" class="w-full text-xs">
            </div>
          </div>
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="edi.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarEdicion()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">
          {{ enviando ? 'Guardando...' : 'Guardar cambios' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ACTIVAR / DESACTIVAR ================= -->
    <app-modal [isOpen]="act.open" [title]="act.activar ? 'Reactivar máquina' : 'Dar de baja la máquina'" [icon]="act.activar ? 'check-circle-2' : 'x-circle'" zClass="z-[10100]" (close)="act.open = false">
      @if (act.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-700"><strong>{{ act.codigo }} — {{ act.nombre }}</strong></p>
          @if (act.activar) {
            <p class="text-xs text-slate-600">La máquina volverá a estar activa y podrá recibir incidencias y mantenimientos.</p>
          } @else {
            <p class="text-xs text-slate-600">Dar de baja es reversible: la máquina deja de estar activa pero conserva todo su historial.</p>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo (obligatorio)</label>
              <textarea [(ngModel)]="act.motivo" name="act-motivo" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium" placeholder="Ej: equipo obsoleto, daño irreparable..."></textarea>
            </div>
          }
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="act.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarActivacion()" [disabled]="enviando"
          class="px-4 py-2 font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60 text-white"
          [ngClass]="act.activar ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'">
          {{ act.activar ? 'Reactivar' : 'Dar de baja' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ASIGNAR OPERADOR ================= -->
    <app-modal [isOpen]="ope.open" title="Asignar operador responsable" icon="user-cog" zClass="z-[10100]" (close)="ope.open = false">
      @if (ope.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-700"><strong>{{ ope.codigo }} — {{ ope.nombre }}</strong></p>
          @if (ope.actual) {
            <div class="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-xs text-cyan-800">Operador actual: <strong>{{ ope.actual }}</strong></div>
          }
          <p class="text-[11px] text-slate-500">Solo pulidores y líderes operadores de la región de la máquina. Solo el operador asignado podrá reportar incidencias.</p>
          <app-tecnico-search-select [tecnicos]="ope.opciones" placeholder="Buscar pulidor o líder..." (selected)="ope.elegido = $event ? '' + $event.id : ''"></app-tecnico-search-select>
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        @if (ope.actual) {
          <button (click)="confirmarOperador(null)" [disabled]="enviando" class="px-4 py-2 bg-rose-50 text-rose-800 border border-rose-200 font-bold rounded-xl text-xs cursor-pointer">Quitar asignación</button>
        }
        <button (click)="ope.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarOperador(ope.elegido)" [disabled]="enviando || !ope.elegido" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50">Asignar</button>
      </div>
    </app-modal>

    <!-- ================= VENTANA DE ADELANTO ================= -->
    <app-modal [isOpen]="ven.open" title="Ventana de adelanto de mantenimiento" icon="calendar-clock" zClass="z-[10100]" (close)="ven.open = false">
      @if (ven.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-700"><strong>{{ ven.codigo }} — {{ ven.nombre }}</strong></p>
          <p class="text-[11px] text-slate-500">Cuánto tiempo antes de la fecha programada se puede ejecutar un mantenimiento. Si falta más que esta ventana, el servidor lo bloquea.</p>
          <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Semanas</label>
              <input type="number" min="0" [(ngModel)]="ven.semanas" name="ven-sem" class="w-full p-2.5 border rounded-xl text-sm"></div>
            <div><label class="block text-xs font-bold text-slate-700 uppercase mb-1">Días</label>
              <input type="number" min="0" [(ngModel)]="ven.dias" name="ven-dias" class="w-full p-2.5 border rounded-xl text-sm"></div>
          </div>
          <p class="text-xs font-bold text-slate-700">Total: {{ (ven.semanas || 0) * 7 + (ven.dias || 0) }} día(s)</p>
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="ven.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarVentana()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">Guardar</button>
      </div>
    </app-modal>

    <!-- ================= TRANSFERIR ================= -->
    <app-modal [isOpen]="tra.open" [title]="'Transferir máquina: ' + tra.codigo" icon="refresh-cw" zClass="z-[10100]" (close)="tra.open = false">
      @if (tra.open) {
        <div class="space-y-4">
          <div class="p-3 bg-slate-50 rounded-xl border text-xs">
            <p class="font-bold text-slate-800">Ubicación actual</p>
            <p class="text-slate-600">{{ tra.origen }}</p>
          </div>
          <p class="text-[11px] text-slate-500">Sirve para mover a otra agencia, a otra bahía de la misma agencia o a un taller.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Agencia / taller destino</label>
              <select [(ngModel)]="tra.agenciaId" (ngModelChange)="onCambioAgenciaDestino()" name="tra-ag" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white">
                <option value="" disabled>Seleccione destino</option>
                @for (d of destinos; track d.id) { <option [value]="d.id">{{ d.nombre }}{{ d.esTaller ? ' (Taller)' : '' }}</option> }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía destino (opcional)</label>
              <select [(ngModel)]="tra.bahiaId" name="tra-bahia" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white">
                <option value="">Sin bahía</option>
                @for (b of tra.bahias; track b.id) { <option [value]="b.id">{{ b.nombre }}</option> }
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo (obligatorio)</label>
            <input type="text" [(ngModel)]="tra.motivo" name="tra-motivo" class="w-full p-2.5 border rounded-xl text-sm" placeholder="Ej: mantenimiento correctivo en taller">
          </div>
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="tra.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarTransferencia()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">Confirmar transferencia</button>
      </div>
    </app-modal>
  `,
})
export class MaquinaAccionesComponent {
  private maquinariaService = inject(MaquinariaService);
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
  ope = { open: false, id: '', codigo: '', nombre: '', actual: '', elegido: '', opciones: [] as TecnicoOpcion[] };
  ven = { open: false, id: '', codigo: '', nombre: '', semanas: 0, dias: 0 };
  tra = { open: false, id: '', codigo: '', origen: '', agenciaId: '', bahiaId: '', motivo: '', bahias: [] as Bahia[] };

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
  async asignarOperador(f: MaquinaFicha): Promise<void> {
    this.reset();
    let opciones: TecnicoOpcion[] = [];
    try {
      const usuarios = await firstValueFrom(this.usuarioService.getUsuarios(true, true));
      opciones = (usuarios || [])
        .filter(u => ROLES_OPERADOR_MAQUINA.includes(String(u.rolNombre || '').toUpperCase()))
        .filter(u => !f.regionId || !u.regionId || String(u.regionId) === String(f.regionId))
        .map(u => ({ id: String(u.id), nombre: `${u.nombre} ${u.apellido}`.trim(), email: u.email, rolLabel: ROLE_LABELS[u.rolNombre || ''] || u.rol }));
    } catch { /* la lista queda vacía */ }
    this.ope = { open: true, id: f.id, codigo: f.codigo, nombre: f.nombre, actual: f.operadorAsignado?.nombre || '', elegido: '', opciones };
  }

  async confirmarOperador(operadorId: string | null): Promise<void> {
    this.error = '';
    this.enviando = true;
    try {
      await firstValueFrom(this.maquinariaService.asignarOperador(this.ope.id, operadorId || null));
      this.ope.open = false;
      this.ok(operadorId ? 'Operador asignado' : 'Asignación quitada', this.ope.codigo, 'OPERADOR_ASIGNADO');
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

  // ---- Transferir ----
  async transferir(f: MaquinaFicha): Promise<void> {
    this.reset();
    const [sucursales, talleres] = await Promise.all([
      firstValueFrom(this.sucursalService.getSucursales()).catch(() => [] as Sucursal[]),
      firstValueFrom(this.maquinariaService.getTalleres()).catch(() => [] as TallerUbicacion[]),
    ]);
    const mapa = new Map<string, DestinoOpcion>();
    talleres.forEach(t => mapa.set(String(t.id), { id: String(t.id), nombre: t.nombre, esTaller: true }));
    sucursales.forEach(s => {
      if (!mapa.has(String(s.id))) mapa.set(String(s.id), { id: String(s.id), nombre: s.nombre, esTaller: false });
    });
    this.destinos = [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.tra = {
      open: true, id: f.id, codigo: f.codigo, origen: `${f.agenciaNombre || 'Sin agencia'} — ${f.bahiaNombre || 'Sin bahía'}`,
      agenciaId: '', bahiaId: '', motivo: '', bahias: [],
    };
  }

  async onCambioAgenciaDestino(): Promise<void> {
    this.tra.bahiaId = '';
    this.tra.bahias = [];
    if (!this.tra.agenciaId) return;
    try {
      this.tra.bahias = await firstValueFrom(this.bahiaService.getBahiasPorSucursal(this.tra.agenciaId));
    } catch { /* sin bahías */ }
  }

  async confirmarTransferencia(): Promise<void> {
    this.error = '';
    if (!this.tra.agenciaId) { this.error = 'Selecciona la agencia o taller de destino.'; return; }
    if (!this.tra.motivo.trim()) { this.error = 'Indica el motivo de la transferencia.'; return; }
    this.enviando = true;
    try {
      await firstValueFrom(this.maquinariaService.transferirMaquinaria({
        maquinariaId: this.tra.id,
        destinoAgenciaId: this.tra.agenciaId,
        destinoBahiaId: this.tra.bahiaId || undefined,
        motivo: this.tra.motivo.trim(),
      }));
      this.tra.open = false;
      this.ok('Transferencia exitosa', `${this.tra.codigo} fue trasladada.`, 'MOVIMIENTO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }
}
