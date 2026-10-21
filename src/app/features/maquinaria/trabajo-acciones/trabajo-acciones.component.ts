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
import { OpcionesService } from '../../../core/services/opciones.service';
import { AuthService } from '../../../core/services/auth.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { TecnicoSearchSelectComponent, TecnicoOpcion } from '../../../shared/components/tecnico-search-select/tecnico-search-select.component';
import { EvidenciaSelectorComponent } from '../../../shared/components/evidencia-selector/evidencia-selector.component';
import { ToastService } from '../../../shared/services/toast.service';
import { puedeAgregarEvidenciaMaquinaria, puedeCorregirCostoMaquinaria, puedeEvidenciaIncidente, puedeEvidenciaMantenimiento, puedeResolverIncidentes, puedeCancelarIncidentes } from '../../../core/utils/maquinaria-permisos';

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
    <app-modal [isOpen]="rep.open" title="Reportar incidencia" icon="alert-triangle" size="lg" zClass="z-[10100]" (close)="rep.open = false">
      @if (rep.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600">Equipo: <strong>{{ rep.maquinaCodigo }} — {{ rep.maquinaNombre }}</strong></p>
          <p class="text-xs text-slate-500">
            Requiere conexión. Solo puedes reportar máquinas dentro de tu alcance.
            @if (puedeSubirEvidenciasIncidente) { Se exige al menos una foto o video. }
            @else { Puedes reportar sin adjuntar evidencias porque tu rol no tiene permiso para subirlas. }
          </p>

          <div class="space-y-4">
            <div>
              <label for="ta-rep-titulo" class="field-label">Tipo de falla</label>
              <select id="ta-rep-titulo" [(ngModel)]="rep.titulo" name="rep-titulo" class="field select-chevron font-bold">
                @for (t of tiposFalla; track t) { <option [value]="t">{{ t }}</option> }
              </select>
            </div>
            <div>
              <label for="ta-rep-gravedad" class="field-label">Gravedad</label>
              <select id="ta-rep-gravedad" [(ngModel)]="rep.gravedad" name="rep-gravedad" class="field select-chevron font-bold">
                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>

          <div>
            <label for="ta-rep-desc" class="field-label">Descripción del problema</label>
            <textarea id="ta-rep-desc" [(ngModel)]="rep.descripcion" name="rep-desc" rows="3" class="field font-medium"
              placeholder="Describa síntomas, ruidos, fugas..."></textarea>
          </div>

          <div>
            <label for="ta-rep-taller" class="field-label">Enviar a taller (opcional)</label>
            <select id="ta-rep-taller" [(ngModel)]="rep.destinoTallerId" name="rep-taller" class="field select-chevron font-bold">
              <option value="">Sin taller (se atiende en sitio)</option>
              @for (t of talleres; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
            </select>
          </div>

          @if (puedeSubirEvidenciasIncidente) {
            <app-evidencia-selector #selReportar
              contexto="INCIDENTE" fase="reporte"
              [maquinariaCodigo]="rep.maquinaCodigo" [maquinariaId]="rep.maquinaId"
              [clientUuid]="rep.clientUuid" [requiereMultimedia]="true" [requiereDocumento]="false" [deshabilitado]="enviando">
            </app-evidencia-selector>
          }

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="rep.open = false" [disabled]="enviando" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarReporte()" [disabled]="enviando" class="btn btn-cta w-full sm:w-auto">
          {{ enviando ? 'Enviando...' : 'Reportar incidencia' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= ASIGNAR (incidencia o mantenimiento) ================= -->
    <app-modal [isOpen]="asg.open" [title]="asg.tipo === 'INCIDENTE' ? 'Asignar incidencia' : 'Asignar mantenimiento'" icon="user-cog" size="md" zClass="z-[10100]" (close)="asg.open = false">
      @if (asg.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600"><strong class="text-slate-900 break-words">{{ asg.titulo }}</strong></p>
          @if (asg.actualNombre) {
            <div class="p-3 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">Asignado actualmente a: <strong>{{ asg.actualNombre }}</strong></div>
          }
          <p class="text-xs text-slate-500">Solo aparecen técnicos de la región de la máquina.</p>

          @if (esCoordinador) {
            <button type="button" (click)="confirmarAsignacion(undefined)" [disabled]="enviando"
              class="btn btn-secondary w-full">
              <i-lucide name="wrench" class="w-4 h-4" aria-hidden="true"></i-lucide>
              Asignármelo a mí (coordinador)
            </button>
          }

          <p class="text-[11px] font-bold text-slate-500 uppercase">Asignar a técnico de la región</p>
          <app-tecnico-search-select [tecnicos]="asg.opciones" placeholder="Buscar técnico por nombre..." vacioTexto="No hay técnicos en la región de esta máquina." (selected)="onElegirTecnico($event)"></app-tecnico-search-select>

          @if (asg.tipo === 'INCIDENTE' && talleres.length > 0) {
            <div>
              <label for="ta-asg-taller" class="field-label">Taller destino (opcional)</label>
              <select id="ta-asg-taller" [(ngModel)]="asg.destinoTallerId" name="asg-taller" class="field select-chevron font-bold">
                <option value="">Sin cambio</option>
                @for (t of talleres; track t.id) { <option [value]="t.id">{{ t.nombre }}</option> }
              </select>
            </div>
          }

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="asg.open = false" class="btn btn-secondary w-full sm:w-auto">Cerrar</button>
        <button type="button" (click)="confirmarAsignacion(asg.tecnicoId)" [disabled]="enviando || !asg.tecnicoId"
          class="btn btn-primary w-full sm:w-auto">Asignar al seleccionado</button>
      </div>
    </app-modal>

    <!-- ================= CANCELAR INCIDENCIA ================= -->
    <app-modal [isOpen]="can.open" title="Cancelar incidencia" icon="x-circle" size="md" zClass="z-[10100]" (close)="can.open = false">
      @if (can.open) {
        <div class="space-y-4">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <p class="font-bold text-slate-800 break-words">{{ can.titulo }}</p>
            <p class="text-slate-600 break-words">{{ can.descripcion }}</p>
          </div>
          <p class="text-xs text-slate-600">Cancelar es definitivo: la incidencia se cierra y queda registrado quién la canceló, cuándo y el motivo.</p>
          <div>
            <label for="ta-can-motivo" class="field-label">Motivo de la cancelación (obligatorio)</label>
            <textarea id="ta-can-motivo" [(ngModel)]="can.motivo" name="can-motivo" rows="4" maxlength="1000" class="field font-medium"
              placeholder="Ej: falsa alarma, el equipo funciona bien; incidencia duplicada..."></textarea>
          </div>
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="can.open = false" [disabled]="enviando" class="btn btn-secondary w-full sm:w-auto">Volver</button>
        <button type="button" (click)="confirmarCancelacion()" [disabled]="enviando" class="btn btn-danger w-full sm:w-auto">
          {{ enviando ? 'Cancelando...' : 'Cancelar incidencia' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= RESOLVER INCIDENCIA ================= -->
    <app-modal [isOpen]="res.open" title="Resolver incidencia" icon="wrench" size="lg" zClass="z-[10100]" (close)="res.open = false">
      @if (res.open) {
        <div class="space-y-4">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <p class="font-bold text-slate-800 break-words">{{ res.titulo }}</p>
            <p class="text-slate-600 break-words">{{ res.descripcion }}</p>
          </div>

          <div>
            <span class="field-label">Resultado</span>
            <p class="field font-bold">Resuelto (requiere evidencia)</p>
          </div>

          <div>
            <label for="ta-res-sol" class="field-label">Informe técnico de la solución</label>
            <textarea id="ta-res-sol" [(ngModel)]="res.solucion" name="res-sol" rows="3" class="field font-semibold"
              placeholder="Detalle la reparación realizada..."></textarea>
          </div>

          <div>
            <label for="ta-res-rep" class="field-label">Repuestos utilizados</label>
            <input id="ta-res-rep" type="text" [(ngModel)]="res.repuestos" name="res-rep" class="field" placeholder="Ej: Empaques O-Ring, acoples M22">
          </div>

          @if (res.estado === 'RESUELTO') {
            <div>
              <label for="ta-res-costo" class="field-label">Costo de la reparación (USD) *</label>
              <input id="ta-res-costo" type="number" min="0" step="0.01" [(ngModel)]="res.costoTotal" name="res-costo" class="field" placeholder="0.00">
            </div>
          }

          @if (puedeSubirEvidenciasIncidente) {
            <app-evidencia-selector #selResolver
              contexto="INCIDENTE" fase="reparacion"
              [maquinariaCodigo]="res.maquinaCodigo" [maquinariaId]="res.maquinaId" [entidadId]="res.id"
              [requiereMultimedia]="res.estado === 'RESUELTO'" [requiereDocumento]="res.estado === 'RESUELTO'" [deshabilitado]="enviando">
            </app-evidencia-selector>
          } @else {
            <p class="text-xs text-slate-500">Tu rol no puede adjuntar evidencias; puedes guardar la resolución sin fotos ni documento.</p>
          }

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="res.open = false" [disabled]="enviando" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarResolucion()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">
          {{ enviando ? 'Guardando...' : 'Guardar resolución' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= EDITAR INCIDENCIA ================= -->
    <app-modal [isOpen]="edi.open" title="Editar incidencia" icon="pencil" size="md" zClass="z-[10100]" (close)="edi.open = false">
      @if (edi.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-500">Los cambios quedan registrados en la línea de tiempo con el valor anterior y el nuevo.</p>
          <div class="space-y-4">
            <div>
              <label for="ta-edi-tit" class="field-label">Título</label>
              <input id="ta-edi-tit" type="text" [(ngModel)]="edi.titulo" name="edi-tit" class="field">
            </div>
            <div>
              <label for="ta-edi-grav" class="field-label">Gravedad</label>
              <select id="ta-edi-grav" [(ngModel)]="edi.gravedad" name="edi-grav" class="field select-chevron font-bold">
                <option value="BAJA">Baja</option><option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option><option value="CRITICA">Crítica</option>
              </select>
            </div>
          </div>
          <div>
            <label for="ta-edi-desc" class="field-label">Descripción</label>
            <textarea id="ta-edi-desc" [(ngModel)]="edi.descripcion" name="edi-desc" rows="3" class="field font-medium"></textarea>
          </div>
          @if (edi.tieneSolucion) {
            <div>
              <label for="ta-edi-sol" class="field-label">Solución</label>
              <textarea id="ta-edi-sol" [(ngModel)]="edi.solucion" name="edi-sol" rows="3" class="field font-medium"></textarea>
            </div>
            @if (puedeCorregirCosto) {
              <div>
                <label for="ta-edi-costo" class="field-label">Costo de la reparación (USD)</label>
                <input id="ta-edi-costo" type="number" min="0" step="0.01" [(ngModel)]="edi.costoTotal" name="edi-costo" class="field">
              </div>
            } @else if (edi.costoTotal != null) {
              <p class="text-xs text-slate-500">Costo registrado: <strong>\${{ edi.costoTotal }}</strong> (solo admin o coordinador de mantenimiento puede corregirlo).</p>
            }
          }
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="edi.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarEdicionIncidente()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">Guardar cambios</button>
      </div>
    </app-modal>

    <!-- ================= PROGRAMAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="prog.open" title="Programar mantenimiento" icon="calendar-clock" size="md" zClass="z-[10100]" (close)="prog.open = false">
      @if (prog.open) {
        <div class="space-y-4">
          <div>
            <label [attr.for]="prog.fija ? null : 'ta-prog-maq'" class="field-label">Máquina</label>
            @if (prog.fija) {
              <p class="text-sm font-bold text-slate-800">{{ prog.maquinas[0].codigo }} — {{ prog.maquinas[0].nombre }}</p>
            } @else {
              <select id="ta-prog-maq" [(ngModel)]="prog.maquinaId" (ngModelChange)="onCambioMaquinaProgramacion()" name="prog-maq" class="field select-chevron">
                @for (m of prog.maquinas; track m.id) { <option [value]="m.id">{{ m.codigo }} — {{ m.nombre }}</option> }
              </select>
            }
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="ta-prog-fecha" class="field-label">Fecha programada</label>
              <input id="ta-prog-fecha" type="date" [(ngModel)]="prog.fecha" name="prog-fecha" class="field">
            </div>
          </div>

          <div>
            <label for="ta-prog-frec" class="field-label">Cada cuánto se repite</label>
            <select id="ta-prog-frec" [(ngModel)]="prog.frecuenciaDias" name="prog-frec" class="field select-chevron font-semibold">
              @for (f of frecuencias; track f.dias) { <option [ngValue]="f.dias">{{ f.label }}</option> }
            </select>
          </div>

          <div>
            <span class="field-label">Técnico (opcional; de la región de la máquina)</span>
            <app-tecnico-search-select [tecnicos]="prog.opciones" [selectedId]="prog.tecnicoId" vacioTexto="No hay técnicos en la región de esta máquina." (selected)="prog.tecnicoId = $event?.id ? '' + $event!.id : ''"></app-tecnico-search-select>
            @if (esCoordinador) {
              <button type="button" (click)="prog.tecnicoId = miId" class="btn btn-ghost btn-sm mt-1 text-violet-700">Asignármelo a mí</button>
            }
          </div>

          <div>
            <label for="ta-prog-obs" class="field-label">Observaciones / alcance</label>
            <textarea id="ta-prog-obs" [(ngModel)]="prog.observaciones" name="prog-obs" rows="3" class="field font-medium" placeholder="Tareas y repuestos previstos..."></textarea>
          </div>

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="prog.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarProgramacion()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">Programar</button>
      </div>
    </app-modal>

    <!-- ================= EJECUTAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="eje.open" title="Ejecutar mantenimiento" icon="check-circle-2" size="lg" zClass="z-[10100]" (close)="eje.open = false">
      @if (eje.open) {
        <div class="space-y-4">
          <div class="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
            <p class="font-bold text-slate-800 break-words">{{ eje.titulo }}</p>
            <p class="text-slate-600">Programado para: <strong>{{ eje.fechaProgramada }}</strong></p>
            <p class="text-xs text-slate-500">Si falta más que la ventana de adelanto de la máquina, el servidor lo rechazará indicando desde qué fecha se puede ejecutar.</p>
          </div>

          <div>
            <label for="ta-eje-obs" class="field-label">Informe del trabajo realizado</label>
            <textarea id="ta-eje-obs" [(ngModel)]="eje.observaciones" name="eje-obs" rows="3" class="field font-semibold"
              placeholder="Tareas ejecutadas, repuestos cambiados, pruebas..."></textarea>
          </div>

          <div>
            <label for="ta-eje-costo" class="field-label">Costo del mantenimiento (USD) *</label>
            <input id="ta-eje-costo" type="number" min="0" step="0.01" [(ngModel)]="eje.costoTotal" name="eje-costo" class="field" placeholder="0.00">
          </div>

          @if (puedeSubirEvidenciasMantenimiento) {
            <app-evidencia-selector #selEjecutar
              contexto="MANTENIMIENTO"
              [maquinariaCodigo]="eje.maquinaCodigo" [maquinariaId]="eje.maquinaId" [entidadId]="eje.id"
              [requiereMultimedia]="true" [requiereDocumento]="true" [deshabilitado]="enviando">
            </app-evidencia-selector>
          } @else {
            <p class="text-xs text-slate-500">Tu rol no puede adjuntar evidencias; puedes ejecutar el mantenimiento sin fotos ni documento.</p>
          }

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="eje.open = false" [disabled]="enviando" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarEjecucion()" [disabled]="enviando || eje.costoTotal == null" class="btn btn-primary w-full sm:w-auto">
          {{ enviando ? 'Guardando...' : 'Confirmar ejecución' }}
        </button>
      </div>
    </app-modal>

    <!-- ================= EDITAR MANTENIMIENTO ================= -->
    <app-modal [isOpen]="emt.open" title="Editar mantenimiento" icon="pencil" size="md" zClass="z-[10100]" (close)="emt.open = false">
      @if (emt.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-500">Los cambios quedan registrados en la línea de tiempo con el valor anterior y el nuevo.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            @if (!emt.finalizado) {
              <div>
                <label for="ta-emt-fecha" class="field-label">Fecha programada</label>
                <input id="ta-emt-fecha" type="date" [(ngModel)]="emt.fecha" name="emt-fecha" class="field">
              </div>
            }
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label for="ta-emt-frec" class="field-label">Frecuencia</label>
              <select id="ta-emt-frec" [(ngModel)]="emt.frecuenciaDias" name="emt-frec" class="field select-chevron">
                @for (f of frecuencias; track f.dias) { <option [ngValue]="f.dias">{{ f.label }}</option> }
              </select>
            </div>
            <div>
              <label for="ta-emt-costo" class="field-label">Costo total (USD)</label>
              @if (puedeCorregirCosto) {
                <input id="ta-emt-costo" type="number" min="0" step="0.01" [(ngModel)]="emt.costoTotal" name="emt-costo" class="field">
              } @else {
                <input id="ta-emt-costo" type="number" [ngModel]="emt.costoTotal" name="emt-costo" class="field" disabled title="Solo admin o coordinador de mantenimiento puede corregirlo">
              }
            </div>
          </div>
          <div>
            <label for="ta-emt-rep" class="field-label">Repuestos usados (separados por coma)</label>
            <input id="ta-emt-rep" type="text" [(ngModel)]="emt.repuestos" name="emt-rep" class="field">
          </div>
          <div>
            <label for="ta-emt-obs" class="field-label">Observaciones</label>
            <textarea id="ta-emt-obs" [(ngModel)]="emt.observaciones" name="emt-obs" rows="3" class="field font-medium"></textarea>
          </div>
          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="emt.open = false" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarEdicionMantenimiento()" [disabled]="enviando" class="btn btn-primary w-full sm:w-auto">Guardar cambios</button>
      </div>
    </app-modal>

    <!-- ================= AGREGAR EVIDENCIA ================= -->
    <app-modal [isOpen]="evi.open" title="Agregar evidencia" icon="camera" size="md" zClass="z-[10100]" (close)="evi.open = false">
      @if (evi.open) {
        <div class="space-y-4">
          <p class="text-xs text-slate-600"><strong class="text-slate-900 break-words">{{ evi.titulo }}</strong></p>
          <p class="text-xs text-slate-500">Las evidencias nunca se borran. Si reemplazas una, la anterior queda oculta pero conservada.</p>

          @if (evi.entidad === 'INCIDENTE') {
            <div>
              <label for="ta-evi-etapa" class="field-label">Etapa</label>
              <select id="ta-evi-etapa" [(ngModel)]="evi.etapa" name="evi-etapa" class="field select-chevron font-bold">
                <option value="REPORTE">Reporte de la falla</option><option value="REPARACION">Reparación</option>
              </select>
            </div>
          }
          @if (evi.existentes.length > 0) {
            <div>
              <label for="ta-evi-reemp" class="field-label">Reemplaza a (opcional)</label>
              <select id="ta-evi-reemp" [(ngModel)]="evi.reemplazaId" name="evi-reemp" class="field select-chevron font-bold">
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
            [requiereMultimedia]="false" [requiereDocumento]="false" [deshabilitado]="enviando">
          </app-evidencia-selector>

          @if (error) { <div class="estado-error" role="alert">{{ error }}</div> }
        </div>
      }
      <div modal-footer>
        <button type="button" (click)="evi.open = false" [disabled]="enviando" class="btn btn-secondary w-full sm:w-auto">Cancelar</button>
        <button type="button" (click)="confirmarEvidencia()" [disabled]="enviando" class="btn btn-cta w-full sm:w-auto">
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
  private opciones = inject(OpcionesService);
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


  rep = { open: false, maquinaId: '', maquinaCodigo: '', maquinaNombre: '', titulo: TIPOS_FALLA[0], gravedad: 'MEDIA', descripcion: '', destinoTallerId: '', clientUuid: '' };
  asg = { open: false, tipo: 'INCIDENTE' as 'INCIDENTE' | 'MANTENIMIENTO', id: '', titulo: '', actualNombre: '', tecnicoId: '', destinoTallerId: '', opciones: [] as TecnicoOpcion[] };
  can = { open: false, id: '', titulo: '', descripcion: '', motivo: '' };
  res = { open: false, id: '', maquinaId: '', maquinaCodigo: '', titulo: '', descripcion: '', estado: 'RESUELTO' as 'RESUELTO' | 'CANCELADO', solucion: '', repuestos: '', costoTotal: null as number | null };
  edi = { open: false, id: '', titulo: '', descripcion: '', gravedad: 'MEDIA', solucion: '', tieneSolucion: false, costoTotal: null as number | null };
  prog = { open: false, fija: false, maquinas: [] as Maquinaria[], maquinaId: '', fecha: '', frecuenciaDias: 30, tecnicoId: '', observaciones: '', opciones: [] as TecnicoOpcion[] };
  eje = { open: false, id: '', maquinaId: '', maquinaCodigo: '', titulo: '', fechaProgramada: '', observaciones: '', costoTotal: null as number | null, puedeMarcar: false };
  emt = { open: false, id: '', fecha: '', frecuenciaDias: 0, costoTotal: null as number | null, repuestos: '', observaciones: '', finalizado: false };
  evi = { open: false, entidad: 'INCIDENTE' as 'INCIDENTE' | 'MANTENIMIENTO', id: '', maquinaId: '', maquinaCodigo: '', titulo: '', etapa: 'REPORTE' as 'REPORTE' | 'REPARACION', reemplazaId: '', existentes: [] as EvidenciaMaquinaria[] };

  get miId(): string {
    return String(this.authService.getCurrentUser()?.id || '');
  }

  /** Solo el COORD_MANTENIMIENTO puede auto-asignarse (omitiendo tecnicoId). */
  get esCoordinador(): boolean {
    return this.authService.hasRole('COORD_MANTENIMIENTO');
  }

  get puedeCorregirCosto(): boolean {
    return puedeCorregirCostoMaquinaria(this.authService);
  }

  /** Evidencias de incidencias (reportar y resolver). */
  get puedeSubirEvidenciasIncidente(): boolean { return puedeEvidenciaIncidente(this.authService); }
  /** Evidencias al ejecutar un mantenimiento. */
  get puedeSubirEvidenciasMantenimiento(): boolean { return puedeEvidenciaMantenimiento(this.authService); }
  get puedeSubirEvidenciasMaquinaria(): boolean { return puedeAgregarEvidenciaMaquinaria(this.authService); }
  get puedeResolverResultado(): boolean { return puedeResolverIncidentes(this.authService); }
  get puedeCancelarResultado(): boolean { return puedeCancelarIncidentes(this.authService); }

  // ----------------------------------------------------------------
  // Datos auxiliares
  // ----------------------------------------------------------------

  private async cargarTalleres(): Promise<void> {
    if (this.talleres.length) return;
    this.talleres = await firstValueFrom(this.maquinariaService.getTalleres());
  }

  /**
   * Técnicos de la región de la máquina (el servidor filtra por rol y región: ya no se baja el
   * directorio completo de usuarios para descartar en cliente). El coordinador se auto-asigna con
   * el botón "Asignármelo a mí", no eligiéndose a sí mismo de esta lista.
   */
  private async opcionesTecnicos(regionId?: string): Promise<TecnicoOpcion[]> {
    if (!regionId) return [];
    try {
      const cargador = this.opciones.usuarios({ rolNombre: 'TECNICO', regionId, estado: 1 });
      const pagina = await firstValueFrom(cargador('', 1, 200));
      return pagina.items.map(o => ({ id: o.value, nombre: o.label, rolLabel: ROLE_LABELS['TECNICO'] || 'Técnico' }));
    } catch {
      return [];
    }
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
    const pendiente = this.puedeSubirEvidenciasIncidente ? this.selReportar?.validar() : null;
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = this.puedeSubirEvidenciasIncidente && this.selReportar
        ? await this.selReportar.subir()
        : [];
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
    const [opciones] = await Promise.all([this.opcionesTecnicos(inc.regionId), this.cargarTalleres()]);
    this.asg = {
      open: true, tipo: 'INCIDENTE', id: String(inc.id),
      titulo: `${inc.codigoIncidente} · ${inc.maquina} · ${inc.tipo}`,
      actualNombre: inc.tecnicoAsignadoNombre || '', tecnicoId: '', destinoTallerId: '',
      opciones,
    };
  }

  async asignarMantenimiento(m: Mantenimiento): Promise<void> {
    this.reset();
    const opciones = await this.opcionesTecnicos(m.regionId);
    this.asg = {
      open: true, tipo: 'MANTENIMIENTO', id: String(m.id),
      titulo: `${m.maquina} · ${m.fecha}`,
      actualNombre: m.tecnicoAsignadoId ? (m.tecnicoAsignadoNombre || '') : '', tecnicoId: '', destinoTallerId: '',
      opciones,
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
      estado: 'RESUELTO', solucion: '', repuestos: '', costoTotal: null,
    };
  }

  cancelarIncidente(inc: Incidente): void {
    this.reset();
    this.can = {
      open: true, id: String(inc.id), titulo: `${inc.codigoIncidente} · ${inc.maquina} · ${inc.tipo}`,
      descripcion: inc.descripcion, motivo: '',
    };
  }

  async confirmarCancelacion(): Promise<void> {
    this.error = '';
    if (this.can.motivo.trim().length < 5) { this.error = 'Explica por qué se cancela la incidencia (mínimo 5 caracteres).'; return; }
    this.enviando = true;
    try {
      await firstValueFrom(this.incidenteService.cancelarIncidente(this.can.id, this.can.motivo.trim()));
      this.can.open = false;
      this.ok('Incidencia cancelada', this.can.titulo, 'INCIDENTE_CANCELADO');
    } catch (err) {
      this.error = mensajeError(err);
    } finally {
      this.enviando = false;
    }
  }

  async confirmarResolucion(): Promise<void> {
    this.error = '';
    if (!this.res.solucion.trim()) { this.error = 'Escribe el informe de la solución aplicada.'; return; }
    if (this.res.estado === 'RESUELTO' && this.res.costoTotal == null) {
      this.error = 'El costo de la reparación es obligatorio para resolver la incidencia.';
      return;
    }
    const pendiente = this.puedeSubirEvidenciasIncidente ? this.selResolver?.validar() : null;
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = this.puedeSubirEvidenciasIncidente && this.selResolver && this.selResolver.totalArchivos > 0
        ? await this.selResolver.subir()
        : [];
      await firstValueFrom(this.incidenteService.resolverIncidente({
        incidenteId: this.res.id,
        solucion: this.res.solucion.trim(),
        estado: this.res.estado,
        repuestosUtilizados: this.res.repuestos.trim() || undefined,
        costoTotal: this.res.estado === 'RESUELTO' ? this.res.costoTotal! : undefined,
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
      costoTotal: inc.costoTotal ?? null,
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
        costoTotal: this.puedeCorregirCosto && this.edi.costoTotal != null ? this.edi.costoTotal : undefined,
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
    const lista = maq ? [maq] : maquinas;
    if (!lista.length) { this.toast.warning('Sin máquinas', 'No hay máquinas disponibles para programar.'); return; }
    const primera = lista[0];
    const opciones = await this.opcionesTecnicos(primera.regionId);
    this.prog = {
      open: true, fija: !!maq, maquinas: lista, maquinaId: String(primera.id),
      fecha: new Date().toISOString().substring(0, 10), frecuenciaDias: 30, tecnicoId: '',
      observaciones: '', opciones,
    };
  }

  async onCambioMaquinaProgramacion(): Promise<void> {
    const m = this.prog.maquinas.find(x => String(x.id) === this.prog.maquinaId);
    this.prog.tecnicoId = '';
    this.prog.opciones = await this.opcionesTecnicos(m?.regionId);
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
    // Marcan el técnico asignado o quien gestiona maquinaria (administradores); el servidor valida igual.
    const puedeMarcar = this.authService.puede('mantenimientos.ejecutar')
      && (this.authService.puede('maquinaria.gestionar') || String(m.tecnicoAsignadoId || '') === this.miId);
    this.eje = {
      open: true, id: String(m.id), maquinaId: String(m.maquinariaId || ''), maquinaCodigo: m.maquinariaCodigo || '',
      titulo: m.maquina, fechaProgramada: m.fecha, observaciones: '', costoTotal: null, puedeMarcar,
    };
  }

  async confirmarEjecucion(): Promise<void> {
    this.error = '';
    if (this.eje.costoTotal == null) { this.error = 'El costo del mantenimiento es obligatorio para ejecutarlo.'; return; }
    const pendiente = this.puedeSubirEvidenciasMantenimiento ? this.selEjecutar?.validar() : null;
    if (pendiente) { this.error = pendiente; return; }
    this.enviando = true;
    try {
      const evidencias = this.puedeSubirEvidenciasMantenimiento && this.selEjecutar
        ? await this.selEjecutar.subir()
        : [];
      await firstValueFrom(this.mantenimientoService.ejecutarMantenimiento(this.eje.id, {
        observaciones: this.eje.observaciones,
        costoTotal: this.eje.costoTotal,
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
      open: true, id: String(m.id),
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
        observaciones: this.emt.observaciones.trim() || undefined,
        repuestosUsados: repuestos.length ? repuestos : undefined,
        costoTotal: this.puedeCorregirCosto && this.emt.costoTotal != null && this.emt.costoTotal !== ('' as any) ? Number(this.emt.costoTotal) : undefined,
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
    if (!this.puedeSubirEvidenciasMaquinaria) {
      this.error = 'Tu rol no puede subir evidencias de incidencias o mantenimientos.';
      return;
    }
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
    if (!this.puedeSubirEvidenciasMaquinaria) {
      this.error = 'Tu rol no puede subir evidencias de incidencias o mantenimientos.';
      return;
    }
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
