import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { SucursalMockService } from '../../core/services/sucursal-mock.service';
import { RegionMockService } from '../../core/services/region-mock.service';
import { MarcaSucursalMockService } from '../../core/services/marca-sucursal-mock.service';
import { BahiaMockService } from '../../core/services/bahia-mock.service';
import { AuthService } from '../../core/services/auth.service';
import { MarcaSucursal, MovimientoRedSucursal, RegionOperativa, Sucursal, CatalogoServicio } from '../../core/models';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import { ToastService } from '../../shared/services/toast.service';
import { CatalogoServiciosMockService } from '../../core/services/catalogo-servicios-mock.service';

@Component({
  selector: 'app-sucursales',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in">

      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Control de Sucursales EasyDry®</h1>
          <p class="text-slate-500 text-xs mt-1">Regiones, marcas, servicios por sucursal e infraestructura de bahías.</p>
        </div>
        <div class="flex items-center gap-3 flex-wrap">
          <a [routerLink]="['/mapa-operativo']" class="px-4 py-2.5 bg-slate-100 hover:bg-easydry-blue hover:text-white text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-2">
            <i-lucide name="sliders" class="w-4 h-4"></i-lucide>
            <span>Ver Mapa Operativo Global</span>
          </a>
          <button
            (click)="abrirModalCrearSucursal()"
            class="px-4 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs">
            <i-lucide name="plus" class="w-4 h-4"></i-lucide>
            <span>Registrar Nueva Sucursal</span>
          </button>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        @for (tab of tabs; track tab.id) {
          <button
            (click)="tabActiva = tab.id"
            class="px-4 py-2 rounded-xl text-xs font-extrabold border transition-colors"
            [ngClass]="tabActiva === tab.id
              ? 'bg-easydry-blue text-white border-easydry-blue'
              : 'bg-white text-slate-600 border-slate-200 hover:border-easydry-blue/40'">
            {{ tab.label }}
          </button>
        }
      </div>

      @if (tabActiva === 'sucursales') {
        <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-wrap items-center gap-3">
          <select [(ngModel)]="filtroRegionId" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2">
            <option [ngValue]="0">Todas las regiones</option>
            @for (r of regiones; track r.id) {
              <option [ngValue]="r.id">{{ r.nombre }}</option>
            }
          </select>
          <select [(ngModel)]="filtroMarcaId" class="bg-slate-50 border border-slate-200 text-xs font-bold rounded-xl px-3 py-2">
            <option [ngValue]="0">Todas las marcas</option>
            @for (m of marcas; track m.id) {
              <option [ngValue]="m.id">{{ m.nombre }}</option>
            }
          </select>
          <span class="text-xs text-slate-500 font-semibold ml-auto">{{ sucursalesFiltradas.length }} sucursales</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          @for (suc of sucursalesFiltradas; track suc.id) {
            <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry hover:shadow-easydry-hover transition-all duration-300 p-6 flex flex-col justify-between group">
              <div>
                <div class="flex items-start justify-between mb-4">
                  <div class="w-12 h-12 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center font-bold">
                    <i-lucide name="building-2" class="w-6 h-6"></i-lucide>
                  </div>
                  <div class="flex items-center gap-2">
                    <button (click)="abrirModalTransferir(suc)" class="p-1.5 bg-amber-50 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg transition-colors" title="Transferir región o marca">
                      <i-lucide name="refresh-cw" class="w-4 h-4"></i-lucide>
                    </button>
                    <button (click)="abrirModalEditar(suc)" class="p-1.5 bg-slate-100 hover:bg-easydry-blue text-slate-400 hover:text-white rounded-lg transition-colors" title="Editar Sucursal">
                      <i-lucide name="pencil" class="w-4 h-4"></i-lucide>
                    </button>
                    <span
                      class="px-2.5 py-1 rounded-full text-xs font-bold"
                      [ngClass]="suc.estado === 'Activo' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-rose-100 text-rose-800'">
                      {{ suc.estado }}
                    </span>
                  </div>
                </div>

                <h3 class="font-bold text-slate-900 text-lg font-outfit group-hover:text-easydry-blue transition-colors">{{ suc.nombre }}</h3>
                <p class="text-xs text-slate-500 font-semibold flex items-center gap-1 mt-1">
                  <i-lucide name="building-2" class="w-3.5 h-3.5 text-slate-400"></i-lucide>
                  <span>{{ suc.ciudad }}</span>
                </p>
                <div class="flex flex-wrap gap-1.5 mt-3">
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-easydry-blue/10 text-easydry-blue text-[10px] font-extrabold uppercase">
                    <i-lucide name="map-pin" class="w-3 h-3"></i-lucide>
                    {{ suc.regionNombre || 'Sin región' }}
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase text-white"
                    [style.background-color]="colorMarca(suc.marcaId)">
                    <i-lucide name="tag" class="w-3 h-3"></i-lucide>
                    {{ suc.marcaNombre || 'Sin marca' }}
                  </span>
                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-extrabold uppercase">
                    <i-lucide name="sparkles" class="w-3 h-3"></i-lucide>
                    {{ (suc.servicioIds || []).length }} servicios
                  </span>
                </div>
                <p class="text-xs text-slate-400 mt-2 line-clamp-2">{{ suc.direccion }}</p>
              </div>

              <div class="mt-6 pt-4 border-t border-slate-100 space-y-3">
                <div class="grid grid-cols-2 gap-2 text-xs">
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Bahías</span>
                    <span class="font-extrabold text-easydry-blue text-sm">{{ suc.cantidadBahias }} Bahías</span>
                  </div>
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <span class="text-[10px] text-slate-400 uppercase font-bold block">Operadores</span>
                    <span class="font-extrabold text-easydry-green-dark text-sm">{{ suc.operadoresActivos || 4 }} Activos</span>
                  </div>
                </div>
                <div class="flex items-center justify-between text-xs pt-1">
                  <span class="text-slate-500">Responsable:</span>
                  <span class="font-bold text-slate-800">{{ suc.responsable }}</span>
                </div>
                <a
                  [routerLink]="['/sucursales', suc.id]"
                  class="w-full mt-2 py-2 bg-easydry-blue/10 hover:bg-easydry-blue hover:text-white text-easydry-blue font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5">
                  <i-lucide name="eye" class="w-3.5 h-3.5"></i-lucide>
                  <span>Ver Bahías & Operación</span>
                </a>
              </div>
            </div>
          }
        </div>

        @if (movimientos.length > 0) {
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-5">
            <h3 class="font-bold text-slate-900 text-sm font-outfit mb-3 flex items-center gap-2">
              <i-lucide name="history" class="w-4 h-4 text-easydry-blue"></i-lucide>
              Historial de transferencias
            </h3>
            <div class="space-y-2">
              @for (mov of movimientos.slice(0, 6); track mov.id) {
                <div class="flex flex-wrap items-center justify-between gap-2 text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <span class="font-extrabold text-slate-800">{{ mov.sucursalNombre }}</span>
                    <span class="text-slate-400 mx-1">·</span>
                    <span class="font-bold" [class.text-easydry-blue]="mov.tipo === 'REGION'" [class.text-amber-700]="mov.tipo === 'MARCA'">
                      {{ mov.tipo === 'REGION' ? 'Región' : 'Marca' }}
                    </span>
                    <span class="text-slate-500"> {{ mov.valorAnterior }} → {{ mov.valorNuevo }}</span>
                  </div>
                  <span class="text-slate-400">{{ mov.fecha }} · {{ mov.realizadoPor }}</span>
                </div>
              }
            </div>
          </div>
        }
      }

      @if (tabActiva === 'regiones') {
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-500">Crea regiones y luego pasa sucursales a cada una.</p>
          <button (click)="abrirModalRegion()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide> Nueva Región
          </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="space-y-3">
            @for (r of regiones; track r.id) {
              <button
                (click)="regionSeleccionada = r"
                class="w-full text-left bg-white rounded-2xl border p-4 shadow-xs hover:shadow-easydry transition-all"
                [ngClass]="regionSeleccionada?.id === r.id ? 'border-easydry-blue ring-2 ring-easydry-blue/20' : 'border-slate-100'">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <p class="font-extrabold text-slate-900 text-sm">{{ r.nombre }}</p>
                    <p class="text-[10px] font-mono text-slate-400">{{ r.codigo }}</p>
                  </div>
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    [ngClass]="r.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-100 text-slate-500'">
                    {{ r.estado }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ r.descripcion }}</p>
                <p class="text-[11px] font-bold text-easydry-blue mt-2">{{ sucursalesDeRegion(r.id).length }} sucursales</p>
              </button>
            }
          </div>
          <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 min-h-[280px]">
            @if (!regionSeleccionada) {
              <p class="text-sm text-slate-500">Selecciona una región para ver y asignar sucursales.</p>
            } @else {
              <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 class="font-extrabold text-slate-900 font-outfit text-lg">{{ regionSeleccionada.nombre }}</h3>
                  <p class="text-xs text-slate-500">{{ regionSeleccionada.descripcion }}</p>
                  <p class="text-xs text-slate-400 mt-1">Responsable: {{ regionSeleccionada.responsable || '—' }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="abrirModalRegion(regionSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  <button (click)="abrirAsignarARegion(regionSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Pasar sucursal a esta región
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeRegion(regionSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-[11px] text-slate-500">{{ suc.ciudad }} · {{ suc.marcaNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg">Transferir</button>
                      <a [routerLink]="['/sucursales', suc.id]" class="px-2.5 py-1.5 text-[11px] font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-500">Aún no hay sucursales en esta región. Usa «Pasar sucursal a esta región».</p>
                }
              </div>
            }
          </div>
        </div>
      }

      @if (tabActiva === 'marcas') {
        <div class="flex items-center justify-between">
          <p class="text-xs text-slate-500">Crea marcas de sucursal y asígnalas o transfiérelas entre locales.</p>
          <button (click)="abrirModalMarca()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs flex items-center gap-1.5">
            <i-lucide name="plus" class="w-3.5 h-3.5"></i-lucide> Nueva Marca
          </button>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="space-y-3">
            @for (m of marcas; track m.id) {
              <button
                (click)="marcaSeleccionada = m"
                class="w-full text-left bg-white rounded-2xl border p-4 shadow-xs hover:shadow-easydry transition-all"
                [ngClass]="marcaSeleccionada?.id === m.id ? 'border-easydry-blue ring-2 ring-easydry-blue/20' : 'border-slate-100'">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="w-3 h-3 rounded-full" [style.background-color]="m.color"></span>
                    <div>
                      <p class="font-extrabold text-slate-900 text-sm">{{ m.nombre }}</p>
                      <p class="text-[10px] font-mono text-slate-400">{{ m.codigo }}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold"
                    [ngClass]="m.estado === 'Activa' ? 'bg-easydry-green/20 text-easydry-green-dark' : 'bg-slate-100 text-slate-500'">
                    {{ m.estado }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ m.descripcion }}</p>
                <p class="text-[11px] font-bold text-easydry-blue mt-2">{{ sucursalesDeMarca(m.id).length }} sucursales</p>
              </button>
            }
          </div>
          <div class="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 min-h-[280px]">
            @if (!marcaSeleccionada) {
              <p class="text-sm text-slate-500">Selecciona una marca para ver, asignar o transferir sucursales.</p>
            } @else {
              <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                  <h3 class="font-extrabold text-slate-900 font-outfit text-lg">{{ marcaSeleccionada.nombre }}</h3>
                  <p class="text-xs text-slate-500">{{ marcaSeleccionada.descripcion }}</p>
                </div>
                <div class="flex gap-2">
                  <button (click)="abrirModalMarca(marcaSeleccionada)" class="px-3 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">Editar</button>
                  <button (click)="abrirAsignarAMarca(marcaSeleccionada)" class="px-3 py-2 bg-easydry-green text-slate-950 font-bold rounded-xl text-xs">
                    Asignar sucursal a esta marca
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                @for (suc of sucursalesDeMarca(marcaSeleccionada.id); track suc.id) {
                  <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                    <div>
                      <p class="text-sm font-bold text-slate-900">{{ suc.nombre }}</p>
                      <p class="text-[11px] text-slate-500">{{ suc.ciudad }} · Región {{ suc.regionNombre }}</p>
                    </div>
                    <div class="flex gap-2">
                      <button (click)="abrirModalTransferir(suc)" class="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg">Cambiar</button>
                      <a [routerLink]="['/sucursales', suc.id]" class="px-2.5 py-1.5 text-[11px] font-bold text-easydry-blue bg-easydry-blue/10 rounded-lg">Ver</a>
                    </div>
                  </div>
                } @empty {
                  <p class="text-xs text-slate-500">Ninguna sucursal usa esta marca. Asigna una desde este panel.</p>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal Crear / Editar Sucursal -->
      <app-modal
        [isOpen]="modalCrearOpen"
        [title]="editandoSucursal ? 'Editar Sucursal EasyDry' : 'Registrar Nueva Sucursal EasyDry'"
        [icon]="editandoSucursal ? 'pencil' : 'building-2'"
        (close)="cerrarModal()">

        <form (ngSubmit)="guardarSucursal()" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre de Sucursal</label>
            <input type="text" [(ngModel)]="nuevaSucursal.nombre" name="nombre" placeholder="ej. EasyDry Guayaquil Samborondón" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Región</label>
                <button type="button" (click)="mostrarAltaRegion = !mostrarAltaRegion" class="text-[10px] font-extrabold text-easydry-blue">+ Crear región</button>
              </div>
              <select [(ngModel)]="nuevaSucursal.regionId" name="regionId" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                <option [ngValue]="0">Seleccione región</option>
                @for (r of regionesActivas; track r.id) {
                  <option [ngValue]="r.id">{{ r.nombre }}</option>
                }
              </select>
              @if (mostrarAltaRegion) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaRegion" name="altaRapidaRegion" placeholder="Nombre de la región" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearRegionRapida()" class="px-3 py-2 bg-easydry-blue text-white text-xs font-bold rounded-xl">Crear</button>
                </div>
              }
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-bold text-slate-700 uppercase">Marca de sucursal</label>
                <button type="button" (click)="mostrarAltaMarca = !mostrarAltaMarca" class="text-[10px] font-extrabold text-easydry-blue">+ Crear marca</button>
              </div>
              <select [(ngModel)]="nuevaSucursal.marcaId" name="marcaId" class="w-full p-2.5 border rounded-xl text-sm font-semibold" required>
                <option [ngValue]="0">Seleccione marca</option>
                @for (m of marcasActivas; track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }}</option>
                }
              </select>
              @if (mostrarAltaMarca) {
                <div class="mt-2 flex gap-2">
                  <input type="text" [(ngModel)]="altaRapidaMarca" name="altaRapidaMarca" placeholder="Nombre de la marca" class="flex-1 p-2 border rounded-xl text-xs">
                  <button type="button" (click)="crearMarcaRapida()" class="px-3 py-2 bg-easydry-blue text-white text-xs font-bold rounded-xl">Crear</button>
                </div>
              }
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Ciudad</label>
              <input type="text" [(ngModel)]="nuevaSucursal.ciudad" name="ciudad" placeholder="Quito / Guayaquil / Cuenca" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Cantidad de Bahías</label>
              <input type="number" [(ngModel)]="nuevaSucursal.cantidadBahias" name="cantidadBahias" min="1" max="12" class="w-full p-2.5 border rounded-xl text-sm" required>
            </div>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Dirección Exacta</label>
            <input type="text" [(ngModel)]="nuevaSucursal.direccion" name="direccion" placeholder="Av. Principal N45-120" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Gerente / Responsable</label>
            <input type="text" [(ngModel)]="nuevaSucursal.responsable" name="responsable" placeholder="Nombre de Responsable" class="w-full p-2.5 border rounded-xl text-sm" required>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Servicios de esta sucursal</label>
            <p class="text-[11px] text-slate-500 mb-2">Se toman del catálogo corporativo. Márquelos ahora; podrá editarlos después.</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
              <div class="border border-slate-200 rounded-xl p-3 bg-slate-50/80">
                <p class="text-[10px] font-extrabold uppercase text-easydry-blue mb-2">Generales</p>
                @for (s of serviciosGenerales; track s.id) {
                  <label class="flex items-start gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" class="mt-0.5 rounded border-slate-300" [checked]="servicioSeleccionado(s.id)" (change)="toggleServicio(s.id, s.nombre)">
                    <span class="text-xs font-semibold text-slate-800">{{ s.nombre }}</span>
                  </label>
                }
              </div>
              <div class="border border-amber-200 rounded-xl p-3 bg-amber-50/50">
                <p class="text-[10px] font-extrabold uppercase text-amber-700 mb-2">Especiales</p>
                @for (s of serviciosEspeciales; track s.id) {
                  <label class="flex items-start gap-2 py-1.5 cursor-pointer">
                    <input type="checkbox" class="mt-0.5 rounded border-slate-300" [checked]="servicioSeleccionado(s.id)" (change)="toggleServicio(s.id, s.nombre)">
                    <span class="text-xs font-semibold text-slate-800">{{ s.nombre }}</span>
                  </label>
                }
              </div>
            </div>
            <p class="text-[11px] font-bold text-slate-600 mt-2">{{ (nuevaSucursal.servicioIds || []).length }} seleccionados</p>
          </div>
        </form>

        <div modal-footer>
          <button (click)="cerrarModal()" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarSucursal()" class="px-4 py-2 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs">
            {{ editandoSucursal ? 'Guardar Cambios' : 'Guardar Sucursal' }}
          </button>
        </div>
      </app-modal>

      <!-- Modal Región -->
      <app-modal [isOpen]="modalRegionOpen" [title]="editandoRegion ? 'Editar Región' : 'Nueva Región'" icon="map-pin" (close)="modalRegionOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre</label>
            <input type="text" [(ngModel)]="formRegion.nombre" name="regionNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Amazonía">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <input type="text" [(ngModel)]="formRegion.descripcion" name="regionDesc" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Responsable</label>
            <input type="text" [(ngModel)]="formRegion.responsable" name="regionResp" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
            <select [(ngModel)]="formRegion.estado" name="regionEstado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              <option value="Activa">Activa</option>
              <option value="Inactiva">Inactiva</option>
            </select>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalRegionOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarRegion()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Guardar Región</button>
        </div>
      </app-modal>

      <!-- Modal Marca -->
      <app-modal [isOpen]="modalMarcaOpen" [title]="editandoMarca ? 'Editar Marca de Sucursal' : 'Nueva Marca de Sucursal'" icon="tag" (close)="modalMarcaOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nombre comercial</label>
            <input type="text" [(ngModel)]="formMarca.nombre" name="marcaNombre" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. EasyDry Premium">
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Descripción</label>
            <input type="text" [(ngModel)]="formMarca.descripcion" name="marcaDesc" class="w-full p-2.5 border rounded-xl text-sm">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Color</label>
              <input type="color" [(ngModel)]="formMarca.color" name="marcaColor" class="w-full h-10 border rounded-xl">
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Estado</label>
              <select [(ngModel)]="formMarca.estado" name="marcaEstado" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                <option value="Activa">Activa</option>
                <option value="Inactiva">Inactiva</option>
              </select>
            </div>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalMarcaOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarMarca()" class="px-4 py-2 bg-easydry-blue text-white font-bold rounded-xl text-xs">Guardar Marca</button>
        </div>
      </app-modal>

      <!-- Modal Transferir -->
      <app-modal [isOpen]="modalTransferirOpen" title="Transferir sucursal" icon="refresh-cw" (close)="modalTransferirOpen = false">
        <form class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Sucursal</label>
            <select [(ngModel)]="formTransfer.sucursalId" name="transfSucursal" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
              @for (s of sucursales; track s.id) {
                <option [ngValue]="s.id">{{ s.nombre }} ({{ s.regionNombre }} · {{ s.marcaNombre }})</option>
              }
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva región</label>
              <select [(ngModel)]="formTransfer.regionId" name="transfRegion" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (r of regionesActivas; track r.id) {
                  <option [ngValue]="r.id">{{ r.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Nueva marca</label>
              <select [(ngModel)]="formTransfer.marcaId" name="transfMarca" class="w-full p-2.5 border rounded-xl text-sm font-semibold">
                @for (m of marcasActivas; track m.id) {
                  <option [ngValue]="m.id">{{ m.nombre }}</option>
                }
              </select>
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del cambio</label>
            <textarea [(ngModel)]="formTransfer.motivo" name="transfMotivo" rows="2" class="w-full p-2.5 border rounded-xl text-sm" placeholder="ej. Reorganización territorial / cambio de banner comercial"></textarea>
          </div>
        </form>
        <div modal-footer>
          <button (click)="modalTransferirOpen = false" class="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs">Cancelar</button>
          <button (click)="guardarTransferencia()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs">Confirmar transferencia</button>
        </div>
      </app-modal>

    </div>
  `
})
export class SucursalesComponent implements OnInit {
  sucursales: Sucursal[] = [];
  regiones: RegionOperativa[] = [];
  marcas: MarcaSucursal[] = [];
  catalogoServicios: CatalogoServicio[] = [];
  movimientos: MovimientoRedSucursal[] = [];

  tabActiva: 'sucursales' | 'regiones' | 'marcas' = 'sucursales';
  tabs = [
    { id: 'sucursales' as const, label: 'Sucursales' },
    { id: 'regiones' as const, label: 'Regiones' },
    { id: 'marcas' as const, label: 'Marcas' }
  ];

  filtroRegionId = 0;
  filtroMarcaId = 0;
  regionSeleccionada: RegionOperativa | null = null;
  marcaSeleccionada: MarcaSucursal | null = null;

  modalCrearOpen = false;
  editandoSucursal = false;
  mostrarAltaRegion = false;
  mostrarAltaMarca = false;
  altaRapidaRegion = '';
  altaRapidaMarca = '';

  modalRegionOpen = false;
  editandoRegion = false;
  formRegion: Omit<RegionOperativa, 'id' | 'codigo'> & { id?: number; codigo?: string } = {
    nombre: '',
    descripcion: '',
    responsable: '',
    estado: 'Activa'
  };

  modalMarcaOpen = false;
  editandoMarca = false;
  formMarca: Omit<MarcaSucursal, 'id' | 'codigo'> & { id?: number; codigo?: string } = {
    nombre: '',
    descripcion: '',
    color: '#07558C',
    estado: 'Activa'
  };

  modalTransferirOpen = false;
  formTransfer = {
    sucursalId: 0,
    regionId: 0,
    marcaId: 0,
    motivo: ''
  };

  nuevaSucursal: Sucursal = this.sucursalVacia();

  private sucursalService = inject(SucursalMockService);
  private regionService = inject(RegionMockService);
  private marcaService = inject(MarcaSucursalMockService);
  private catalogoService = inject(CatalogoServiciosMockService);
  private bahiaService = inject(BahiaMockService);
  private toastService = inject(ToastService);
  private auth = inject(AuthService);

  get regionesActivas(): RegionOperativa[] {
    return this.regiones.filter(r => r.estado === 'Activa');
  }

  get marcasActivas(): MarcaSucursal[] {
    return this.marcas.filter(m => m.estado === 'Activa');
  }

  get serviciosGenerales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => s.categoria === 'GENERAL' && s.estado === 'Activo');
  }

  get serviciosEspeciales(): CatalogoServicio[] {
    return this.catalogoServicios.filter(s => (s.categoria === 'ESPECIAL' || s.categoria === 'EXTRA') && s.estado === 'Activo');
  }

  get sucursalesFiltradas(): Sucursal[] {
    return this.sucursales.filter(s => {
      const okRegion = this.filtroRegionId === 0 || s.regionId === this.filtroRegionId;
      const okMarca = this.filtroMarcaId === 0 || s.marcaId === this.filtroMarcaId;
      return okRegion && okMarca;
    });
  }

  ngOnInit(): void {
    this.cargarTodo();
  }

  cargarTodo(): void {
    this.regionService.getRegiones().subscribe(list => {
      this.regiones = list;
      this.regionSeleccionada = this.regionSeleccionada
        ? list.find(r => r.id === this.regionSeleccionada!.id) || list[0]
        : list[0] || null;
    });
    this.marcaService.getMarcas().subscribe(list => {
      this.marcas = list;
      this.marcaSeleccionada = this.marcaSeleccionada
        ? list.find(m => m.id === this.marcaSeleccionada!.id) || list[0]
        : list[0] || null;
    });
    this.sucursalService.getSucursales().subscribe(list => {
      this.sucursales = list;
    });
    this.catalogoService.getServiciosActivos().subscribe(list => {
      this.catalogoServicios = list;
    });
    this.sucursalService.getMovimientos().subscribe(list => {
      this.movimientos = list;
    });
  }

  sucursalesDeRegion(regionId: number): Sucursal[] {
    return this.sucursales.filter(s => s.regionId === regionId);
  }

  sucursalesDeMarca(marcaId: number): Sucursal[] {
    return this.sucursales.filter(s => s.marcaId === marcaId);
  }

  colorMarca(marcaId?: number): string {
    return this.marcas.find(m => m.id === marcaId)?.color || '#07558C';
  }

  abrirModalCrearSucursal(): void {
    this.editandoSucursal = false;
    this.nuevaSucursal = this.sucursalVacia();
    this.modalCrearOpen = true;
  }

  abrirModalEditar(suc: Sucursal): void {
    this.editandoSucursal = true;
    this.nuevaSucursal = {
      ...suc,
      servicioIds: [...(suc.servicioIds || [])],
      serviciosNombres: [...(suc.serviciosNombres || [])]
    };
    this.modalCrearOpen = true;
  }

  cerrarModal(): void {
    this.modalCrearOpen = false;
    this.editandoSucursal = false;
    this.mostrarAltaRegion = false;
    this.mostrarAltaMarca = false;
    this.altaRapidaRegion = '';
    this.altaRapidaMarca = '';
    this.nuevaSucursal = this.sucursalVacia();
  }

  crearRegionRapida(): void {
    if (!this.altaRapidaRegion.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la región.');
      return;
    }
    this.regionService.crear({
      nombre: this.altaRapidaRegion.trim(),
      descripcion: '',
      responsable: '',
      estado: 'Activa'
    }).subscribe(creada => {
      this.regiones = [...this.regiones, creada];
      this.nuevaSucursal.regionId = creada.id;
      this.altaRapidaRegion = '';
      this.mostrarAltaRegion = false;
      this.toastService.success('Región creada', `${creada.nombre} lista para asignar.`);
    });
  }

  crearMarcaRapida(): void {
    if (!this.altaRapidaMarca.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la marca.');
      return;
    }
    this.marcaService.crear({
      nombre: this.altaRapidaMarca.trim(),
      descripcion: '',
      color: '#07558C',
      estado: 'Activa'
    }).subscribe(creada => {
      this.marcas = [...this.marcas, creada];
      this.nuevaSucursal.marcaId = creada.id;
      this.altaRapidaMarca = '';
      this.mostrarAltaMarca = false;
      this.toastService.success('Marca creada', `${creada.nombre} lista para asignar.`);
    });
  }

  guardarSucursal(): void {
    if (!this.nuevaSucursal.nombre || !this.nuevaSucursal.responsable) {
      this.toastService.warning('Datos Incompletos', 'Ingrese nombre y responsable de la sucursal.');
      return;
    }
    if (!this.nuevaSucursal.regionId) {
      this.toastService.warning('Región requerida', 'Seleccione o cree una región.');
      return;
    }
    if (!this.nuevaSucursal.marcaId) {
      this.toastService.warning('Marca requerida', 'Seleccione o cree una marca de sucursal.');
      return;
    }
    if (!(this.nuevaSucursal.servicioIds || []).length) {
      this.toastService.warning('Servicios requeridos', 'Asigne al menos un servicio del catálogo a esta sucursal.');
      return;
    }

    this.nuevaSucursal.serviciosNombres = this.catalogoServicios
      .filter(s => (this.nuevaSucursal.servicioIds || []).includes(s.id))
      .map(s => s.nombre);

    if (this.editandoSucursal) {
      const user = this.auth.getCurrentUser();
      this.sucursalService.actualizarSucursal(this.nuevaSucursal, {
        motivo: 'Actualización desde ficha de sucursal',
        realizadoPor: `${user.nombre} ${user.apellido}`.trim()
      }).subscribe(actualizada => {
        this.bahiaService.sincronizarBahias(actualizada.id, actualizada.nombre, actualizada.cantidadBahias);
        this.toastService.success('Sucursal Actualizada', `Se guardaron los cambios para ${actualizada.nombre}.`);
        this.cerrarModal();
        this.cargarTodo();
      });
    } else {
      this.sucursalService.crearSucursal(this.nuevaSucursal).subscribe(creada => {
        this.bahiaService.sincronizarBahias(creada.id, creada.nombre, creada.cantidadBahias);
        this.toastService.success('Sucursal Registrada', `Se configuró ${creada.nombre} en ${creada.regionNombre} · ${creada.marcaNombre}.`);
        this.cerrarModal();
        this.cargarTodo();
      });
    }
  }

  abrirModalRegion(region?: RegionOperativa): void {
    this.editandoRegion = !!region;
    this.formRegion = region
      ? { ...region }
      : { nombre: '', descripcion: '', responsable: '', estado: 'Activa' };
    this.modalRegionOpen = true;
  }

  guardarRegion(): void {
    if (!this.formRegion.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la región.');
      return;
    }
    if (this.editandoRegion && this.formRegion.id) {
      this.regionService.actualizar(this.formRegion as RegionOperativa).subscribe(actualizada => {
        this.sucursalService.sincronizarNombresCatalogo();
        this.toastService.success('Región actualizada', actualizada.nombre);
        this.modalRegionOpen = false;
        this.regionSeleccionada = actualizada;
        this.cargarTodo();
      });
    } else {
      this.regionService.crear(this.formRegion).subscribe(creada => {
        this.toastService.success('Región creada', `${creada.nombre} lista para recibir sucursales.`);
        this.modalRegionOpen = false;
        this.regionSeleccionada = creada;
        this.tabActiva = 'regiones';
        this.cargarTodo();
      });
    }
  }

  abrirModalMarca(marca?: MarcaSucursal): void {
    this.editandoMarca = !!marca;
    this.formMarca = marca
      ? { ...marca }
      : { nombre: '', descripcion: '', color: '#07558C', estado: 'Activa' };
    this.modalMarcaOpen = true;
  }

  guardarMarca(): void {
    if (!this.formMarca.nombre?.trim()) {
      this.toastService.warning('Nombre requerido', 'Ingrese el nombre de la marca.');
      return;
    }
    if (this.editandoMarca && this.formMarca.id) {
      this.marcaService.actualizar(this.formMarca as MarcaSucursal).subscribe(actualizada => {
        this.sucursalService.sincronizarNombresCatalogo();
        this.toastService.success('Marca actualizada', actualizada.nombre);
        this.modalMarcaOpen = false;
        this.marcaSeleccionada = actualizada;
        this.cargarTodo();
      });
    } else {
      this.marcaService.crear(this.formMarca).subscribe(creada => {
        this.toastService.success('Marca creada', `${creada.nombre} lista para asignar.`);
        this.modalMarcaOpen = false;
        this.marcaSeleccionada = creada;
        this.tabActiva = 'marcas';
        this.cargarTodo();
      });
    }
  }

  abrirModalTransferir(suc: Sucursal): void {
    this.formTransfer = {
      sucursalId: suc.id,
      regionId: suc.regionId || 0,
      marcaId: suc.marcaId || 0,
      motivo: ''
    };
    this.modalTransferirOpen = true;
  }

  abrirAsignarARegion(region: RegionOperativa): void {
    const candidata = this.sucursales.find(s => s.regionId !== region.id) || this.sucursales[0];
    this.formTransfer = {
      sucursalId: candidata?.id || 0,
      regionId: region.id,
      marcaId: candidata?.marcaId || 0,
      motivo: `Paso de sucursal a la región ${region.nombre}`
    };
    this.modalTransferirOpen = true;
  }

  abrirAsignarAMarca(marca: MarcaSucursal): void {
    const candidata = this.sucursales.find(s => s.marcaId !== marca.id) || this.sucursales[0];
    this.formTransfer = {
      sucursalId: candidata?.id || 0,
      regionId: candidata?.regionId || 0,
      marcaId: marca.id,
      motivo: `Asignación a marca ${marca.nombre}`
    };
    this.modalTransferirOpen = true;
  }

  guardarTransferencia(): void {
    const suc = this.sucursales.find(s => s.id === this.formTransfer.sucursalId);
    if (!suc) {
      this.toastService.warning('Sucursal requerida', 'Seleccione la sucursal a transferir.');
      return;
    }
    if (!this.formTransfer.motivo.trim()) {
      this.toastService.warning('Motivo requerido', 'Indique por qué se transfiere o cambia.');
      return;
    }
    if (this.formTransfer.regionId === suc.regionId && this.formTransfer.marcaId === suc.marcaId) {
      this.toastService.warning('Sin cambios', 'Seleccione una región o marca distinta.');
      return;
    }

    const user = this.auth.getCurrentUser();
    this.sucursalService.transferirSucursal({
      sucursalId: suc.id,
      regionId: this.formTransfer.regionId,
      marcaId: this.formTransfer.marcaId,
      motivo: this.formTransfer.motivo.trim(),
      realizadoPor: `${user.nombre} ${user.apellido}`.trim()
    }).subscribe(actualizada => {
      if (!actualizada) return;
      this.toastService.success(
        'Transferencia aplicada',
        `${actualizada.nombre} quedó en ${actualizada.regionNombre} · ${actualizada.marcaNombre}.`
      );
      this.modalTransferirOpen = false;
      this.cargarTodo();
    });
  }

  servicioSeleccionado(id: number): boolean {
    return (this.nuevaSucursal.servicioIds || []).includes(id);
  }

  toggleServicio(id: number, nombre: string): void {
    const ids = [...(this.nuevaSucursal.servicioIds || [])];
    const nombres = [...(this.nuevaSucursal.serviciosNombres || [])];
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      const ni = nombres.indexOf(nombre);
      if (ni >= 0) nombres.splice(ni, 1);
    } else {
      ids.push(id);
      nombres.push(nombre);
    }
    this.nuevaSucursal.servicioIds = ids;
    this.nuevaSucursal.serviciosNombres = nombres;
  }

  private sucursalVacia(): Sucursal {
    return {
      id: 0,
      nombre: '',
      ciudad: 'Quito',
      direccion: '',
      cantidadBahias: 4,
      estado: 'Activo',
      responsable: '',
      regionId: this.regionesActivas[0]?.id || 0,
      marcaId: this.marcasActivas[0]?.id || 0,
      servicioIds: [],
      serviciosNombres: []
    };
  }
}
