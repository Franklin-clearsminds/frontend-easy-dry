import { TablaFijaDirective } from '../../shared/directives/tabla-fija.directive';
import { PasswordRequisitosComponent } from '../../shared/components/password-requisitos/password-requisitos.component';
import { AvatarSrcDirective } from '../../shared/directives/avatar-src.directive';
import { motivoPasswordDebil } from '../../core/utils/password-politica';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { OperadorService, ConsultaOperadores } from '../../core/services/operador.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BUSQUEDA_DEBOUNCE_MS, BUSQUEDA_MIN_CARACTERES, PAGE_SIZE_TABLA } from '../../core/config/paginacion';
import { TablaServidor } from '../../core/utils/tabla-servidor';
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
  imports: [TablaFijaDirective, AvatarSrcDirective, CommonModule, FormsModule, LucideAngularModule, ModalComponent, PaginationComponent, FilterBarComponent, PasswordRequisitosComponent],
  template: `
    <div class="space-y-6 animate-fade-in">
      
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <div class="flex items-center gap-2.5">
            <span class="p-2 rounded-xl bg-easydry-blue/10 text-easydry-blue">
              <i-lucide aria-hidden="true" [name]="isCoordServiciosEspeciales ? 'sparkles' : 'user-check'" class="w-5 h-5"></i-lucide>
            </span>
            <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">{{ isCoordServiciosEspeciales ? 'Gestión de Pulidores' : 'Gestión de Lavadores' }}</h1>
          </div>
          <p class="text-slate-500 text-xs mt-1">{{ isCoordServiciosEspeciales ? 'Directorio de personal de servicios especiales (pulidores fijos y móviles), asignación a bahía y trazabilidad.' : 'Directorio de personal de lavado, asignación directa a agencia y bahía, productividad y trazabilidad histórica (100% Base de Datos).' }}</p>
          <div class="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-medium">
            <i-lucide aria-hidden="true" name="shield" class="w-3.5 h-3.5 text-emerald-600 shrink-0"></i-lucide>
            @if (isCoordServiciosEspeciales) {
              <span><strong>Rol Pulidor:</strong> Especialistas en pulido técnico, corrección de pintura y acabados especiales (Fijos en Agencia o Móviles Multisede).</span>
            } @else {
              <span><strong>Rol Lavador:</strong> Registro y constancia técnica en bahía para trazabilidad. El acceso al sistema y registro de OTs lo efectúa el <strong>Líder</strong>.</span>
            }
          </div>
        </div>

        @if (canRegistrar) {
          <button
            type="button"
            (click)="abrirModalCrear()"
            class="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition-all cursor-pointer">
            <i-lucide aria-hidden="true" [name]="isCoordServiciosEspeciales ? 'sparkles' : 'user-plus'" class="w-4 h-4"></i-lucide>
            <span>{{ isCoordServiciosEspeciales ? 'Registrar Pulidor' : 'Registrar Lavador' }}</span>
          </button>
        }
      </div>

      <!-- Global Filter Bar (Filtros y Búsqueda Unificados) -->
      <app-filter-bar 
        [showSucursal]="verTodasLasAgencias" 
        [showOperador]="false"
        [showBahia]="true"
        [showCliente]="true"
        [showEstado]="true"
        [showRol]="rolesFiltro.length > 1"
        [listaRoles]="rolesFiltro"
        [showFechas]="false"
        [showBusqueda]="true"
        [placeholderBusqueda]="isCoordServiciosEspeciales ? 'Buscar pulidor por nombre, apellido o cédula...' : 'Buscar por nombre, apellido o cédula...'"
        [listaEstados]="['Todos', 'Activo', 'Inactivo']"
        (filterChange)="aplicarNuevosFiltros($event)">
      </app-filter-bar>

      <!-- Loader / Skeleton mientras cargan los datos -->
      @if (tabla.cargando && tabla.filas.length === 0) {
        <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-10 flex flex-col items-center justify-center gap-3">
          <div class="w-10 h-10 border-4 border-easydry-blue border-t-transparent rounded-full animate-spin"></div>
          <p class="text-xs font-bold text-slate-500">Cargando {{ isCoordServiciosEspeciales ? 'pulidores' : 'lavadores' }} desde base de datos...</p>
        </div>
      }

      <!-- Operadores Table -->
      <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry overflow-hidden">
        <div appTablaFija class="overflow-x-auto">
          <table class="w-full min-w-[720px] text-left text-xs">
            <thead class="bg-slate-50 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th scope="col" class="py-3.5 px-4">{{ isCoordServiciosEspeciales ? 'Pulidor' : 'Lavador' }}</th>
                <th scope="col" class="py-3.5 px-4">Rol Operativo</th>
                <th scope="col" class="py-3.5 px-4">Estado</th>
                <th scope="col" class="py-3.5 px-4">Agencia Asignada</th>
                <th scope="col" class="py-3.5 px-4">Bahía Asignada</th>
                @if (puedeVerFicha) {
                  <th scope="col" class="py-3.5 px-4">Productividad</th>
                }
                <th scope="col" class="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              @if (tabla.error) {
                <tr>
                  <td colspan="7" class="py-10 px-4">
                    <div role="alert" class="flex flex-col items-center gap-3 text-center">
                      <div class="estado-error">{{ tabla.error }}</div>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="tabla.cargar(true)">Reintentar</button>
                    </div>
                  </td>
                </tr>
              }
              @if (tabla.inicializada && !tabla.cargando && !tabla.error && tabla.filas.length === 0) {
                <tr>
                  <td colspan="7" class="py-12 text-center text-slate-500">
                    <i-lucide aria-hidden="true" name="user-x" class="w-8 h-8 mx-auto text-slate-300 mb-2"></i-lucide>
                    <p class="font-bold text-sm text-slate-600">No se encontraron {{ isCoordServiciosEspeciales ? 'pulidores' : 'lavadores' }} registrados</p>
                    <p class="text-xs text-slate-500 mt-1">Haga clic en "{{ isCoordServiciosEspeciales ? 'Registrar Pulidor' : 'Registrar Lavador' }}" para dar de alta el primer {{ isCoordServiciosEspeciales ? 'especialista' : 'colaborador' }} en el sistema.</p>
                  </td>
                </tr>
              }
              @for (op of tabla.filas; track op.id) {
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <!-- Operador -->
                  <td class="py-3.5 px-4">
                    <div class="flex items-center gap-3">
                      @if (op.avatar) {
                        <img loading="lazy" decoding="async"
                          [appAvatar]="op.avatar" [appAvatarIniciales]="(op.nombre || '?').charAt(0)"
                          alt="Foto de operador"
                          class="w-9 h-9 rounded-full object-cover border-2 border-easydry-green shrink-0">
                      } @else {
                        <div class="w-9 h-9 rounded-full bg-slate-100 border-2 border-easydry-green shrink-0 flex items-center justify-center text-xs font-extrabold text-slate-500">
                          {{ (op.nombre || '?').charAt(0) }}
                        </div>
                      }
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ op.nombre }}</p>
                        @if (op.cedula) {
                          <p class="text-xs text-slate-500 font-mono">CI: {{ op.cedula }}</p>
                        }
                        <p class="text-xs text-slate-500 mt-0.5">
                          Alta: <span class="font-mono text-slate-600">{{ op.fechaCreacion ? (op.fechaCreacion | date:'dd/MM/yyyy') : (op.fechaAsignacion || '-') }}</span>
                          @if (op.fechaModificacion && op.fechaModificacion !== op.fechaCreacion) {
                            • Act: <span class="font-mono text-slate-600">{{ op.fechaModificacion | date:'dd/MM/yyyy' }}</span>
                          }
                        </p>
                        @if (op.email && !op.email.endsWith('@easydry.internal')) {
                          <p class="text-xs text-slate-500">{{ op.email }}</p>
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
                      class="px-2.5 py-0.5 rounded-full text-xs font-extrabold"
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
                    @if (!esLavador(op.rol)) {
                      <span class="text-slate-400 text-xs">No aplica</span>
                    } @else if (op.bahia && !op.bahia.includes('Sin') && !op.bahia.includes('undefined') && !op.bahia.includes('null')) {
                      <span class="px-2.5 py-1 rounded-lg bg-easydry-blue/10 text-easydry-blue font-bold text-xs inline-flex items-center gap-1">
                        <i-lucide aria-hidden="true" name="layout-grid" class="w-3 h-3"></i-lucide>
                        {{ op.bahia }}
                      </span>
                    } @else {
                      <span class="text-slate-500 italic text-xs">Disponible / En Reserva</span>
                    }
                  </td>

                  <!-- Productividad -->
                  @if (puedeVerFicha) {
                  <td class="py-3.5 px-4">
                    <div class="text-xs">
                      <span class="font-extrabold text-easydry-green-text">{{ op.vehiculosAtendidos }} Autos</span>
                      <p class="text-xs text-slate-500">Servicios en BD</p>
                    </div>
                  </td>
                  }

                  <!-- Acciones -->
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-1">
                      @if (canEditar) {
                        <!-- Editar Operador -->
                        <button
                          type="button"
                          (click)="abrirModalEditar(op)"
                          [title]="isCoordServiciosEspeciales ? 'Editar pulidor' : 'Editar lavador'"
                          class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" [attr.aria-label]="isCoordServiciosEspeciales ? 'Editar pulidor' : 'Editar lavador'">
                          <i-lucide aria-hidden="true" name="edit-3" class="w-4 h-4"></i-lucide>
                        </button>

                        }
                      @if (canAsignarBahia && esLavador(op.rol)) {
                        <!-- Asignar o Cambiar Bahía -->
                        <button
                          type="button"
                          (click)="abrirModalAsignar(op)"
                          [title]="op.bahia && !op.bahia.includes('Sin') && op.bahia !== 'undefined' ? 'Cambiar bahía' : 'Asignar a bahía'"
                          class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" [attr.aria-label]="op.bahia && !op.bahia.includes('Sin') && op.bahia !== 'undefined' ? 'Cambiar bahía' : 'Asignar a bahía'">
                          <i-lucide aria-hidden="true" name="refresh-cw" class="w-4 h-4"></i-lucide>
                        </button>
                      }
                      @if (canQuitarBahia && esLavador(op.rol)) {
                        <!-- Desactivar Asignación -->
                        @if (op.bahia && !op.bahia.includes('Sin') && op.bahia !== 'undefined') {
                          <button
                            type="button"
                            (click)="desactivarAsignacion(op)"
                            title="Desactivar asignación de bahía"
                            class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer" aria-label="Desactivar asignación de bahía">
                            <i-lucide aria-hidden="true" name="user-x" class="w-4 h-4"></i-lucide>
                          </button>
                        }
                      }

                      <!-- Ver Productividad & Ficha -->
                      @if (puedeVerFicha) {
                      <button 
                        type="button"
                        (click)="verFichaOperador(op)" 
                        title="Ver productividad y ficha técnica"
                        class="p-1.5 min-w-9 min-h-9 inline-flex items-center justify-center text-slate-500 hover:text-easydry-blue hover:bg-slate-100 rounded-lg transition-colors cursor-pointer" aria-label="Ver productividad y ficha técnica">
                        <i-lucide aria-hidden="true" name="bar-chart-2" class="w-4 h-4"></i-lucide>
                      </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        
        <app-pagination 
          [totalItems]="tabla.total" 
          [currentPage]="tabla.pagina" 
          [pageSize]="tabla.pageSize" [loading]="tabla.cargando"
          (pageChange)="onPageChange($event)"
          (pageSizeChange)="onPageSizeChange($event)">
        </app-pagination>
      </div>

      <!-- Modal Crear / Registrar Nuevo Operador -->
      <app-modal
        [isOpen]="modalCrearOpen" size="lg"
        [title]="esEdicion ? (isCoordServiciosEspeciales ? 'Editar Datos de Pulidor' : 'Editar Datos de Lavador') : (isCoordServiciosEspeciales ? 'Registrar Nuevo Pulidor' : 'Registrar Nuevo Lavador')"
        [icon]="esEdicion ? 'pencil' : (isCoordServiciosEspeciales ? 'sparkles' : 'user-plus')"
        (close)="cerrarModalCrear()">
        
        <div class="space-y-4">
          <!-- Aclaratoria: Personal operativo sólo para constancia, no líder ni usuario de sistema -->
          <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs flex items-start gap-2.5">
            <i-lucide aria-hidden="true" name="info" class="w-4 h-4 text-blue-600 shrink-0 mt-0.5"></i-lucide>
            <div>
              <p class="font-bold">{{ isCoordServiciosEspeciales ? 'Control y Constancia de Pulidores Técnicos' : 'Constancia y Control de Personal Operativo' }}</p>
              <p class="text-xs text-blue-800 mt-0.5">
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
            <label for="operadores-f1" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Nombre Completo <span class="text-rose-500">*</span>
            </label>
            <input id="operadores-f1"
              type="text"
              [(ngModel)]="formOperador.nombre"
              placeholder="Ej. Pedro José Ramírez"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-easydry-blue">
          </div>

          <!-- Cédula y Teléfono -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="operadores-f2" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Cédula de Identidad / CI <span class="text-rose-500">*</span>
              </label>
              <input id="operadores-f2"
                type="text"
                [(ngModel)]="formOperador.cedula"
                placeholder="Ej. 1729384756"
                maxlength="13"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-easydry-blue">
            </div>

            <div>
              <label for="operadores-f3" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Teléfono / Celular (Opcional)
              </label>
              <input id="operadores-f3"
                type="text"
                [disabled]="datosBloqueados"
                [(ngModel)]="formOperador.telefono"
                placeholder="Ej. 0998765432"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-easydry-blue">
            </div>
          </div>

          <!-- Contraseña inicial (solo al registrar): la define quien registra y se la comunica al operador -->
          @if (!esEdicion) {
            <div>
              <label for="operadores-pw" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Contraseña de acceso
                @if (esLavador(formOperador.rol)) {
                  <span class="text-slate-400 font-normal lowercase">(opcional, se autogenera si se omite)</span>
                } @else {
                  <span class="text-rose-500">*</span>
                }
              </label>
              <div class="relative">
                <input id="operadores-pw"
                  [type]="verPassword ? 'text' : 'password'"
                  autocomplete="new-password"
                  [(ngModel)]="formOperador.password"
                  [placeholder]="esLavador(formOperador.rol) ? 'Opcional (se autogenera si se deja vacío)' : 'Mínimo 10 caracteres'"
                  class="w-full p-2.5 pr-10 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-easydry-blue/30"
                  [ngClass]="formOperador.password && motivoPassword ? 'border-rose-500' : 'border-slate-200'" />
                <button type="button" (click)="verPassword = !verPassword" class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-easydry-blue cursor-pointer" [attr.aria-label]="verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                  <i-lucide aria-hidden="true" [name]="verPassword ? 'eye-off' : 'eye'" class="w-4 h-4"></i-lucide>
                </button>
              </div>
              <app-password-requisitos [password]="formOperador.password"></app-password-requisitos>
              <p class="text-xs mt-2 text-slate-500">
                {{ esLavador(formOperador.rol) ? 'El lavador no usa el software (el líder registra OTs). Si la defines, compártela de forma segura.' : 'Anótala: se la entregas al operador y solo un administrador puede cambiarla después.' }}
              </p>
            </div>
          }

          <!-- Rol Operativo y Estado -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @if (!esEdicion) {
            <div>
              <label for="operadores-f4" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Rol Operativo
              </label>
              <select id="operadores-f4"
                [(ngModel)]="formOperador.rol"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
                @for (r of rolesParaFormulario; track r) {
                  <option [value]="r">{{ r }}</option>
                }
              </select>
            </div>
            }

            <div>
              <label for="operadores-f5" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Estado del {{ isCoordServiciosEspeciales ? 'Pulidor' : 'Lavador' }}
              </label>
              <select id="operadores-f5"
                [disabled]="datosBloqueados"
                [(ngModel)]="formOperador.estado"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          <!-- Agencia / Sucursal Asignada -->
          <div>
            <label for="operadores-f6" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Agencia / Sucursal Asignada <span class="text-rose-500">*</span>
            </label>
            <select id="operadores-f6"
              [disabled]="datosBloqueados"
              [(ngModel)]="formOperador.sucursalId"
              (change)="onSucursalOperadorChange()"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-75 disabled:bg-slate-100 outline-none focus:ring-2 focus:ring-easydry-blue">
              @for (s of sucursales; track s.id) {
                <option [value]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
              }
            </select>
          </div>

          <!-- Bahía de Asignación: solo para lavadores -->
          @if (esLavador(formOperador.rol) && bahiaVisibleEnFormulario) {
          <div>
            <label for="operadores-f7" class="block text-xs font-bold text-slate-700 uppercase mb-1">
              Bahía de Asignación
            </label>
            <select id="operadores-f7"
              [(ngModel)]="formOperador.bahiaId"
              (change)="onBahiaCrearSelectChange()"
              class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-easydry-blue">
              @if (puedeElegirSinBahia) {
                <option value="">Sin Bahía Asignada (Personal en Reserva / Disponible)</option>
              }
              @for (b of bahiasOfrecidas; track b.id) {
                <option [value]="b.id">{{ b.nombre }} - {{ b.operadorAsignado ? b.operadorAsignado : 'Sin asignar' }}</option>
              }
            </select>
            @if (conflictoAsignacion && conflictoAsignacion.contexto === 'crear') {
              <div class="p-3 bg-amber-50 rounded-xl border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5 mt-2 animate-fade-in">
                <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i-lucide>
                <div>
                  <p class="font-bold">Bahía sin cupo disponible</p>
                  <p class="text-xs text-amber-800 mt-0.5">
                    La <strong>{{ conflictoAsignacion.bahiaNombre }}</strong> ya tiene el máximo de <strong>{{ conflictoAsignacion.maxLavadoresPorBahia }}</strong> lavador(es) permitidos ({{ conflictoAsignacion.operadoresActualesNombres }}).
                    Quita a alguno de esa bahía o elige otra para poder asignar a este lavador.
                  </p>
                </div>
              </div>
            }
            <p class="text-xs text-slate-500 mt-1">
              El lavador quedará vinculado de inmediato en la base de datos a la bahía seleccionada.
            </p>
          </div>
          } @else {
            <p class="text-xs text-slate-500">Este rol no trabaja en bahía: solo los lavadores se asignan a una.</p>
          }
        </div>

        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="cerrarModalCrear()"
            class="btn btn-secondary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="x" class="w-4 h-4"></i-lucide>
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            (click)="guardarOperador()"
            class="btn btn-primary w-full sm:w-auto">
            <i-lucide aria-hidden="true" [name]="esEdicion ? 'save' : 'user-plus'" class="w-4 h-4"></i-lucide>
            <span>{{ esEdicion ? 'Actualizar en Base de Datos' : 'Registrar y Asignar en BD' }}</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Asignar / Cambiar Bahía -->
      <app-modal
        [isOpen]="modalAsignarBahiaOpen" size="md"
        [title]="'Asignar / Cambiar Bahía: ' + (operadorSeleccionado?.nombre || '')"
        icon="layout-grid"
        (close)="modalAsignarBahiaOpen = false">
        @if (operadorSeleccionado) {
          <div class="space-y-4">
            <div class="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 text-xs">
              Ubicación actual del lavador: <strong>{{ operadorSeleccionado.sucursal }}</strong> — <strong>{{ operadorSeleccionado.bahia }}</strong>
            </div>

            <div>
              <label for="operadores-f8" class="block text-xs font-bold text-slate-700 uppercase mb-1">
                Sucursal / Agencia
              </label>
              <select id="operadores-f8"
                [(ngModel)]="formAsignarBahia.sucursalId"
                (change)="onSucursalAsignarChange()"
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 disabled:opacity-75 disabled:bg-slate-100">
                @for (s of sucursales; track s.id) {
                  <option [value]="s.id">{{ s.nombre }} ({{ s.ciudad }})</option>
                }
              </select>
            </div>

            <div>
              <label for="operadores-f9" class="block text-xs font-bold text-slate-700 uppercase mb-1">Bahía de Destino</label>
              <select id="operadores-f9"
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
                  <i-lucide aria-hidden="true" name="alert-triangle" class="w-4 h-4 text-amber-600 shrink-0 mt-0.5"></i-lucide>
                  <div>
                    <p class="font-bold">Bahía sin cupo disponible</p>
                    <p class="text-xs text-amber-800 mt-0.5">
                      La <strong>{{ conflictoAsignacion.bahiaNombre }}</strong> ya tiene el máximo de <strong>{{ conflictoAsignacion.maxLavadoresPorBahia }}</strong> lavador(es) permitidos ({{ conflictoAsignacion.operadoresActualesNombres }}).
                      Quita a alguno de esa bahía o elige otra para poder asignar a <strong>{{ conflictoAsignacion.nuevoOperadorNombre }}</strong>.
                    </p>
                  </div>
                </div>
              }
            </div>

            <div>
              <label for="operadores-f10" class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Movimiento / Reasignación</label>
              <input id="operadores-f10"
                type="text"
                [(ngModel)]="formAsignarBahia.motivo"
                placeholder="Ej. Cobertura por alta demanda, rotación periódica..."
                class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800">
            </div>
          </div>
        }

        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 w-full">
          <button
            type="button"
            (click)="modalAsignarBahiaOpen = false"
            class="btn btn-secondary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="x" class="w-4 h-4"></i-lucide>
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            (click)="guardarAsignacionBahia()"
            class="btn btn-primary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="check" class="w-4 h-4"></i-lucide>
            <span>Confirmar en Base de Datos</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal Ficha de Operador & Productividad -->
      <app-modal 
        [isOpen]="modalFichaOpen" size="xl" 
        [title]="'Ficha de Lavador & Productividad: ' + (operadorSeleccionado?.nombre || '')" 
        icon="trophy"
        (close)="modalFichaOpen = false">
        
        @if (operadorSeleccionado) {
          <div class="space-y-6">
            
            <!-- Operator Profile Banner -->
            <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <div class="flex items-center gap-4">
                <img loading="lazy" decoding="async" [appAvatar]="operadorSeleccionado.avatar" [appAvatarIniciales]="(operadorSeleccionado.nombre || '?').charAt(0)" alt="Foto de operador" class="w-14 h-14 rounded-full object-cover border-2 border-easydry-green shrink-0">
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <h3 class="font-extrabold text-slate-900 text-lg font-outfit">{{ operadorSeleccionado.nombre }}</h3>
                    <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold" [ngClass]="operadorSeleccionado.estado === 'Activo' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'">
                      {{ operadorSeleccionado.estado }}
                    </span>
                  </div>
                  <p class="text-xs text-slate-500">Cédula: <strong>{{ operadorSeleccionado.cedula }}</strong> • Rol: <strong>{{ operadorSeleccionado.rol }}</strong></p>
                  <p class="text-xs text-easydry-blue font-bold mt-0.5">Ubicación Actual: {{ operadorSeleccionado.sucursal }} ({{ operadorSeleccionado.bahia }})</p>
                </div>
              </div>

              <!-- Metadata de Creación & Modificación en BD -->
              <div class="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-600 font-mono bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div>
                  <span class="text-slate-500 block text-[11px] uppercase font-bold">Fecha de Alta / Creación (BD):</span>
                  <b class="text-slate-800">{{ operadorSeleccionado.fechaCreacion ? (operadorSeleccionado.fechaCreacion | date:'dd/MM/yyyy HH:mm') : (operadorSeleccionado.fechaAsignacion || '-') }}</b>
                </div>
                @if (operadorSeleccionado.fechaModificacion) {
                  <div>
                    <span class="text-slate-500 block text-[11px] uppercase font-bold">Última Modificación (BD):</span>
                    <b class="text-slate-800">{{ operadorSeleccionado.fechaModificacion | date:'dd/MM/yyyy HH:mm' }}</b>
                  </div>
                }
              </div>
            </div>

            <!-- Productivity Stats Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[11px] text-slate-500 uppercase font-bold block">Vehículos Atendidos</span>
                <span class="font-extrabold text-slate-900 text-base mt-0.5 block">{{ operadorSeleccionado.vehiculosAtendidos }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[11px] text-slate-500 uppercase font-bold block">Servicios Registrados</span>
                <span class="font-extrabold text-easydry-blue text-base mt-0.5 block">{{ operadorSeleccionado.serviciosRealizados }}</span>
              </div>
              <div class="p-3 bg-slate-50 rounded-xl border">
                <span class="text-[11px] text-slate-500 uppercase font-bold block">Estado Actual</span>
                <span class="font-extrabold text-emerald-600 text-base mt-0.5 block">{{ operadorSeleccionado.estado }}</span>
              </div>
            </div>

            <!-- Assignment History Log -->
            <div class="border border-slate-200 rounded-2xl p-4 space-y-3">
              <h4 class="font-bold text-slate-900 text-xs uppercase tracking-wider">Historial de Asignaciones a Sucursales & Bahías (BD)</h4>
              
              <div class="space-y-2">
                @if (historialOperador.length === 0) {
                  <p class="text-xs text-slate-500 italic py-3 text-center">No hay registros históricos de asignación para este lavador.</p>
                }
                @for (h of historialOperador; track h.id) {
                  <div class="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:border-easydry-blue/30 transition-colors">
                    <div>
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-slate-900">{{ h.sucursal }} — {{ h.bahia }}</span>
                        @if (!h.fechaFin) {
                          <span class="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Bahía Actual
                          </span>
                        } @else {
                          <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                            Bahía Previa
                          </span>
                        }
                      </div>
                      <p class="text-xs text-slate-500 mt-0.5">Motivo: <strong>{{ h.motivo }}</strong> • Registrado por: <strong>{{ h.realizadoPor }}</strong></p>
                    </div>
                    <div class="text-right font-mono text-xs font-semibold text-slate-600">
                      <span class="text-slate-800">{{ h.fechaInicio }}</span>
                      @if (h.fechaFin) {
                        <span> &rarr; <span class="text-slate-500">{{ h.fechaFin }}</span></span>
                      } @else {
                        <span class="text-easydry-green-text font-bold block text-xs">&bull; En funciones</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>

          </div>
        }

        <div modal-footer class="flex flex-col sm:flex-row items-stretch sm:items-center justify-end w-full">
          <button 
            type="button"
            (click)="modalFichaOpen = false" 
            class="btn btn-secondary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="x" class="w-4 h-4"></i-lucide>
            <span>Cerrar Ficha</span>
          </button>
        </div>
      </app-modal>

      <!-- Modal de bloqueo: la bahía ya llegó a su máximo de lavadores configurado en la agencia.
           Antes esto prometía "reasignar" (el lavador que ya estaba quedaba desvinculado), pero el
           backend no reemplaza a nadie: si ya está al máximo, simplemente RECHAZA la asignación. Por
           eso ya no hay botón de "continuar de todos modos" — solo se puede cerrar y elegir otra
           bahía o liberar un cupo primero. Ver conversación con el usuario del 2026-09-30. -->
      <app-modal
        [isOpen]="modalConfirmarConflictoOpen" size="sm"
        title="Bahía sin cupo disponible"
        icon="alert-triangle"
        (close)="modalConfirmarConflictoOpen = false">

        <div class="space-y-4 py-1">
          <div class="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <i-lucide aria-hidden="true" name="alert-triangle" class="w-5 h-5"></i-lucide>
            </div>
            <div>
              <h4 class="text-sm font-bold text-slate-900">Esta bahía ya llegó a su máximo de lavadores</h4>
              <p class="text-xs text-amber-900 mt-1 leading-relaxed">
                La agencia permite hasta <strong>{{ conflictoAsignacion?.maxLavadoresPorBahia }}</strong> lavador(es) simultáneos en
                <strong>{{ conflictoAsignacion?.bahiaNombre }}</strong>, y ya están asignados: <strong>{{ conflictoAsignacion?.operadoresActualesNombres }}</strong>.
                Para asignar a <strong>{{ conflictoAsignacion?.nuevoOperadorNombre }}</strong> ahí, primero quita a uno de los actuales o elige otra bahía con cupo.
              </p>
            </div>
          </div>

          <div class="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Bahía seleccionada:</span>
              <span class="font-bold text-slate-900">{{ conflictoAsignacion?.bahiaNombre }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Máximo permitido:</span>
              <span class="font-bold text-slate-900">{{ conflictoAsignacion?.maxLavadoresPorBahia }} lavador(es)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-500 font-bold uppercase">Ya asignados:</span>
              <span class="font-bold text-rose-600">{{ conflictoAsignacion?.operadoresActualesNombres }}</span>
            </div>
          </div>
        </div>

        <div modal-footer class="flex items-stretch sm:items-center justify-end w-full">
          <button
            type="button"
            (click)="modalConfirmarConflictoOpen = false"
            class="btn btn-secondary w-full sm:w-auto">
            <i-lucide aria-hidden="true" name="x" class="w-4 h-4"></i-lucide>
            <span>Entendido, elegir otra bahía</span>
          </button>
        </div>
      </app-modal>

    </div>
  `
})
export class OperadoresComponent implements OnInit, OnDestroy {
  operadores: Operador[] = [];
  sucursales: Sucursal[] = [];
  operadorSeleccionado?: Operador;
  historialOperador: HistorialAsignacionOperador[] = [];

  filtroTexto = '';
  filtrosGlobales: FilterState = { sucursal: 'Todas', region: 'Todas', marca: 'Todas', operador: 'Todos', bahia: 'Todas', estado: 'Todos', fecha: 'Hoy' };

  /** Tabla con páginas numeradas: alcance por rol, búsqueda y filtros se resuelven en el servidor. */
  readonly tabla = new TablaServidor<Operador>((c) => this.operadorService.getOperadoresPagina({ ...this.consultaBase(), ...c, search: this.busquedaAplicada }), {
    pageSize: PAGE_SIZE_TABLA,
  });
  private busquedaAplicada = '';
  private readonly busqueda$ = new Subject<string>();
  private busquedaSub?: Subscription;

  aplicarNuevosFiltros(filtros: FilterState) {
    const previo = this.huellaFiltros(this.filtrosGlobales);
    this.filtrosGlobales = filtros;
    const texto = (filtros.busqueda ?? '').trim();
    this.filtroTexto = texto;
    if (previo !== this.huellaFiltros(filtros)) {
      if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busquedaAplicada = texto;
      this.tabla.reiniciar();
      return;
    }
    // Solo cambió el texto: espera 300 ms tras la última tecla y exige 2 letras (o vacío para quitar el filtro).
    if (texto.length === 0 || texto.length >= BUSQUEDA_MIN_CARACTERES) this.busqueda$.next(texto);
  }

  private huellaFiltros(f: FilterState): string {
    const { busqueda, ...resto } = f;
    return JSON.stringify(resto);
  }

  private neutro(v: string | undefined | null, ...neutros: string[]): string {
    const t = (v ?? '').trim();
    return !t || neutros.includes(t) ? '' : t;
  }

  /**
   * Filtros del servidor según el rol y la barra de filtros. Un coordinador de servicios especiales solo ve pulidores; un
   * líder solo lavadores de su agencia; gerente y demás roles de sede quedan en su sede. (El servidor vuelve a aplicar
   * el alcance del líder.)
   */
  private consultaBase(): ConsultaOperadores {
    const u = this.authService.getCurrentUser();
    const f = this.filtrosGlobales;
    const c: ConsultaOperadores = {};

    // Quien atiende servicios especiales ve pulidores; quien trabaja con una sola agencia ve los lavadores de su agencia.
    if (this.isCoordServiciosEspeciales) c.categoriaRol = 'PULIDOR';
    else if (u?.ambito === 'AGENCIA' && !this.esLider) c.categoriaRol = 'LAVADOR';

    // Con alcance de agencia la consulta queda en la agencia propia (el servidor lo vuelve a aplicar).
    const idUsuario = u?.agenciaId || u?.sucursalId;
    if (u?.ambito === 'AGENCIA' && (idUsuario || this.userSucursal)) {
      c.agenciaId = idUsuario ? String(idUsuario) : this.userSucursal;
    } else {
      c.agenciaId = this.neutro(f.sucursal, 'Todas') || undefined;
    }

    const estado = this.neutro(f.estado, 'Todos');
    if (estado === 'Activo') c.estado = 1;
    else if (estado === 'Inactivo') c.estado = 0;
    c.rol = this.neutro(f.rol, 'Todos') || undefined;
    c.bahiaNombre = this.neutro(f.bahia, 'Todas') || undefined;
    c.clienteNombre = this.neutro(f.marca || f.cliente, 'Todas', 'Todos') || undefined;
    return c;
  }

  modalFichaOpen = false;
  modalAsignarBahiaOpen = false;
  modalCrearOpen = false;
  modalConfirmarConflictoOpen = false;
  cargando = true;

  esEdicion = false;
  operadorEnEdicionId?: number | string;

  /**
   * Antes esto representaba "reemplazar al único operador de la bahía" (capacidad=1 fija). Desde que
   * se respeta `maxLavadoresPorBahia` (una bahía puede tener varios lavadores activos a la vez), ya
   * no hay ningún "reemplazo": si hay cupo, el nuevo lavador simplemente se agrega junto a los que ya
   * estaban — sin conflicto ni modal. Esto solo se usa para el caso real de bloqueo: la bahía ya
   * llegó a su máximo configurado y no hay a quién "desalojar" (el backend tampoco lo hace: rechaza
   * la asignación). Ver conversación con el usuario del 2026-09-30.
   */
  conflictoAsignacion: {
    bahiaId: string;
    bahiaNombre: string;
    operadoresActualesNombres: string;
    maxLavadoresPorBahia: number;
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
    'Pulidor de Detallado & Acabado',
    'Pulidor Técnico Especialista'
  ];

  get rolesOperativosDisponibles(): string[] {
    return this.isCoordServiciosEspeciales ? this.rolesOperativosPulidor : this.rolesOperativosLavador;
  }

  /** Opciones del selector de rol: las de la categoría más el rol actual de quien se edita (p. ej. PULIDOR visto desde lavadores), para que llegue preseleccionado. */
  get rolesParaFormulario(): string[] {
    const base = this.rolesOperativosDisponibles;
    const actual = (this.formOperador.rol || '').trim();
    return actual && !base.some(r => r.toUpperCase() === actual.toUpperCase()) ? [actual, ...base] : base;
  }

  /**
   * Roles entre los que se puede filtrar la lista. Quien ve solo una categoría (pulidores, o lavadores de su agencia)
   * no necesita el filtro; el resto elige entre los roles que la pantalla puede mostrar.
   */
  get rolesFiltro(): string[] {
    if (this.isCoordServiciosEspeciales) return [];
    if (this.esLider) return ['LAVADOR', 'PULIDOR'];
    if (this.authService.getCurrentUser()?.ambito === 'AGENCIA') return [];
    return ['LAVADOR', 'PULIDOR', 'TECNICO'];
  }

  /** El líder (y Backup, que opera como líder) solo consulta a quien tiene asignado en su agencia: sus lavadores y su pulidor fijo. */
  get esLider(): boolean {
    return !this.canGestionarOperadores && !this.canAsignarBahia && !this.canQuitarBahia && this.authService.puede('operadores.ver');
  }

  /** Solo los lavadores trabajan en bahía. */
  esLavador(rol?: string | null): boolean {
    const r = (rol || '').trim().toUpperCase();
    return r === 'LAVADOR' || r.startsWith('LAVADOR ');
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
    estado: 'Activo',
    password: ''
  };
  verPassword = false;
  listaBahiasOperador: { id: string; nombre: string; operadorAsignado?: string | null; operadorId?: string | number | null; maxLavadoresPorBahia?: number; operadoresActivos?: { id: string; nombre: string }[] }[] = [];

  formAsignarBahia = {
    operadorId: '' as number | string,
    sucursalId: '',
    sucursalNombre: '',
    bahiaId: '',
    bahiaNombre: '',
    motivo: ''
  };
  listaBahiasDisponibles: { id: string; nombre: string; operadorAsignado?: string | null; operadorId?: string | number | null; maxLavadoresPorBahia?: number; operadoresActivos?: { id: string; nombre: string }[] }[] = [];

  private operadorService = inject(OperadorService);
  private sucursalService = inject(SucursalService);
  private bahiaService = inject(BahiaService);
  private toastService = inject(ToastService);
  public authService = inject(AuthService);

  ngOnInit(): void {
    this.busquedaSub = this.busqueda$
      .pipe(debounceTime(BUSQUEDA_DEBOUNCE_MS), distinctUntilChanged())
      .subscribe((texto) => {
        this.busquedaAplicada = texto;
        this.tabla.reiniciar();
      });
    this.tabla.reiniciar();
  }

  ngOnDestroy(): void {
    this.busquedaSub?.unsubscribe();
    this.tabla.destruir();
  }

  /** Modo pulidores: quien ve servicios especiales pero no los servicios generales (el coordinador de servicios especiales). */
  get isCoordServiciosEspeciales(): boolean {
    return this.authService.puede('especiales.ver') && !this.authService.puede('servicios.ver');
  }

  /** Solo quien opera toda la red o una región elige la agencia en los filtros. */
  get verTodasLasAgencias(): boolean {
    const ambito = this.authService.getCurrentUser()?.ambito;
    return ambito !== 'AGENCIA' && ambito !== 'PROPIO';
  }

  /** Vuelve a pedir la página que se está viendo (tras registrar o cambiar a alguien). La tabla se pide paginada desde el servidor. */
  cargarDatos(): void {
    this.tabla.refrescar();
  }

  /** Sucursales: solo hacen falta en los modales de crear/editar operador y asignar bahía — antes se pedían
   * siempre al entrar a la pantalla, aunque el usuario nunca abriera ninguno de los tres. */
  private sucursalesOperadoresCargadas = false;
  private cargarSucursalesSiHaceFalta(onListo: () => void): void {
    if (this.sucursalesOperadoresCargadas) { onListo(); return; }
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
      this.sucursalesOperadoresCargadas = true;
      onListo();
    });
  }

  /** Registrar y editar personal operativo: mismo permiso que exige el servidor. */
  get canRegistrar(): boolean { return this.authService.puede('operadores.registrar'); }
  /** Editar datos, cambiar el rol y mover de bahía son tres permisos distintos: el botón «Editar» sale si tiene alguno. */
  get canEditarDatos(): boolean { return this.authService.puede('operadores.editar'); }
  get canEditar(): boolean { return this.canEditarDatos || this.canAsignarBahia || this.canQuitarBahia; }
  /** El campo de bahía de los formularios: al editar sirve para asignar o para dejar en reserva; al registrar, solo para asignar. */
  get bahiaVisibleEnFormulario(): boolean { return this.esEdicion ? (this.canAsignarBahia || this.canQuitarBahia) : this.canAsignarBahia; }
  /** «Sin bahía (en reserva)»: al editar exige «Quitar de bahía»; al registrar siempre se puede (no hay bahía que quitar). */
  get puedeElegirSinBahia(): boolean { return !this.esEdicion || this.canQuitarBahia || !this.formOperador.bahiaId; }
  get puedeVerFicha(): boolean { return this.authService.puede('pagina.operadores'); }
  /** Al editar, cada campo se bloquea si el rol no tiene el permiso de ese tipo de cambio. */
  get datosBloqueados(): boolean { return this.esEdicion && !this.canEditarDatos; }
  /** Bahías ofrecidas: sin «Asignar a bahía» solo se muestra la actual (para poder dejarla en reserva). */
  get bahiasOfrecidas(): any[] {
    return this.canAsignarBahia ? this.listaBahiasOperador : this.listaBahiasOperador.filter((b: any) => b.id === this.formOperador.bahiaId);
  }
  get canGestionarOperadores(): boolean {
    return this.canRegistrar || this.canEditar;
  }

  /** Asignar o quitar a un operador de una bahía (el servidor lo permite dentro del alcance del usuario). */
  get canAsignarBahia(): boolean {
    return this.authService.puede('operadores.bahia.asignar');
  }

  get canQuitarBahia(): boolean {
    return this.authService.puede('operadores.bahia.asignar');
  }

  private mensajeError(err: any, respaldo: string): string {
    const m = err?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    return (typeof m === 'string' && m) ? m : respaldo;
  }

  get userSucursal(): string | undefined {
    return this.authService.getCurrentUser()?.sucursalNombre || this.authService.getCurrentUser()?.sucursal;
  }

  onAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.style.display = 'none';
    }
  }

  onPageChange(page: number): void {
    this.tabla.pagina = page;
    this.tabla.cargar();
  }

  onPageSizeChange(size: number): void {
    this.tabla.pageSize = size;
    this.tabla.pagina = 1;
    this.tabla.cargar();
  }

  abrirModalCrear(): void {
    if (!this.canRegistrar) {
      this.toastService.warning('Sin permiso', 'Tu rol no puede registrar personal operativo.');
      return;
    }
    this.cargarSucursalesSiHaceFalta(() => {
      this.esEdicion = false;
      this.operadorEnEdicionId = undefined;
      this.conflictoAsignacion = null;
      this.modalConfirmarConflictoOpen = false;

      const defaultSucursal = this.sucursales[0];

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
        estado: 'Activo',
        password: ''
      };
      this.verPassword = false;

      if (this.formOperador.sucursalId) {
        this.cargarBahiasParaCrear(this.formOperador.sucursalId);
      }
      this.modalCrearOpen = true;
    });
  }

  abrirModalEditar(op: Operador): void {
    if (!this.canEditar) {
      this.toastService.warning('Sin permiso', 'Tu rol no puede editar personal operativo.');
      return;
    }
    this.cargarSucursalesSiHaceFalta(() => {
      this.esEdicion = true;
      this.operadorEnEdicionId = op.id;
      this.conflictoAsignacion = null;
      this.modalConfirmarConflictoOpen = false;

      const suc = this.sucursales.find(s => s.nombre === op.sucursal || String(s.id) === String(op.sucursalId));

      this.formOperador = {
        nombre: op.nombre,
        cedula: op.cedula,
        telefono: op.telefono || '',
        rol: op.rol || 'LAVADOR',
        sucursalNombre: op.sucursal,
        sucursalId: suc ? String(suc.id) : String(op.sucursalId || ''),
        bahiaNombre: op.bahia || 'Sin Bahía Asignada',
        bahiaId: op.bahiaId || '',
        estado: op.estado || 'Activo',
        password: ''
      };

      if (this.formOperador.sucursalId) {
        this.cargarBahiasParaCrear(this.formOperador.sucursalId);
      }
      this.modalCrearOpen = true;
    });
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
        operadorId: b.operadorId || null,
        maxLavadoresPorBahia: b.maxLavadoresPorBahia ?? 1,
        operadoresActivos: b.operadoresActivos ?? [],
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
    if (!b) {
      if (this.conflictoAsignacion?.contexto === 'crear') this.conflictoAsignacion = null;
      return;
    }
    const max = b.maxLavadoresPorBahia ?? 1;
    // Al editar, si el operador en edición YA es uno de los activos de esta bahía, no cuenta contra
    // el cupo (se está guardando a sí mismo, no sumando uno nuevo).
    const activos = (b.operadoresActivos ?? []).filter(
      op => !this.esEdicion || String(op.id) !== String(this.operadorEnEdicionId)
    );
    if (activos.length >= max) {
      this.conflictoAsignacion = {
        bahiaId: b.id,
        bahiaNombre: b.nombre,
        operadoresActualesNombres: activos.map(op => op.nombre).join(', ') || (b.operadorAsignado ?? ''),
        maxLavadoresPorBahia: max,
        nuevoOperadorNombre: this.formOperador.nombre?.trim() || 'Nuevo Lavador',
        contexto: 'crear'
      };
    } else if (this.conflictoAsignacion?.contexto === 'crear') {
      this.conflictoAsignacion = null;
    }
  }

  /** Por qué la contraseña escrita no cumple la política (o `null` si cumple). */
  get motivoPassword(): string | null {
    return motivoPasswordDebil(this.formOperador.password);
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
    if (!this.esEdicion) {
      if (this.esLavador(this.formOperador.rol) && !this.formOperador.password?.trim()) {
        // Autogenerar contraseña segura internamente para el lavador (sin acceso al software)
        this.formOperador.password = `EasyDry${Math.floor(1000 + Math.random() * 9000)}*!`;
      } else if (!this.formOperador.password?.trim() || this.motivoPassword) {
        this.toastService.warning('Contraseña no válida', this.formOperador.password?.trim() ? (this.motivoPassword as string) : 'Escribe la contraseña de acceso del operador.');
        return;
      }
    }

    // Solo los lavadores van a bahía: con otro rol se descarta la bahía elegida antes de validar cupo.
    if (!this.esLavador(this.formOperador.rol)) {
      this.formOperador.bahiaId = '';
      this.conflictoAsignacion = null;
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
      // Solo se manda lo que este rol puede cambiar: el servidor exige un permiso distinto para datos, rol y bahía.
      // `bahiaId: null` significa «dejar en reserva»; sin permiso de bahía el campo ni viaja (queda como estaba).
      const datos = this.canEditarDatos;
      this.operadorService.actualizarOperador({
        id: this.operadorEnEdicionId,
        nombre: datos ? this.formOperador.nombre.trim() : '',
        cedula: datos ? this.formOperador.cedula.trim() : '',
        telefono: datos ? (this.formOperador.telefono?.trim() || '') : '',
        rol: '',
        sucursal: datos ? (suc ? suc.nombre : this.formOperador.sucursalNombre) : '',
        sucursalId: datos ? (suc ? suc.id : this.formOperador.sucursalId) : '',
        bahia: bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada',
        bahiaId: this.bahiaVisibleEnFormulario ? (this.formOperador.bahiaId || null) : undefined,
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
      this.tabla.refrescar();
        },
        error: (err) => {
          this.toastService.error('Error al actualizar', this.mensajeError(err, 'El servidor no aceptó los cambios.'));
        }
      });
    } else {
      this.operadorService.crearOperador({
        nombre: this.formOperador.nombre.trim(),
        cedula: this.formOperador.cedula.trim(),
        password: this.formOperador.password.trim(),
        telefono: this.formOperador.telefono?.trim() || '',
        rol: this.formOperador.rol,
        sucursal: suc ? suc.nombre : this.formOperador.sucursalNombre,
        sucursalId: suc ? suc.id : this.formOperador.sucursalId,
        bahia: bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada',
        bahiaId: this.bahiaVisibleEnFormulario ? (this.formOperador.bahiaId || null) : null,
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
            this.mensajeError(err, this.isCoordServiciosEspeciales ? 'No se pudo guardar el pulidor.' : 'No se pudo guardar el lavador.')
          );
        }
      });
    }
  }

  abrirModalAsignar(op: Operador): void {
    if (!this.canAsignarBahia) {
      this.toastService.warning('Sin permiso', 'Tu rol no puede asignar bahías.');
      return;
    }
    if (op.estado === 'Inactivo') {
      this.toastService.warning('Lavador Inactivo', 'No se puede asignar bahías a un colaborador inactivo. Debe activarlo primero.');
      return;
    }
    this.cargarSucursalesSiHaceFalta(() => {
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
    });
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
        operadorId: b.operadorId || null,
        maxLavadoresPorBahia: b.maxLavadoresPorBahia ?? 1,
        operadoresActivos: b.operadoresActivos ?? [],
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
    if (!b) {
      if (this.conflictoAsignacion?.contexto === 'asignar') this.conflictoAsignacion = null;
      return;
    }
    const max = b.maxLavadoresPorBahia ?? 1;
    const activos = (b.operadoresActivos ?? []).filter(
      op => !this.operadorSeleccionado || String(op.id) !== String(this.operadorSeleccionado.id)
    );
    if (activos.length >= max) {
      this.conflictoAsignacion = {
        bahiaId: b.id,
        bahiaNombre: b.nombre,
        operadoresActualesNombres: activos.map(op => op.nombre).join(', ') || (b.operadorAsignado ?? ''),
        maxLavadoresPorBahia: max,
        nuevoOperadorNombre: this.operadorSeleccionado?.nombre || 'Nuevo Lavador',
        contexto: 'asignar'
      };
    } else if (this.conflictoAsignacion?.contexto === 'asignar') {
      this.conflictoAsignacion = null;
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
    if (!this.formAsignarBahia.bahiaId) {
      this.toastService.warning('Bahía requerida', 'Selecciona la bahía a la que se asignará.');
      return;
    }

    const op = this.operadorSeleccionado;
    const motivo = this.formAsignarBahia.motivo?.trim() || 'Reasignación operativa de bahía';
    const usuarioAccion = this.authService.getCurrentUser()?.nombre || '';
    const bahiaSelected = this.listaBahiasDisponibles.find(b => b.id === this.formAsignarBahia.bahiaId);
    const bahiaNombre = bahiaSelected ? bahiaSelected.nombre : 'Sin Bahía Asignada';

    this.operadorService.reasignarOperador(
      op.id,
      this.formAsignarBahia.sucursalNombre,
      bahiaNombre,
      motivo,
      usuarioAccion,
      this.formAsignarBahia.bahiaId || undefined
    ).subscribe({
      next: () => {
        this.toastService.success('Asignación guardada', op.nombre + ' quedó asignado a ' + bahiaNombre + '.');
        this.modalAsignarBahiaOpen = false;
        this.conflictoAsignacion = null;
        this.operadorService.getOperadores().subscribe();
        this.tabla.refrescar();
      },
      error: (err) => this.toastService.error('No se pudo asignar', this.mensajeError(err, 'El servidor no aceptó la asignación.'))
    });
  }

  desactivarAsignacion(op: Operador): void {
    if (!this.canQuitarBahia) {
      this.toastService.warning('Sin permiso', 'Tu rol no puede desasignar bahías.');
      return;
    }
    const anteriorBahia = op.bahia;
    if (!op.bahiaId) {
      this.toastService.warning('Sin bahía', op.nombre + ' no tiene una bahía asignada.');
      return;
    }
    this.operadorService.desasignarOperadorDeBahia(op.bahiaId, op.id, 'Desvinculación de ' + anteriorBahia).subscribe({
      next: () => {
        this.toastService.success('Asignación quitada', 'Se desvinculó a ' + op.nombre + ' de ' + anteriorBahia + '.');
        this.operadorService.getOperadores().subscribe();
        this.tabla.refrescar();
      },
      error: (err) => this.toastService.error('No se pudo desasignar', this.mensajeError(err, 'El servidor no aceptó el cambio.'))
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
