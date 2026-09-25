import { Component, EventEmitter, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { firstValueFrom } from 'rxjs';
import { Incidente, Mantenimiento, Maquinaria, TallerUbicacion, FRECUENCIAS_MANTENIMIENTO, EvidenciaMaquinaria } from '../../../core/models';
import { ROLE_LABELS } from '../../../core/models/roles.model';
import { IncidenteService } from '../../../core/services/incidente.service';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { UsuarioService } from '../../../core/services/usuario.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { EvidenciaSelectorComponent } from '../../../shared/components/evidencia-selector/evidencia-selector.component';
import { ToastService } from '../../../shared/services/toast.service';

/** Mensaje de error del backend tal cual (400/403...) o el del propio cliente. */
export function mensajeError(err: any): string {
  const m = err?.error?.message;
  if (m) return Array.isArray(m) ? m.join(', ') : String(m);
  if (err?.status === 0) return 'No se pudo conectar con el servidor.';
  return err?.message || 'No se pudo completar la acción.';
}

const TIPOS_FALLA = [
  'Falla eléctrica', 'Fuga de agua', 'Problema hidráulico', 'Baja presión',
  'Manguera dañada', 'Desgaste', 'Rotura de pieza', 'Otro',
];

/**
 * Diálogos de trabajo sobre incidencias y mantenimientos de maquinaria: reportar, asignar, resolver, editar,
 * programar, ejecutar y agregar evidencia. Reutilizable desde el modal de detalle, Taller Técnico y Maquinaria:
 * el host lo incluye con `<app-trabajo-acciones (hecho)="recargar()">` y llama a sus métodos públicos.
 * Los permisos por rol se controlan en el host (botones); el backend valida siempre.
 */
@Component({
  selector: 'app-trabajo-acciones',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, TecnicoSearchSelectComponent, EvidenciaSelectorComponent],
  template: `
    <!-- ================= REPORTAR INCIDENCIA ================= -->
    <app-modal [isOpen]="rep.open" title="Reportar incidencia" icon="alert-triangle" zClass="z-[10100]" (close)="rep.open = false">
      @if (rep.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600">Equipo: <strong>{{ rep.maquinaCodigo }} — {{ rep.maquinaNombre }}</strong></p>
          <p class="text-[11px] text-slate-500">Requiere conexión. Solo puedes reportar máquinas asignadas a ti. Se exige 1 o más fotos/videos y exactamente 1 PDF.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de falla</label>
              <select [(ngModel)]="rep.titulo" name="rep-titulo" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                @for (t of tiposFalla; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Gravedad</label>
              <select [(ngModel)]="rep.gravedad" name="rep-gravedad" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción del problema</label>
            <textarea [(ngModel)]="rep.descripcion" name="rep-desc" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium"
              placeholder="Describa síntomas, ruidos, fugas..."></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Enviar a taller (opcional)</label>
            <select [(ngModel)]="rep.destinoTallerId" name="rep-taller" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
              <option value="">Sin taller (se atiende en sitio)</option>
              @for (t of talleres; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
            </select>
          </div>

          <app-evidencia-selector #selReportar
            contexto="INCIDENTE" fase="reporte"
            [maquinariaCodigo]="rep.maquinaCodigo" [maquinariaId]="rep.maquinaId"
            [clientUuid]="rep.clientUuid" [exigirCompleta]="true" [deshabilitado]="enviando">
          </app-evidencia-selector>

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="rep.open = false" [disabled]="enviando" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarReporte()" [disabled]="enviando" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer disabled:opacity-60">
          {{ enviando ? 'Enviando...' : 'Reportar incidencia' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ASIGNAR (incidencia o mantenimiento) ================= -->
    <app-modal [isOpen]="asg.open" [title]="asg.tipo === 'INCIDENTE' ? 'Asignar incidencia' : 'Asignar mantenimiento'" icon="user-cog" zClass="z-[10100]" (close)="asg.open = false">
      @if (asg.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600"><strong class="text-slate-900">{{ asg.titulo }}</strong></p>
          @if (asg.actualNombre) {
            <div class="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">Asignado actualmente a: <strong>{{ asg.actualNombre }}</strong></div>
          }
          <p class="text-[11px] text-slate-500">Solo aparecen técnicos y coordinadores de mantenimiento de la región de la máquina.</p>

          @if (esCoordinador) {
            <button type="button" (click)="confirmarAsignacion(undefined)" [disabled]="enviando"
              class="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
              <i-lucide name="wrench" class="w-4 h-4"></i-lucide>
              Asignármelo a mí (coordinador)
            </button>
          }

          <p class="text-[10px] font-bold text-slate-400 uppercase">Asignar a técnico o coordinador de la región</p>
          <app-tecnico-search-select [tecnicos]="asg.opciones" placeholder="Buscar por nombre, rol o correo..." (selected)="onElegirTecnico($event)"></app-tecnico-search-select>

          @if (asg.tipo === 'INCIDENTE' && talleres.length > 0) {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Taller destino (opcional)</label>
              <select [(ngModel)]="asg.destinoTallerId" name="asg-taller" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                <option value="">Sin cambio</option>
                @for (t of talleres; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
              </select>
            </div>
          }

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="asg.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cerrar</button>
        <button (click)="confirmarAsignacion(asg.tecnicoId)" [disabled]="enviando || !asg.tecnicoId"
          class="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-50">Asignar al seleccionado</button>
      </div>
    </app-modal>

    <!-- ================= RESOLVER INCIDENCIA ================= -->
    <app-modal [isOpen]="res.open" title="Resolver incidencia" icon="wrench" zClass="z-[10100]" (close)="res.open = false">
      @if (res.open) {
        <div class="space-y-4">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <p class="font-bold text-slate-800">{{ res.titulo }}</p>
            <p class="text-slate-600">{{ res.descripcion }}</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Resultado</label>
            <select [(ngModel)]="res.estado" name="res-estado" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
              <option value="RESUELTO">Resuelto (requiere evidencia)</option>
              <option value="CANCELADO">Cancelado (falsa alarma o duplicada)</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Informe técnico de la solución</label>
            <textarea [(ngModel)]="res.solucion" name="res-sol" rows="3" class="w-full p-3 border rounded-xl text-xs font-semibold"
              placeholder="Detalle la reparación realizada..."></textarea>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Repuestos utilizados</label>
            <input type="text" [(ngModel)]="res.repuestos" name="res-rep" class="w-full p-2.5 border rounded-xl text-sm" placeholder="Ej: Empaques O-Ring, acoples M22">
          </div>

          <app-evidencia-selector #selResolver
            contexto="INCIDENTE" fase="reparacion"
            [maquinariaCodigo]="res.maquinaCodigo" [maquinariaId]="res.maquinaId" [entidadId]="res.id"
            [exigirCompleta]="res.estado === 'RESUELTO'" [deshabilitado]="enviando">
          </app-evidencia-selector>

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="res.open = false" [disabled]="enviando" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarResolucion()" [disabled]="enviando" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer disabled:opacity-60">
          {{ enviando ? 'Guardando...' : 'Guardar resolución' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= EDITAR INCIDENCIA ================= -->
    <app-modal [isOpen]="edi.open" title="Editar incidencia" icon="pencil" zClass="z-[10100]" (close)="edi.open = false">
      @if (edi.open) {
        <div class="space-y-4">
          <p class="text-[11px] text-slate-500">Los cambios quedan registrados en la línea de tiempo con el valor anterior y el nuevo.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Título</label>
              <input type="text" [(ngModel)]="edi.titulo" name="edi-tit" class="w-full p-2.5 border rounded-xl text-sm">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Gravedad</label>
              <select [(ngModel)]="edi.gravedad" name="edi-grav" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <textarea [(ngModel)]="edi.descripcion" name="edi-desc" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium"></textarea>
          </div>
          @if (edi.tieneSolucion) {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Solución</label>
              <textarea [(ngModel)]="edi.solucion" name="edi-sol" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium"></textarea>
            </div>
          }
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="edi.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarEdicionIncidente()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">Guardar cambios</button>
      </div>
    </app-modal>

    <!-- ================= PROGRAMAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="prog.open" title="Programar mantenimiento" icon="calendar-clock" zClass="z-[10100]" (close)="prog.open = false">
      @if (prog.open) {
        <div class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Máquina</label>
            @if (prog.fija) {
              <p class="text-sm font-bold text-slate-800">{{ prog.maquinas[0].codigo }} — {{ prog.maquinas[0].nombre }}</p>
            } @else {
              <select [(ngModel)]="prog.maquinaId" (ngModelChange)="onCambioMaquinaProgramacion()" name="prog-maq" class="w-full p-2.5 border rounded-xl text-sm bg-white">
                @for (m of prog.maquinas; track m.id) { <option [value]="m.id">{{ m.codigo }} — {{ m.nombre }}</option> }
              </select>
            }
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
              <select [(ngModel)]="prog.tipo" name="prog-tipo" class="w-full p-2.5 border rounded-xl text-sm bg-white">
                <option value="PREVENTIVO">Preventivo</option><option value="CORRECTIVO">Correctivo</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha programada</label>
              <input type="date" [(ngModel)]="prog.fecha" name="prog-fecha" class="w-full p-2.5 border rounded-xl text-sm">
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cada cuánto se repite</label>
            <select [(ngModel)]="prog.frecuenciaDias" name="prog-frec" class="w-full p-2.5 border rounded-xl text-sm font-semibold bg-white">
              @for (f of frecuencias; track f.dias) { <option [ngValue]="f.dias">{{ f.label }}</option> }
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Técnico (opcional; de la región de la máquina)</label>
            <app-tecnico-search-select [tecnicos]="prog.opciones" [selectedId]="prog.tecnicoId" (selected)="prog.tecnicoId = $event?.id ? '' + $event!.id : ''"></app-tecnico-search-select>
            @if (esCoordinador) {
              <button type="button" (click)="prog.tecnicoId = miId" class="mt-1 text-[11px] font-bold text-violet-700 hover:underline cursor-pointer">Asignármelo a mí</button>
            }
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones / alcance</label>
            <textarea [(ngModel)]="prog.observaciones" name="prog-obs" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium" placeholder="Tareas y repuestos previstos..."></textarea>
          </div>

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="prog.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarProgramacion()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">Programar</button>
      </div>
    </app-modal>

    <!-- ================= EJECUTAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="eje.open" title="Ejecutar mantenimiento" icon="check-circle-2" zClass="z-[10100]" (close)="eje.open = false">
      @if (eje.open) {
        <div class="space-y-4">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <p class="font-bold text-slate-800">{{ eje.titulo }}</p>
            <p class="text-slate-600">Programado para: <strong>{{ eje.fechaProgramada }}</strong></p>
            <p class="text-[11px] text-slate-500">Si falta más que la ventana de adelanto de la máquina, el servidor lo rechazará indicando desde qué fecha se puede ejecutar.</p>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Informe del trabajo realizado</label>
            <textarea [(ngModel)]="eje.observaciones" name="eje-obs" rows="3" class="w-full p-3 border rounded-xl text-xs font-semibold"
              placeholder="Tareas ejecutadas, repuestos cambiados, pruebas..."></textarea>
          </div>

          <app-evidencia-selector #selEjecutar
            contexto="MANTENIMIENTO"
            [maquinariaCodigo]="eje.maquinaCodigo" [maquinariaId]="eje.maquinaId" [entidadId]="eje.id"
            [exigirCompleta]="true" [deshabilitado]="enviando">
          </app-evidencia-selector>

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="eje.open = false" [disabled]="enviando" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarEjecucion()" [disabled]="enviando" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer disabled:opacity-60">
          {{ enviando ? 'Guardando...' : 'Confirmar ejecución' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= EDITAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="emt.open" title="Editar mantenimiento" icon="pencil" zClass="z-[10100]" (close)="emt.open = false">
      @if (emt.open) {
        <div class="space-y-4">
          <p class="text-[11px] text-slate-500">Los cambios quedan registrados en la línea de tiempo con el valor anterior y el nuevo.</p>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo</label>
              <select [(ngModel)]="emt.tipo" name="emt-tipo" class="w-full p-2.5 border rounded-xl text-sm bg-white">
                <option value="PREVENTIVO">Preventivo</option><option value="CORRECTIVO">Correctivo</option>
              </select>
            </div>
            @if (!emt.finalizado) {
              <div>
                <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Fecha programada</label>
                <input type="date" [(ngModel)]="emt.fecha" name="emt-fecha" class="w-full p-2.5 border rounded-xl text-sm">
              </div>
            }
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Frecuencia</label>
              <select [(ngModel)]="emt.frecuenciaDias" name="emt-frec" class="w-full p-2.5 border rounded-xl text-sm bg-white">
                @for (f of frecuencias; track f.dias) { <option [ngValue]="f.dias">{{ f.label }}</option> }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Costo total (USD)</label>
              <input type="number" min="0" step="0.01" [(ngModel)]="emt.costoTotal" name="emt-costo" class="w-full p-2.5 border rounded-xl text-sm">
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Repuestos usados (separados por coma)</label>
            <input type="text" [(ngModel)]="emt.repuestos" name="emt-rep" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Observaciones</label>
            <textarea [(ngModel)]="emt.observaciones" name="emt-obs" rows="3" class="w-full p-3 border rounded-xl text-xs font-medium"></textarea>
          </div>
          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="emt.open = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarEdicionMantenimiento()" [disabled]="enviando" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs cursor-pointer disabled:opacity-60">Guardar cambios</button>
      </div>
    </app-modal>

    <!-- ================= AGREGAR EVIDENCIA ================= -->
    <app-modal [isOpen]="evi.open" title="Agregar evidencia" icon="camera" zClass="z-[10100]" (close)="evi.open = false">
      @if (evi.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600"><strong class="text-slate-900">{{ evi.titulo }}</strong></p>
          <p class="text-[11px] text-slate-500">Las evidencias nunca se borran. Si reemplazas una, la anterior queda oculta pero conservada.</p>

          @if (evi.entidad === 'INCIDENTE') {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Etapa</label>
              <select [(ngModel)]="evi.etapa" name="evi-etapa" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                <option value="REPORTE">Reporte de la falla</option><option value="REPARACION">Reparación</option>
              </select>
            </div>
          }
          @if (evi.existentes.length > 0) {
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Reemplaza a (opcional)</label>
              <select [(ngModel)]="evi.reemplazaId" name="evi-reemp" class="w-full p-2.5 border rounded-xl text-xs font-bold bg-white">
                <option value="">No reemplaza ninguna</option>
                @for (e of evi.existentes; track e.id) {
                  <option [value]="e.id">{{ e.kind }} — {{ e.descripcion || e.id.substring(0, 8) }}</option>
                }
              </select>
            </div>
          }

          <app-evidencia-selector #selAgregar
            [contexto]="evi.entidad" [fase]="evi.etapa === 'REPARACION' ? 'reparacion' : 'reporte'"
            [maquinariaCodigo]="evi.maquinaCodigo" [maquinariaId]="evi.maquinaId" [entidadId]="evi.id"
            [exigirCompleta]="false" [deshabilitado]="enviando">
          </app-evidencia-selector>

          @if (error) { <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button (click)="evi.open = false" [disabled]="enviando" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer">Cancelar</button>
        <button (click)="confirmarEvidencia()" [disabled]="enviando" class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs cursor-pointer disabled:opacity-60">
          {{ enviando ? 'Subiendo...' : 'Agregar evidencia' }}
        </button>
      </div>
    </app-modal>
  `,
})
export class TrabajoAccionesComponent {
  private incidenteService = inject(IncidenteService);
  private mantenimientoService = inject(MantenimientoService);
  private maquinariaService = inject(MaquinariaService);
  private usuarioService = inject(UsuarioService);
  private authService = inject(AuthService);
  private toast = inject(ToastService);

  /** Se emite tras una acción exitosa: el host recarga sus listas. */
  @Output() hecho = new EventEmitter<string>();

  @ViewChild('selReportar') selReportar?: EvidenciaSelectorComponent;
  @ViewChild('selResolver') selResolver?: EvidenciaSelectorComponent;
  @ViewChild('selEjecutar') selEjecutar?: EvidenciaSelectorComponent;
  @ViewChild('selAgregar') selAgregar?: EvidenciaSelectorComponent;

  tiposFalla = TIPOS_FALLA;
  frecuencias = FRECUENCIAS_MANTENIMIENTO;
  talleres: TallerUbicacion[] = [];
  enviando = false;
  error = '';

  private usuarios: { id: string; nombre: string; email: string; rolNombre: string; regionId?: string }[] = [];
  private usuariosCargados = false;

  rep = { open: false, maquinaId: '', maquinaCodigo: '', maquinaNombre: '', titulo: TIPOS_FALLA[0], gravedad: 'MEDIA', descripcion: '', destinoTallerId: '', clientUuid: '' };
  asg = { open: false, tipo: 'INCIDENTE' as 'INCIDENTE' | 'MANTENIMIENTO', id: '', titulo: '', actualNombre: '', tecnicoId: '', destinoTallerId: '', opciones: [] as TecnicoOpcion[] };
  res = { open: false, id: '', maquinaId: '', maquinaCodigo: '', titulo: '', descripcion: '', estado: 'RESUELTO' as 'RESUELTO' | 'CANCELADO', solucion: '', repuestos: '' };
  edi = { open: false, id: '', titulo: '', descripcion: '', gravedad: 'MEDIA', solucion: '', tieneSolucion: false };
  prog = { open: false, fija: false, maquinas: [] as Maquinaria[], maquinaId: '', tipo: 'PREVENTIVO' as 'PREVENTIVO' | 'CORRECTIVO', fecha: '', frecuenciaDias: 30, tecnicoId: '', observaciones: '', opciones: [] as TecnicoOpcion[] };
  eje = { open: false, id: '', maquinaId: '', maquinaCodigo: '', titulo: '', fechaProgramada: '', observaciones: '' };
  emt = { open: false, id: '', tipo: 'PREVENTIVO' as 'PREVENTIVO' | 'CORRECTIVO', fecha: '', frecuenciaDias: 0, costoTotal: null as number | null, repuestos: '', observaciones: '', finalizado: false };
  evi = { open: false, entidad: 'INCIDENTE' as 'INCIDENTE' | 'MANTENIMIENTO', id: '', maquinaId: '', maquinaCodigo: '', titulo: '', etapa: 'REPORTE' as 'REPORTE' | 'REPARACION', reemplazaId: '', existentes: [] as EvidenciaMaquinaria[] };

  get miId(): string {
    return String(this.authService.getCurrentUser()?.id || '');
  }

  /** Solo el COORD_MANTENIMIENTO puede auto-asignarse (omitiendo tecnicoId). */
  get esCoordinador(): boolean {
    return this.authService.hasRole('COORD_MANTENIMIENTO');
  }

  // ----------------------------------------------------------------
  // Datos auxiliares
  // ----------------------------------------------------------------

  private async cargarUsuarios(): Promise<void> {
    if (this.usuariosCargados) return;
    try {
      const list = await firstValueFrom(this.usuarioService.getUsuarios(true, true));
      this.usuarios = (list || []).map(u => ({
        id: String(u.id),
        nombre: `${u.nombre} ${u.apellido}`.trim(),
        email: u.email,
        rolNombre: String(u.rolNombre || '').toUpperCase(),
        regionId: u.regionId ? String(u.regionId) : undefined,
      }));
      this.usuariosCargados = true;
    } catch {
      this.usuarios = [];
    }
  }

  private async cargarTalleres(): Promise<void> {
    if (this.talleres.length) return;
    this.talleres = await firstValueFrom(this.maquinariaService.getTalleres());
  }

  /** Técnicos y coordinadores de mantenimiento de la región de la máquina (incluye al propio coordinador). */
  private opcionesTecnicos(regionId?: string): TecnicoOpcion[] {
    const yo = this.miId;
    return this.usuarios
      .filter(u => u.rolNombre === 'TECNICO' || u.rolNombre === 'COORD_MANTENIMIENTO')
      .filter(u => !regionId || u.regionId === String(regionId) || (u.id === yo && this.esCoordinador))
      .map(u => ({ id: u.id, nombre: u.nombre, email: u.email, rolLabel: ROLE_LABELS[u.rolNombre] || u.rolNombre }));
  }

  private reset(): void {
    this.error = '';
    this.enviando = false;
  }

  private ok(mensaje: string, detalle: string, evento: string): void {
    this.toast.success(mensaje, detalle);
    this.hecho.emit(evento);
  }

  // ----------------------------------------------------------------
  // Reportar incidencia
  // ----------------------------------------------------------------

  async reportarIncidente(maq: { id: string | number; codigo: string; nombre: string }): Promise<void> {
    this.reset();
    await this.cargarTalleres();
    this.rep = {
      open: true, maquinaId: String(maq.id), maquinaCodigo: maq.codigo, maquinaNombre: maq.nombre,
      titulo: TIPOS_FALLA[0], gravedad: 'MEDIA', descripcion: '', destinoTallerId: '',
      clientUuid: crypto.randomUUID(),
    };
  }

  async confirmarReporte(): Promise<void> {
    this.error = '';
    if (!this.rep.descripcion.trim()) { this.error = 'Describe el problema de la máquina.'; return; }
    const pendiente = this.selReportar?.validar();
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = await this.selReportar!.subir();
      await firstValueFrom(this.incidenteService.reportarIncidente({
        clientUuid: this.rep.clientUuid,
        maquinariaId: this.rep.maquinaId,
        titulo: this.rep.titulo,
        descripcion: this.rep.descripcion.trim(),
        gravedad: this.rep.gravedad,
        destinoTallerId: this.rep.destinoTallerId || undefined,
        evidencias,
      }));
      this.rep.open = false;
      this.ok('Incidencia reportada', `${this.rep.maquinaCodigo} quedó registrada como no atendida hasta que se asigne.`, 'INCIDENTE_REPORTADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ----------------------------------------------------------------
  // Asignar
  // ----------------------------------------------------------------

  async asignarIncidente(inc: Incidente): Promise<void> {
    this.reset();
    await Promise.all([this.cargarUsuarios(), this.cargarTalleres()]);
    this.asg = {
      open: true, tipo: 'INCIDENTE', id: String(inc.id),
      titulo: `${inc.codigoIncidente} · ${inc.maquina} · ${inc.tipo}`,
      actualNombre: inc.tecnicoAsignadoNombre || '', tecnicoId: '', destinoTallerId: '',
      opciones: this.opcionesTecnicos(inc.regionId),
    };
  }

  async asignarMantenimiento(m: Mantenimiento): Promise<void> {
    this.reset();
    await this.cargarUsuarios();
    this.asg = {
      open: true, tipo: 'MANTENIMIENTO', id: String(m.id),
      titulo: `${m.maquina} · ${m.tipo} · ${m.fecha}`,
      actualNombre: m.tecnicoAsignadoId ? (m.tecnicoAsignadoNombre || '') : '', tecnicoId: '', destinoTallerId: '',
      opciones: this.opcionesTecnicos(m.regionId),
    };
  }

  onElegirTecnico(t: TecnicoOpcion | null): void {
    this.asg.tecnicoId = t ? String(t.id) : '';
  }

  /** tecnicoId undefined = auto-asignación del coordinador. */
  async confirmarAsignacion(tecnicoId?: string): Promise<void> {
    this.error = '';
    this.enviando = true;
    try {
      if (this.asg.tipo === 'INCIDENTE') {
        await firstValueFrom(this.incidenteService.asignarIncidente(this.asg.id, tecnicoId, this.asg.destinoTallerId || undefined));
      } else {
        await firstValueFrom(this.mantenimientoService.asignarMantenimiento(this.asg.id, tecnicoId));
      }
      this.asg.open = false;
      this.ok('Asignación registrada', this.asg.tipo === 'INCIDENTE' ? 'La incidencia ya tiene responsable.' : 'El mantenimiento ya tiene responsable.',
        this.asg.tipo === 'INCIDENTE' ? 'INCIDENTE_ASIGNADO' : 'MANTENIMIENTO_ASIGNADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ----------------------------------------------------------------
  // Resolver / editar incidencia
  // ----------------------------------------------------------------

  resolverIncidente(inc: Incidente): void {
    this.reset();
    this.res = {
      open: true, id: String(inc.id), maquinaId: String(inc.maquinariaId || ''), maquinaCodigo: inc.maquinariaCodigo || '',
      titulo: `${inc.codigoIncidente} · ${inc.maquina} · ${inc.tipo}`, descripcion: inc.descripcion,
      estado: 'RESUELTO', solucion: '', repuestos: '',
    };
  }

  async confirmarResolucion(): Promise<void> {
    this.error = '';
    if (!this.res.solucion.trim()) { this.error = 'Escribe el informe de la solución aplicada.'; return; }
    const pendiente = this.selResolver?.validar();
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = this.selResolver && this.selResolver.totalArchivos > 0 ? await this.selResolver.subir() : [];
      await firstValueFrom(this.incidenteService.resolverIncidente({
        incidenteId: this.res.id,
        solucion: this.res.solucion.trim(),
        estado: this.res.estado,
        repuestosUtilizados: this.res.repuestos.trim() || undefined,
        evidencias,
      }));
      this.res.open = false;
      this.ok(this.res.estado === 'RESUELTO' ? 'Incidencia resuelta' : 'Incidencia cancelada', this.res.titulo,
        this.res.estado === 'RESUELTO' ? 'INCIDENTE_REPARADO' : 'INCIDENTE_CANCELADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  editarIncidente(inc: Incidente): void {
    this.reset();
    this.edi = {
      open: true, id: String(inc.id), titulo: inc.titulo || inc.tipo, descripcion: inc.descripcion,
      gravedad: inc.gravedadRaw || 'MEDIA', solucion: inc.observacionSolucion || '',
      tieneSolucion: inc.estadoRaw === 'RESUELTO' || !!inc.observacionSolucion,
    };
  }

  async confirmarEdicionIncidente(): Promise<void> {
    this.error = '';
    if (!this.edi.titulo.trim() || !this.edi.descripcion.trim()) { this.error = 'El título y la descripción son obligatorios.'; return; }
    this.enviando = true;
    try {
      await firstValueFrom(this.incidenteService.editarIncidente({
        incidenteId: this.edi.id,
        titulo: this.edi.titulo.trim(),
        descripcion: this.edi.descripcion.trim(),
        gravedad: this.edi.gravedad,
        solucion: this.edi.tieneSolucion ? this.edi.solucion.trim() : undefined,
      }));
      this.edi.open = false;
      this.ok('Incidencia actualizada', 'El cambio quedó en la línea de tiempo.', 'INCIDENTE_EDITADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ----------------------------------------------------------------
  // Programar / ejecutar / editar mantenimiento
  // ----------------------------------------------------------------

  /** Con `maq` la máquina queda fija; sin ella se elige de `maquinas`. */
  async programarMantenimiento(maq: Maquinaria | null, maquinas: Maquinaria[] = []): Promise<void> {
    this.reset();
    await this.cargarUsuarios();
    const lista = maq ? [maq] : maquinas;
    if (!lista.length) { this.toast.warning('Sin máquinas', 'No hay máquinas disponibles para programar.'); return; }
    const primera = lista[0];
    this.prog = {
      open: true, fija: !!maq, maquinas: lista, maquinaId: String(primera.id),
      tipo: 'PREVENTIVO', fecha: new Date().toISOString().substring(0, 10), frecuenciaDias: 30, tecnicoId: '',
      observaciones: '', opciones: this.opcionesTecnicos(primera.regionId),
    };
  }

  onCambioMaquinaProgramacion(): void {
    const m = this.prog.maquinas.find(x => String(x.id) === this.prog.maquinaId);
    this.prog.opciones = this.opcionesTecnicos(m?.regionId);
    this.prog.tecnicoId = '';
  }

  async confirmarProgramacion(): Promise<void> {
    this.error = '';
    if (!this.prog.observaciones.trim()) { this.error = 'Describe el alcance del trabajo.'; return; }
    if (!this.prog.fecha) { this.error = 'Indica la fecha programada.'; return; }
    this.enviando = true;
    try {
      const creado = await firstValueFrom(this.mantenimientoService.programarMantenimiento({
        maquinariaId: this.prog.maquinaId,
        tecnicoId: this.prog.tecnicoId || undefined,
        tipo: this.prog.tipo,
        observaciones: this.prog.observaciones.trim(),
        fechaProgramada: this.prog.fecha,
        frecuenciaDias: Number(this.prog.frecuenciaDias || 0),
      }));
      this.prog.open = false;
      this.ok('Mantenimiento programado', `${creado.maquina} el ${creado.fecha}.`, 'MANTENIMIENTO_PROGRAMADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  ejecutarMantenimiento(m: Mantenimiento): void {
    this.reset();
    this.eje = {
      open: true, id: String(m.id), maquinaId: String(m.maquinariaId || ''), maquinaCodigo: m.maquinariaCodigo || '',
      titulo: `${m.maquina} · ${m.tipo}`, fechaProgramada: m.fecha, observaciones: '',
    };
  }

  async confirmarEjecucion(): Promise<void> {
    this.error = '';
    const pendiente = this.selEjecutar?.validar();
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = await this.selEjecutar!.subir();
      await firstValueFrom(this.mantenimientoService.ejecutarMantenimiento(this.eje.id, {
        observaciones: this.eje.observaciones,
        evidencias,
      }));
      this.eje.open = false;
      this.ok('Mantenimiento ejecutado', this.eje.titulo, 'MANTENIMIENTO_EJECUTADO');
    } catch (err) {
      // Incluye el 400 por ejecutar antes de la ventana de adelanto: el mensaje del servidor se muestra tal cual.
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  editarMantenimiento(m: Mantenimiento): void {
    this.reset();
    this.emt = {
      open: true, id: String(m.id), tipo: m.tipoRaw === 'CORRECTIVO' ? 'CORRECTIVO' : 'PREVENTIVO',
      fecha: m.fecha, frecuenciaDias: m.frecuenciaDias || 0, costoTotal: m.costoTotal ?? null,
      repuestos: (m.repuestosUtilizados || []).join(', '), observaciones: m.descripcion,
      finalizado: m.estadoRaw === 'FINALIZADO',
    };
  }

  async confirmarEdicionMantenimiento(): Promise<void> {
    this.error = '';
    this.enviando = true;
    try {
      const repuestos = this.emt.repuestos.split(',').map(r => r.trim()).filter(Boolean);
      await firstValueFrom(this.mantenimientoService.editarMantenimiento({
        mantenimientoId: this.emt.id,
        tipo: this.emt.tipo,
        observaciones: this.emt.observaciones.trim() || undefined,
        repuestosUsados: repuestos.length ? repuestos : undefined,
        costoTotal: this.emt.costoTotal != null && this.emt.costoTotal !== ('' as any) ? Number(this.emt.costoTotal) : undefined,
        fechaProgramada: this.emt.finalizado ? undefined : (this.emt.fecha || undefined),
        frecuenciaDias: Number(this.emt.frecuenciaDias || 0),
      }));
      this.emt.open = false;
      this.ok('Mantenimiento actualizado', 'El cambio quedó en la línea de tiempo.', 'MANTENIMIENTO_EDITADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  // ----------------------------------------------------------------
  // Agregar evidencia (nunca se borra; reemplazar oculta la anterior)
  // ----------------------------------------------------------------

  agregarEvidencia(entidad: 'INCIDENTE' | 'MANTENIMIENTO', item: Incidente | Mantenimiento): void {
    this.reset();
    const esInc = entidad === 'INCIDENTE';
    this.evi = {
      open: true, entidad, id: String(item.id),
      maquinaId: String(item.maquinariaId || ''), maquinaCodigo: item.maquinariaCodigo || '',
      titulo: esInc ? `${(item as Incidente).codigoIncidente} · ${item.maquina}` : `${item.maquina} · ${item.fecha}`,
      etapa: esInc && (item as Incidente).estadoRaw === 'RESUELTO' ? 'REPARACION' : 'REPORTE',
      reemplazaId: '', existentes: item.evidencias || [],
    };
  }

  async confirmarEvidencia(): Promise<void> {
    this.error = '';
    if (!this.selAgregar || this.selAgregar.totalArchivos < 1) { this.error = 'Selecciona al menos un archivo.'; return; }
    this.enviando = true;
    try {
      const evidencias = await this.selAgregar.subir();
      await firstValueFrom(this.incidenteService.agregarEvidencia({
        entidad: this.evi.entidad,
        entidadId: this.evi.id,
        etapa: this.evi.entidad === 'INCIDENTE' ? this.evi.etapa : undefined,
        evidencias,
        reemplazaEvidenciaId: this.evi.reemplazaId || undefined,
      }));
      this.evi.open = false;
      this.ok('Evidencia agregada', this.evi.titulo, 'EVIDENCIA_AGREGADA');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }
}
