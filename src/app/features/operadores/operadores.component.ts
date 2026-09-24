import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OperadorService } from '../../core/services/operador.service';
import { SucursalService } from '../../core/services/sucursal.service';
import { BahiaService } from '../../core/services/bahia.service';
import { AuthService } from '../../core/services/auth.service';
import { Operador, HistorialAsignacionOperador, Sucursal } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { ToastService } from '../../shared/services/toast.service';
import { FilterBarComponent, FilterState } from '../../shared/components/filter-bar/filter-bar.component';

@Component({
  selector: 'app-operadores',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-easydry-blue/10 text-easydry-blue">
              <i-lucide [name]="isCoordServiciosEspeciales ? 'sparkles' : 'user-check'" class="w-5 h-5"></i-lucide>
            </span>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">{{ isCoordServiciosEspeciales ? 'Gestión de Pulidores' : 'Gestión de Lavadores' }}</h1>
          </div>
          <p class="text-slate-500 text-xs mt-1">{{ isCoordServiciosEspeciales ? 'Directorio de personal de servicios especiales (pulidores fijos y móviles), asignación a bahía y trazabilidad.' : 'Directorio de personal de lavado, asignación directa a agencia y bahía, productividad y trazabilidad histórica (100% Base de Datos).' }}</p>
          <div class="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-medium">
            <i-lucide name="shield" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i-lucide>
            @if (isCoordServiciosEspeciales) {
              <span><strong>Rol Pulidor:</strong> Especialistas en pulido técnico, corrección de pintura y acabados especiales (Fijos en Agencia o Móviles Multisede).</span>
            } @else {
              <span><strong>Rol Lavador:</strong> Registro y constancia técnica en bahía para trazabilidad. El acceso al sistema y registro de OTs lo efectúa el <strong>Líder</strong>.</span>
            }
          </div>
        </div>

        @if (canGestionarOperadores) {
          <button
            type="button"
            (click)="abrirModalCrear()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer">
            <i-lucide [name]="isCoordServiciosEspeciales ? 'sparkles' : 'user-plus'" class="w-4 h-4"></i-lucide>
            <span>{{ isCoordServiciosEspeciales ? 'Registrar Pulidor' : 'Registrar Lavador' }}</span>
          </button>
        }
      </div>

      <!-- Global Filter Bar (Filtros y Búsqueda Unificados) -->
      <app-filter-bar 
        [showSucursal]="isSuperAdmin || isCoordServiciosEspeciales" 
        [showOperador]="false"
        [showBahia]="true"
        [showCliente]="true"
        [showEstado]="true"
        [showFechas]="false"
        [showBusqueda]="true"
        [placeholderBusqueda]="isCoordServiciosEspeciales ? 'Buscar pulidor por nombre, apellido o cédula...' : 'Buscar por nombre, apellido o cédula...'"
        [listaEstados]="['Todos', 'Activo', 'Inactivo']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Loader / Skeleton mientras cargan los datos -->
      @if (cargando) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-10 flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 border-4 border-easydry-blue border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-bold text-slate-500">Cargando {{ isCoordServiciosEspeciales ? 'pulidores' : 'lavadores' }} desde base de datos...</p>
        </div>
      }

      <!-- Operadores Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 text-[10px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th class="py-3.5 px-4">{{ isCoordServiciosEspeciales ? 'Pulidor' : 'Lavador' }}</th>
                <th class="py-3.5 px-4">Rol Operativo</th>
                <th class="py-3.5 px-4">Estado</th>
                <th class="py-3.5 px-4">Agencia Asignada</th>
                <th class="py-3.5 px-4">Bahía Asignada</th>
                <th class="py-3.5 px-4">Productividad</th>
                <th class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              @if (!cargando && paginatedOperadores.length === 0) {
                <tr>
                  <td colspan="7" class="py-12 text-center text-slate-400">
                    <i-lucide name="user-x" class="w-8 h-8 mx-auto text-slate-300 mb-2"></i-lucide>
                    <p class="font-bold text-sm text-slate-600">No se encontraron {{ isCoordServiciosEspeciales ? 'pulidores' : 'lavadores' }} registrados</p>
                    <p class="text-xs text-slate-400 mt-1">Haga clic en "{{ isCoordServiciosEspeciales ? 'Registrar Pulidor' : 'Registrar Lavador' }}" para dar de alta el primer {{ isCoordServiciosEspeciales ? 'especialista' : 'colaborador' }} en el sistema.</p>
                  </td>
                </tr>
              }
              @for (op of paginatedOperadores; track op.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Operador -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      @if (op.avatar) {
                        <img loading="lazy" decoding="async"
                          [src]="op.avatar"
                          (error)="onAvatarError($event)"
                          alt="Avatar"
                          class="w-9 h-9 rounded-full object-cover border-2 border-easydry-green shrink-0">
                      } @else {
                        <div class="w-9 h-9 rounded-full bg-slate-100 border-2 border-easydry-green shrink-0 flex items-center justify-center text-[10px] font-extrabold text-slate-500">
                          {{ (op.nombre || '?').charAt(0) }}
                        </div>
                      }
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ op.nombre }}</p>
                        <p class="text-[10px] text-slate-400 font-mono">CI: {{ op.cedula }}</p>
                        <p class="text-[9px] text-slate-400 mt-0.5">
                          Alta: <span class="font-mono text-slate-600">{{ op.fechaCreacion ? (op.fechaCreacion | date:'dd/MM/yyyy') : (op.fechaAsignacion || '-') }}</span>
                          @if (op.fechaModificacion && op.fechaModificacion !== op.fechaCreacion) {
                            • Act: <span class="font-mono text-slate-600">{{ op.fechaModificacion | date:'dd/MM/yyyy' }}</span>
                          }
                        </p>
                        @if (op.email && !op.email.includes('local') && !op.email.includes('internal')) {
                          <p class="text-[10px] text-slate-400">{{ op.email }}</p>
                        }
                      </div>
                    </div>
                  </td>

                  <!-- Rol Operativo -->
                  <td class="py-3.5 px-4 font-semibold text-slate-700 text-xs">
                    {{ op.rol }}
                  </td>

                  <!-- Estado -->
                  <td class="py-3.5 px-4">
                    <span 
                      class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold"
                      [ngClass]="op.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-700 border border-slate-200'">
                      {{ op.estado }}
                    </span>
                  </td>

                  <!-- Agencia Asignada -->
                  <td class="py-3.5 px-4 text-xs font-bold text-slate-800">
                    {{ op.sucursal }}
                  </td>

                  <!-- Bahía Asignada -->
                  <td class="py-3.5 px-4">
                    @if (op.bahia && !op.bahia.includes('Sin') && !op.bahia.includes('undefined') && !op.bahia.includes('null')) {
                      <span class="px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold text-xs inline-flex items-center gap-1">
                        <i-lucide name="layout-grid" class="w-3 h-3"></i-lucide>
                        {{ op.bahia }}
                      </span>
                    } @else {
                      <span class="text-slate-400 italic text-[11px]">Disponible / En Reserva</span>
                    }
                  </td>

                  <!-- Productividad -->
                  <td class="py-3.5 px-4">
                    <div class="text-xs">
                      <span class="font-extrabold text-easydry-green-dark">{{ op.vehiculosAtendidos }} Autos</span>
                      <p class="text-[10px] text-slate-400">Servicios en BD</p>
                    </div>
                  </td>

                  <!-- Acciones -->
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      @if (canGestionarOperadores) {
                        <!-- Editar Operador -->
                        <button
                          type="button"
                          (click)="abrirModalEditar(op)"
                          [title]="isCoordServiciosEspeciales ? 'Editar pulidor' : 'Editar lavador'"
                          class="p-1.5 text-slate-400 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
                        </button>

                        <!-- Asignar o Cambiar Bahía -->
                        <button
                          type="button"
                          (click)="abrirModalAsignar(op)"
                          [title]="op.bahia && !op.bahia.includes('Sin') && op.bahia !== 'undefined' ? 'Cambiar bahía' : 'Asignar a bahía'"
                          class="p-1.5 text-slate-400 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                          <i-lucide name="refresh-cw" class="w-4 h-4"></i-lucide>
                        </button>

                        <!-- Desactivar Asignación -->
                        @if (op.bahia && !op.bahia.includes('Sin') && op.bahia !== 'undefined') {
                          <button
                            type="button"
                            (click)="desactivarAsignacion(op)"
                            title="Desactivar asignación de bahía"
                            class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                            <i-lucide name="user-x" class="w-4 h-4"></i-lucide>
                          </button>
                        }
                      }

                      <!-- Ver Productividad & Ficha -->
                      <button 
                        type="button"
                        (click)="verFichaOperador(op)" 
                        title="Ver productividad y ficha técnica"
                        class="p-1.5 text-slate-400 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer flex items-center justify-center">
                        <i-lucide name="bar-chart-2" class="w-4 h-4"></i-lucide>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="operadoresFiltrados.length" 
          [currentPage]="currentPage" 
          [pageSize]="pageSize"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Crear / Registrar Nuevo Operador -->
      <app-modal
        [isOpen]="modalCrearOpen"
        [title]="esEdicion ? (isCoordServiciosEspeciales ? 'Editar Datos de Pulidor' : 'Editar Datos de Lavador') : (isCoordServiciosEspeciales ? 'Registrar Nuevo Pulidor' : 'Registrar Nuevo Lavador')"
        [icon]="esEdicion ? 'pencil' : (isCoordServiciosEspeciales ? 'sparkles' : 'user-plus')"
        (close)="cerrarModalCrear()">
        
        <div class="space-y-4">
          <!-- Aclaratoria: Personal operativo sólo para constancia, no líder ni usuario de sistema -->
          <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
            <i-lucide name="info" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5"></i-lucide>
            <div>
              <p class="font-bold">{{ isCoordServiciosEspeciales ? 'Control y Constancia de Pulidores Técnicos' : 'Constancia y Control de Personal Operativo' }}</p>
              <p class="text-[11px] text-blue-800 mt-0.5">
                @if (isCoordServiciosEspeciales) {
                  Registro de especialistas en servicios de pulido técnico y acabado. Se gestiona su asignación a sedes fijas o disponibilidad móvil.
                } @else {
                  Este registro es para constancia y seguimiento técnico en bahías de lavado. A diferencia del <strong>Líder Operador</strong> o administradores de sistema, los lavadores no requieren usuario ni credenciales de acceso.
                }
              </p>
            </div>
          </div>

          <!-- Nombre Completo -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nombre Completo <span class="text-rose-500">*</span>
            </label>
            <input
              type="text"
              [(ngModel)]="formOperador.nombre"
              placeholder="Ej. Pedro José Ramírez"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue">
          </div>

          <!-- Cédula y Teléfono -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cédula de Identidad / CI <span class="text-rose-500">*</span>
              </label>
              <input
                type="text"
                [(ngModel)]="formOperador.cedula"
                placeholder="Ej. 1729384756"
                maxlength="13"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue">
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono / Celular (Opcional)
              </label>
              <input
                type="text"
                [(ngModel)]="formOperador.telefono"
                placeholder="Ej. 0998765432"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-easydry-blue">
            </div>
          </div>

          <!-- Rol Operativo y Estado -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rol Operativo
              </label>
              <select
                [(ngModel)]="formOperador.rol"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
                @for (r of rolesOperativosDisponibles; track r) {
                  <option [value]="r">{{ r }}</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Estado del {{ isCoordServiciosEspeciales ? 'Pulidor' : 'Lavador' }}
              </label>
              <select
                [(ngModel)]="formOperador.estado"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <!-- Agencia / Sucursal Asignada -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agencia / Sucursal Asignada <span class="text-rose-500">*</span>
              @if (isGerente) {
                <span class="text-purple-600 font-bold ml-1">(Exclusivo tu Agencia)</span>
              }
            </label>
            <select
              [(ngModel)]="formOperador.sucursalId"
              [disabled]="isGerente"
              (change)="onSucursalOperadorChange()"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-75 disabled:bg-slate-100 outline-none focus:ring-2 focus:ring-easydry-blue">
              @for (s of sucursales; track s.id) {
                <option [value]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
              }
            </select>
          </div>

          <!-- Bahía de Asignación -->
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Bahía de Asignación
            </label>
            <select
              [(ngModel)]="formOperador.bahiaId"
              (change)="onBahiaCrearSelectChange()"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
              <option value="">Sin Bahía Asignada (Personal en Reserva / Disponible)</option>
              @for (b of listaBahiasOperador; track b.id) {
                <option [value]="b.id">{{ b.nombre }} - {{ b.operadorAsignado ? b.operadorAsignado : 'Sin asignar' }}</option>
              }
            </select>
            @if (conflictoAsignacion && conflictoAsignacion.contexto === 'crear') {
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 mt-2 animate-fade-in">
                <i-lucide name="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i-lucide>
                <div>
                  <p class="font-bold">¡Atención! Bahía actualmente ocupada</p>
                  <p class="text-[11px] text-amber-800 mt-0.5">
                    La <strong>{{ conflictoAsignacion.bahiaNombre }}</strong> está asignada a <strong>{{ conflictoAsignacion.operadorActualNombre }}</strong>.
                    Al asignarla a este lavador, <strong>{{ conflictoAsignacion.operadorActualNombre }}</strong> se quedará <strong>sin bahía asignada</strong>.
                  </p>
                </div>
              </div>
            }
            <p class="text-[11px] text-slate-400 mt-1">
              El lavador quedará vinculado de inmediato en la base de datos a la bahía seleccionada.
            </p>
          </div>
        </div>

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="cerrarModalCrear()"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            (click)="guardarOperador()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-easydry-blue hover:bg-easydry-blue-dark text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-easydry-blue/20">
            <i-lucide [name]="esEdicion ? 'save' : 'user-plus'" class="w-4 h-4"></i-lucide>
            <span>{{ esEdicion ? 'Actualizar en Base de Datos' : 'Registrar y Asignar en BD' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Asignar / Cambiar Bahía -->
      <app-modal
        [isOpen]="modalAsignarBahiaOpen"
        [title]="'Asignar / Cambiar Bahía: ' + (operadorSeleccionado?.nombre || '')"
        icon="layout-grid"
        (close)="modalAsignarBahiaOpen = false">
        @if (operadorSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs">
              Ubicación actual del lavador: <strong>{{ operadorSeleccionado.sucursal }}</strong> — <strong>{{ operadorSeleccionado.bahia }}</strong>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Sucursal / Agencia
                @if (isGerente) {
                  <span class="text-purple-600 font-bold ml-1">(Exclusivo tu Agencia)</span>
                }
              </label>
              <select
                [(ngModel)]="formAsignarBahia.sucursalId"
                [disabled]="isGerente"
                (change)="onSucursalAsignarChange()"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-75 disabled:bg-slate-100">
                @for (s of sucursales; track s.id) {
                  <option [value]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
                }
              </select>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía de Destino</label>
              <select
                [(ngModel)]="formAsignarBahia.bahiaId"
                (change)="onBahiaAsignarSelectChange()"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800">
                <option value="">Sin Bahía Asignada (Desvincular)</option>
                @for (b of listaBahiasDisponibles; track b.id) {
                  <option [value]="b.id">{{ b.nombre }} - {{ b.operadorAsignado ? b.operadorAsignado : 'Sin asignar' }}</option>
                }
              </select>
              @if (conflictoAsignacion && conflictoAsignacion.contexto === 'asignar') {
                <div class="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 mt-2 animate-fade-in">
                  <i-lucide name="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i-lucide>
                  <div>
                    <p class="font-bold">¡Atención! Bahía actualmente ocupada</p>
                    <p class="text-[11px] text-amber-800 mt-0.5">
                      La <strong>{{ conflictoAsignacion.bahiaNombre }}</strong> está asignada a <strong>{{ conflictoAsignacion.operadorActualNombre }}</strong>.
                      Si reasigna aquí a <strong>{{ conflictoAsignacion.nuevoOperadorNombre }}</strong>, el lavador <strong>{{ conflictoAsignacion.operadorActualNombre }}</strong> se quedará <strong>sin bahía asignada</strong>.
                    </p>
                  </div>
                </div>
              }
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Movimiento / Reasignación</label>
              <input
                type="text"
                [(ngModel)]="formAsignarBahia.motivo"
                placeholder="Ej. Cobertura por alta demanda, rotación periódica..."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
            </div>
          </div>
        }

        <div modal-footer class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalAsignarBahiaOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            (click)="guardarAsignacionBahia()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-easydry-blue hover:bg-easydry-blue-dark text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-easydry-blue/20">
            <i-lucide name="check" class="w-4 h-4"></i-lucide>
            <span>Confirmar en Base de Datos</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Ficha de Operador & Productividad -->
      <app-modal 
        [isOpen]="modalFichaOpen" 
        [title]="'Ficha de Lavador & Productividad: ' + (operadorSeleccionado?.nombre || '')" 
        icon="trophy"
        (close)="modalFichaOpen = false">
        
        @if (operadorSeleccionado) {
          <div class="space-y-6">
            
            <!-- Operator Profile Banner -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div class="flex items-center gap-4">
                <img loading="lazy" decoding="async" [src]="operadorSeleccionado.avatar" alt="Avatar" class="w-14 h-14 rounded-full object-cover border-2 border-easydry-green shrink-0">
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-extrabold text-slate-900 text-lg font-outfit">{{ operadorSeleccionado.nombre }}</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold" [ngClass]="operadorSeleccionado.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'">
                      {{ operadorSeleccionado.estado }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">Cédula: <strong>{{ operadorSeleccionado.cedula }}</strong> • Rol: <strong>{{ operadorSeleccionado.rol }}</strong></p>
                  <p class="text-xs text-easydry-blue font-bold mt-0.5">Ubicación Actual: {{ operadorSeleccionado.sucursal }} ({{ operadorSeleccionado.bahia }})</p>
                </div>
              </div>

              <!-- Metadata de Creación & Modificación en BD -->
              <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <span class="text-slate-400 block text-[9px] uppercase font-bold">Fecha de Alta / Creación (BD):</span>
                  <b class="text-slate-800">{{ operadorSeleccionado.fechaCreacion ? (operadorSeleccionado.fechaCreacion | date:'dd/MM/yyyy HH:mm') : (operadorSeleccionado.fechaAsignacion || '-') }}</b>
                </div>
                @if (operadorSeleccionado.fechaModificacion) {
                  <div>
                    <span class="text-slate-400 block text-[9px] uppercase font-bold">Última Modificación (BD):</span>
                    <b class="text-slate-800">{{ operadorSeleccionado.fechaModificacion | date:'dd/MM/yyyy HH:mm' }}</b>
                  </div>
                }
              </div>
            </div>

            <!-- Productivity Stats Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Vehículos Atendidos</span>
                <span class="font-extrabold text-slate-900 text-base mt-0.5 block">{{ operadorSeleccionado.vehiculosAtendidos }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Servicios Registrados</span>
                <span class="font-extrabold text-easydry-blue text-base mt-0.5 block">{{ operadorSeleccionado.serviciosRealizados }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[10px] text-slate-400 uppercase font-bold block">Estado Actual</span>
                <span class="font-extrabold text-emerald-600 text-base mt-0.5 block">{{ operadorSeleccionado.estado }}</span>
              </div>
            </div>

            <!-- Assignment History Log -->
            <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">Historial de Asignaciones a Sucursales & Bahías (BD)</h4>
              
              <div class="space-y-2">
                @if (historialOperador.length === 0) {
                  <p class="text-xs text-slate-400 italic py-3 text-center">No hay registros históricos de asignación para este lavador.</p>
                }
                @for (h of historialOperador; track h.id) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:border-easydry-blue/30 transition-colors">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">{{ h.sucursal }} — {{ h.bahia }}</span>
                        @if (!h.fechaFin) {
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Bahía Actual
                          </span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">
                            Bahía Previa
                          </span>
                        }
                      </div>
                      <p class="text-[11px] text-slate-500 mt-0.5">Motivo: <strong>{{ h.motivo }}</strong> • Registrado por: <strong>{{ h.realizadoPor }}</strong></p>
                    </div>
                    <div class="text-right font-mono text-[11px] font-semibold text-slate-600">
                      <span class="text-slate-800">{{ h.fechaInicio }}</span>
                      @if (h.fechaFin) {
                        <span> &rarr; <span class="text-slate-500">{{ h.fechaFin }}</span></span>
                      } @else {
                        <span class="text-easydry-green-dark font-bold block text-[10px]">&bull; En funciones</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }

        <div modal-footer class="flex items-center justify-end w-full">
          <button 
            type="button"
            (click)="modalFichaOpen = false" 
            class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
            <span>Cerrar Ficha</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Alerta de Confirmación de Conflicto de Bahía Ocupada -->
      <app-modal
        [isOpen]="modalConfirmarConflictoOpen"
        title="Alerta: Reasignación de Bahía Ocupada"
        icon="alert-triangle"
        (close)="modalConfirmarConflictoOpen = false">
        
        <div class="space-y-4 py-1">
          <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <i-lucide name="alert-triangle" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">¿Desea cambiar de bahía sabiendo que el otro lavador se quedará sin bahía?</h4>
              <p class="text-xs text-amber-900 mt-1 leading-relaxed">
                La <strong>{{ conflictoAsignacion?.bahiaNombre }}</strong> está ocupada actualmente por <strong>{{ conflictoAsignacion?.operadorActualNombre }}</strong>.
                Al continuar con la asignación, <strong>{{ conflictoAsignacion?.operadorActualNombre }}</strong> se quedará <strong>sin bahía asignada</strong> (pasará a reserva/disponible).
              </p>
            </div>
          </div>

          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Bahía seleccionada:</span>
              <span class="font-bold text-slate-900">{{ conflictoAsignacion?.bahiaNombre }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Nuevo Lavador en Bahía:</span>
              <span class="font-bold text-easydry-blue">{{ conflictoAsignacion?.nuevoOperadorNombre }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Lavador que queda sin bahía:</span>
              <span class="font-bold text-rose-600">{{ conflictoAsignacion?.operadorActualNombre }} (Desvinculado a Reserva)</span>
            </div>
          </div>
        </div>

        <div modal-footer class="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            (click)="modalConfirmarConflictoOpen = false"
            class="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer inline-flex items-center gap-1.5">
            <i-lucide name="x" class="w-4 h-4"></i-lucide>
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            (click)="ejecutarGuardadoConConflicto()"
            class="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-sm shadow-amber-600/20">
            <i-lucide name="check" class="w-4 h-4"></i-lucide>
            <span>Sí, Reasignar Bahía</span>
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class OperadoresComponent implements OnInit {
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  operadorSeleccionado?: Operador;
  historialOperador: HistorialAsignacionOperador[] = [];

  filtroTexto = '';
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  aplicarNuevosFiltros(filtros: FilterState) {
    this.filtrosGlobales = filtros;
    if (filtros.busqueda !== undefined) {
      this.filtroTexto = filtros.busqueda;
    }
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    this.currentPage = 1;
  }

  currentPage = 1;
  pageSize = 5;

  modalFichaOpen = false;
  modalAsignarBahiaOpen = false;
  modalCrearOpen = false;
  modalConfirmarConflictoOpen = false;
  cargando = true;

  esEdicion = false;
  operadorEnEdicionId?: number | string;

  conflictoAsignacion: {
    bahiaId: string;
    bahiaNombre: string;
    operadorActualId: string | number | null;
    operadorActualNombre: string;
    nuevoOperadorNombre: string;
    contexto: 'asignar' | 'crear';
  } | null = null;

  rolesOperativosLavador: string[] = [
    'LAVADOR',
    'Lavador de Bahía',
    'Lavador de Lavado Ecológico',
    'Lavador de Secado & Acabado',
    'Lavador de Lavado Integral',
    'Lavador Auxiliar / Móvil'
  ];

  rolesOperativosPulidor: string[] = [
    'PULIDOR',
    'PULIDOR_FIJO',
    'PULIDOR_MOVIL',
    'Pulidor de Detallado & Acabado',
    'Pulidor Técnico Especialista'
  ];

  get rolesOperativosDisponibles(): string[] {
    return this.isCoordServiciosEspeciales ? this.rolesOperativosPulidor : this.rolesOperativosLavador;
  }

  get rolesOperativos(): string[] {
    return this.rolesOperativosDisponibles;
  }

  formOperador = {
    nombre: '',
    cedula: '',
    telefono: '',
    rol: 'LAVADOR',
    sucursalNombre: '',
    sucursalId: '',
    bahiaNombre: '',
    bahiaId: '',
    estado: 'Activo'
  };
  listaBahiasOperador: { id: string; nombre: string; operadorAsignado?: string | null; operadorId?: string | number | null }[] = [];

  formAsignarBahia = {
    operadorId: '' as number | string,
    sucursalId: '',
    sucursalNombre: '',
    bahiaId: '',
    bahiaNombre: '',
    motivo: ''
  };
  listaBahiasDisponibles: { id: string; nombre: string; operadorAsignado?: string | null; operadorId?: string | number | null }[] = [];

  private operadorService = inject(OperadorService);
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    this.cargarDatos();
  }

  get isCoordServiciosEspeciales(): boolean {
    return this.authService.isCoordServiciosEspeciales();
  }

  get isLiderOperador(): boolean {
    return this.authService.isLiderOperador();
  }

  cargarDatos(): void {
    this.cargando = true;
    const currentUser = this.authService.getCurrentUser();
    const categoriaRol = this.isCoordServiciosEspeciales ? 'PULIDOR' : (this.isLiderOperador ? 'LAVADOR' : undefined);
    const rawAgenciaId = currentUser?.agenciaId || currentUser?.sucursalId;
    const agenciaId = this.isLiderOperador && rawAgenciaId ? String(rawAgenciaId) : undefined;

    this.operadorService.getOperadores(agenciaId, categoriaRol).subscribe({
      next: (list) => {
        this.operadores = list;
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });

    this.operadorService.operadores$.subscribe(list => {
      this.operadores = list;
      this.cargando = false;
    });

    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin() || this.authService.hasRole('ADMIN');
  }

  /** Crear, editar y (des)asignar bahía quedan reservados a SUPER_ADMIN/ADMIN.
   *  Líder, Supervisor y Coord. Servicios Especiales solo pueden consultar. */
  get canGestionarOperadores(): boolean {
    return this.isSuperAdmin;
  }

  get isGerente(): boolean {
    return this.authService.isGerente();
  }

  get userSucursal(): string | undefined {
    return this.authService.getCurrentUser()?.sucursalNombre || this.authService.getCurrentUser()?.sucursal;
  }

  get operadoresFiltrados(): Operador[] {
    let resultados = this.operadores.filter(op => {
      const currentUser = this.authService.getCurrentUser();
      const rolOp = (op.rol || '').toUpperCase();
      const esPulidor = rolOp.includes('PULIDOR');
      const esLavador = rolOp.includes('LAVADOR') || (!esPulidor && (rolOp.includes('OPERADOR') || rolOp.includes('TECNICO')));

      // 1. Scoping por Rol de usuario:
      if (this.isCoordServiciosEspeciales) {
        // Al coordinador de servicios especiales SOLO le salen los pulidores (ya sean fijos o móviles)
        if (!esPulidor) return false;
      } else if (this.isLiderOperador) {
        // Al líder operador SOLO le salen los lavadores
        if (esPulidor || !esLavador) return false;
      }

      // 2. Scoping por Agencia / Sucursal:
      let matchScope = true;
      if (this.isLiderOperador) {
        // Líder operador: estrictamente restringido a los lavadores de su propia agencia
        const userAgenciaId = currentUser?.agenciaId || currentUser?.sucursalId;
        const userSuc = (this.userSucursal || '').toLowerCase();
        if (userAgenciaId) {
          matchScope = String(op.sucursalId) === String(userAgenciaId) || String((op as any).agenciaId) === String(userAgenciaId);
        } else if (userSuc) {
          const opSuc = (op.sucursal || '').toLowerCase();
          matchScope = opSuc.includes(userSuc) || userSuc.includes(opSuc);
        }
      } else if (this.isGerente && this.userSucursal) {
        matchScope = (op.sucursal || '').toLowerCase().includes(this.userSucursal.toLowerCase()) ||
                     this.userSucursal.toLowerCase().includes((op.sucursal || '').toLowerCase());
      } else if (!this.isSuperAdmin && !this.isCoordServiciosEspeciales && (this.userSucursal || currentUser?.agenciaId)) {
        const suc = (this.userSucursal || '').toLowerCase();
        matchScope = Boolean(
          (currentUser?.agenciaId && String(op.sucursalId) === String(currentUser.agenciaId)) ||
          (suc && ((op.sucursal || '').toLowerCase().includes(suc) || suc.includes((op.sucursal || '').toLowerCase())))
        );
      }
      
      const term = (this.filtroTexto || '').trim().toLowerCase();
      const matchTexto = !term ||
                         (op.nombre || '').toLowerCase().includes(term) ||
                         (op.cedula || '').toLowerCase().includes(term) ||
                         (op.email || '').toLowerCase().includes(term);

      return matchScope && matchTexto;
    });

    if (this.filtrosGlobales.estado && this.filtrosGlobales.estado !== 'Todos') {
      resultados = resultados.filter(op => op.estado === this.filtrosGlobales.estado);
    }
    if (this.filtrosGlobales.sucursal && this.filtrosGlobales.sucursal !== 'Todas') {
      const suc = this.filtrosGlobales.sucursal.toLowerCase();
      resultados = resultados.filter(op => (op.sucursal || '').toLowerCase().includes(suc) || suc.includes((op.sucursal || '').toLowerCase()));
    }
    if (this.filtrosGlobales.bahia && this.filtrosGlobales.bahia !== 'Todas') {
      const bah = this.filtrosGlobales.bahia.toLowerCase();
      resultados = resultados.filter(op => (op.bahia || '').toLowerCase().includes(bah) || bah.includes((op.bahia || '').toLowerCase()));
    }
    if (this.filtrosGlobales.marca && this.filtrosGlobales.marca !== 'Todas') {
      resultados = resultados.filter(op => {
        const suc = this.sucursalService.getSucursalPorNombre(op.sucursal);
        return suc?.marcaNombre === this.filtrosGlobales.marca;
      });
    }

    return resultados;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  get paginatedOperadores(): Operador[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.operadoresFiltrados.slice(start, end);
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
  }

  abrirModalCrear(): void {
    if (!this.canGestionarOperadores) {
      this.toastService.warning('Sin Permiso', 'Solo un administrador puede registrar personal operativo.');
      return;
    }
    this.esEdicion = false;
    this.operadorEnEdicionId = undefined;
    this.conflictoAsignacion = null;
    this.modalConfirmarConflictoOpen = false;
    
    let defaultSucursal = this.sucursales[0];
    if (this.isGerente && this.userSucursal) {
      const found = this.sucursales.find(s => s.nombre.toLowerCase().includes(this.userSucursal!.toLowerCase()));
      if (found) defaultSucursal = found;
    }

    const defaultRol = this.isCoordServiciosEspeciales ? 'PULIDOR' : 'LAVADOR';

    this.formOperador = {
      nombre: '',
      cedula: '',
      telefono: '',
      rol: defaultRol,
      sucursalNombre: defaultSucursal?.nombre || '',
      sucursalId: defaultSucursal ? String(defaultSucursal.id) : '',
      bahiaNombre: 'Sin Bahía Asignada',
      bahiaId: '',
      estado: 'Activo'
    };

    if (this.formOperador.sucursalId) {
      this.cargarBahiasParaCrear(this.formOperador.sucursalId);
    }
    this.modalCrearOpen = true;
  }

  abrirModalEditar(op: Operador): void {
    if (!this.canGestionarOperadores) {
      this.toastService.warning('Sin Permiso', 'Solo un administrador puede editar personal operativo.');
      return;
    }
    this.esEdicion = true;
    this.operadorEnEdicionId = op.id;
    this.conflictoAsignacion = null;
    this.modalConfirmarConflictoOpen = false;

    const suc = this.sucursales.find(s => s.nombre === op.sucursal || String(s.id) === String(op.sucursalId));

    this.formOperador = {
      nombre: op.nombre,
      cedula: op.cedula,
      telefono: op.telefono || '',
      rol: op.rol || 'OPERADOR',
      sucursalNombre: op.sucursal,
      sucursalId: suc ? String(suc.id) : String(op.sucursalId || ''),
      bahiaNombre: op.bahia || 'Sin Bahía Asignada',
      bahiaId: op.bahiaId || '',
      estado: op.estado || 'Activo'
    };

    if (this.formOperador.sucursalId) {
      this.cargarBahiasParaCrear(this.formOperador.sucursalId);
    }
    this.modalCrearOpen = true;
  }

  cerrarModalCrear(): void {
    this.modalCrearOpen = false;
    this.esEdicion = false;
    this.operadorEnEdicionId = undefined;
    this.conflictoAsignacion = null;
    this.modalConfirmarConflictoOpen = false;
  }

  onSucursalOperadorChange(): void {
    const suc = this.sucursales.find(s => String(s.id) === String(this.formOperador.sucursalId) || s.nombre === this.formOperador.sucursalId);
    if (suc) {
      this.formOperador.sucursalNombre = suc.nombre;
      this.cargarBahiasParaCrear(String(suc.id));
    }
  }

  cargarBahiasParaCrear(sucursalId: string): void {
    this.bahiaService.getBahiasPorSucursal(sucursalId).subscribe(bahias => {
      this.listaBahiasOperador = (bahias || []).map(b => ({
        id: String(b.id),
        nombre: b.nombre,
        operadorAsignado: b.operadorAsignado && b.operadorAsignado !== 'Sin Asignar' ? b.operadorAsignado : null,
        operadorId: b.operadorId || null
      }));
      this.onBahiaCrearSelectChange();
    });
  }

  onBahiaCrearSelectChange(): void {
    if (!this.formOperador.bahiaId) {
      if (this.conflictoAsignacion?.contexto === 'crear') {
        this.conflictoAsignacion = null;
      }
      return;
    }
    const b = this.listaBahiasOperador.find(x => x.id === this.formOperador.bahiaId);
    if (b && b.operadorAsignado && b.operadorId && (!this.esEdicion || String(b.operadorId) !== String(this.operadorEnEdicionId))) {
      this.conflictoAsignacion = {
        bahiaId: b.id,
        bahiaNombre: b.nombre,
        operadorActualId: b.operadorId,
        operadorActualNombre: b.operadorAsignado,
        nuevoOperadorNombre: this.formOperador.nombre?.trim() || 'Nuevo Lavador',
        contexto: 'crear'
      };
    } else {
      if (this.conflictoAsignacion?.contexto === 'crear') {
        this.conflictoAsignacion = null;
      }
    }
  }

  guardarOperador(): void {
    if (!this.formOperador.nombre?.trim()) {
      this.toastService.warning('Campo Obligatorio', 'Por favor ingrese el nombre completo del lavador.');
      return;
    }
    if (!this.formOperador.cedula?.trim()) {
      this.toastService.warning('Campo Obligatorio', 'Por favor ingrese la cédula de identidad del operador.');
      return;
    }
    if (!this.formOperador.sucursalId && !this.formOperador.sucursalNombre) {
      this.toastService.warning('Campo Obligatorio', 'Por favor seleccione la agencia de asignación.');
      return;
    }

    this.onBahiaCrearSelectChange();

    if (this.conflictoAsignacion && this.conflictoAsignacion.contexto === 'crear') {
      this.modalConfirmarConflictoOpen = true;
      return;
    }

    this.procederGuardarOperador();
  }

  procederGuardarOperador(): void {
    const suc = this.sucursales.find(s => String(s.id) === String(this.formOperador.sucursalId) || s.nombre === this.formOperador.sucursalNombre);
    const bahiaSelected = this.listaBahiasOperador.find(b => b.id === this.formOperador.bahiaId);

    if (this.esEdicion && this.operadorEnEdicionId) {
      this.operadorService.actualizarOperador({
        id: this.operadorEnEdicionId,
        nombre: this.formOperador.nombre.trim(),
        cedula: this.formOperador.cedula.trim(),
        telefono: this.formOperador.telefono?.trim() || '',
        rol: this.formOperador.rol,
        sucursal: suc ? suc.nombre : this.formOperador.sucursalNombre,
        sucursalId: suc ? suc.id : this.formOperador.sucursalId,
        bahia: bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada',
        bahiaId: this.formOperador.bahiaId || null,
        estado: this.formOperador.estado,
        fechaAsignacion: new Date().toISOString().split('T')[0],
        vehiculosAtendidos: 0,
        serviciosRealizados: 0,
        promedioDiario: 0,
        ranking: 1,
        email: ''
      }).subscribe({
        next: (act) => {
          this.toastService.success('Operador Actualizado', `Datos de ${act.nombre} actualizados en base de datos.`);
          this.cerrarModalCrear();
          this.operadorService.getOperadores().subscribe();
        },
        error: (err) => {
          this.toastService.error('Error al Actualizar', err?.error?.message || 'Error al actualizar en base de datos.');
        }
      });
    } else {
      this.operadorService.crearOperador({
        nombre: this.formOperador.nombre.trim(),
        cedula: this.formOperador.cedula.trim(),
        telefono: this.formOperador.telefono?.trim() || '',
        rol: this.formOperador.rol,
        sucursal: suc ? suc.nombre : this.formOperador.sucursalNombre,
        sucursalId: suc ? suc.id : this.formOperador.sucursalId,
        bahia: bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada',
        bahiaId: this.formOperador.bahiaId || null,
        estado: this.formOperador.estado
      }).subscribe({
        next: (nuevo) => {
          this.toastService.success(
            this.isCoordServiciosEspeciales ? 'Pulidor Registrado en BD' : 'Lavador Registrado en BD',
            `Se registró a ${nuevo.nombre} asignado a ${nuevo.sucursal} (${nuevo.bahia}).`
          );
          this.cerrarModalCrear();
          this.cargarDatos();
        },
        error: (err) => {
          this.toastService.error(
            'Error al Registrar', 
            err?.error?.message || (this.isCoordServiciosEspeciales ? 'No se pudo guardar el pulidor en la base de datos.' : 'No se pudo guardar el lavador en la base de datos.')
          );
        }
      });
    }
  }

  abrirModalAsignar(op: Operador): void {
    if (!this.canGestionarOperadores) {
      this.toastService.warning('Sin Permiso', 'Solo un administrador puede asignar bahías.');
      return;
    }
    if (op.estado === 'Inactivo') {
      this.toastService.warning('Lavador Inactivo', 'No se puede asignar bahías a un colaborador inactivo. Debe activarlo primero.');
      return;
    }
    this.operadorSeleccionado = op;
    this.conflictoAsignacion = null;
    this.modalConfirmarConflictoOpen = false;

    const suc = this.sucursales.find(s => s.nombre === op.sucursal || String(s.id) === String(op.sucursalId)) || this.sucursales[0];

    this.formAsignarBahia = {
      operadorId: op.id,
      sucursalId: suc ? String(suc.id) : '',
      sucursalNombre: suc ? suc.nombre : op.sucursal,
      bahiaId: op.bahiaId || '',
      bahiaNombre: op.bahia || 'Sin Bahía Asignada',
      motivo: ''
    };

    if (this.formAsignarBahia.sucursalId) {
      this.cargarBahiasParaAsignar(this.formAsignarBahia.sucursalId);
    }
    this.modalAsignarBahiaOpen = true;
  }

  onSucursalAsignarChange(): void {
    const suc = this.sucursales.find(s => String(s.id) === String(this.formAsignarBahia.sucursalId));
    if (suc) {
      this.formAsignarBahia.sucursalNombre = suc.nombre;
      this.cargarBahiasParaAsignar(String(suc.id));
    }
  }

  cargarBahiasParaAsignar(sucursalId: string): void {
    this.bahiaService.getBahiasPorSucursal(sucursalId).subscribe(bahias => {
      this.listaBahiasDisponibles = (bahias || []).map(b => ({
        id: String(b.id),
        nombre: b.nombre,
        operadorAsignado: b.operadorAsignado && b.operadorAsignado !== 'Sin Asignar' ? b.operadorAsignado : null,
        operadorId: b.operadorId || null
      }));
      this.onBahiaAsignarSelectChange();
    });
  }

  onBahiaAsignarSelectChange(): void {
    if (!this.formAsignarBahia.bahiaId) {
      if (this.conflictoAsignacion?.contexto === 'asignar') {
        this.conflictoAsignacion = null;
      }
      return;
    }
    const b = this.listaBahiasDisponibles.find(x => x.id === this.formAsignarBahia.bahiaId);
    if (b && b.operadorAsignado && b.operadorId && (!this.operadorSeleccionado || String(b.operadorId) !== String(this.operadorSeleccionado.id))) {
      this.conflictoAsignacion = {
        bahiaId: b.id,
        bahiaNombre: b.nombre,
        operadorActualId: b.operadorId,
        operadorActualNombre: b.operadorAsignado,
        nuevoOperadorNombre: this.operadorSeleccionado?.nombre || 'Nuevo Lavador',
        contexto: 'asignar'
      };
    } else {
      if (this.conflictoAsignacion?.contexto === 'asignar') {
        this.conflictoAsignacion = null;
      }
    }
  }

  guardarAsignacionBahia(): void {
    if (!this.operadorSeleccionado) return;

    this.onBahiaAsignarSelectChange();

    if (this.conflictoAsignacion && this.conflictoAsignacion.contexto === 'asignar') {
      this.modalConfirmarConflictoOpen = true;
      return;
    }

    this.procederGuardarAsignacion();
  }

  procederGuardarAsignacion(): void {
    if (!this.operadorSeleccionado) return;

    const op = this.operadorSeleccionado;
    const motivo = this.formAsignarBahia.motivo?.trim() || 'Reasignación operativa de bahía';
    const usuarioAccion = this.authService.getCurrentUser()?.nombre || 'Supervisor';
    const bahiaSelected = this.listaBahiasDisponibles.find(b => b.id === this.formAsignarBahia.bahiaId);
    const bahiaNombre = bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada';

    this.operadorService.reasignarOperador(
      op.id,
      this.formAsignarBahia.sucursalNombre,
      bahiaNombre,
      motivo,
      usuarioAccion,
      this.formAsignarBahia.bahiaId || undefined
    ).subscribe(actualizado => {
      this.toastService.success(
        'Asignación Guardada en BD',
        `Lavador ${op.nombre} asignado a ${bahiaNombre} en la base de datos.`
      );
      this.modalAsignarBahiaOpen = false;
      this.conflictoAsignacion = null;
      this.operadorService.getOperadores().subscribe();
    });
  }

  ejecutarGuardadoConConflicto(): void {
    this.modalConfirmarConflictoOpen = false;
    if (this.conflictoAsignacion?.contexto === 'asignar') {
      this.procederGuardarAsignacion();
    } else if (this.conflictoAsignacion?.contexto === 'crear') {
      this.procederGuardarOperador();
    }
  }

  desactivarAsignacion(op: Operador): void {
    if (!this.canGestionarOperadores) {
      this.toastService.warning('Sin Permiso', 'Solo un administrador puede desasignar bahías.');
      return;
    }
    const anteriorBahia = op.bahia;
    const usuarioAccion = this.authService.getCurrentUser()?.nombre || 'Supervisor';
    this.operadorService.reasignarOperador(
      op.id,
      op.sucursal,
      'Sin Bahía Asignada',
      `Desvinculación voluntaria de ${anteriorBahia}`,
      usuarioAccion
    ).subscribe(() => {
      this.toastService.warning(
        'Asignación Desactivada',
        `Se desvinculó a ${op.nombre} de ${anteriorBahia} en la base de datos.`
      );
      this.operadorService.getOperadores().subscribe();
    });
  }

  verFichaOperador(op: Operador): void {
    this.operadorSeleccionado = op;
    this.operadorService.getHistorialPorOperador(op.id).subscribe(h => {
      this.historialOperador = h;
      this.modalFichaOpen = true;
    });
  }
}
