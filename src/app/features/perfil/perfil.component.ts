import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { StorageUploadService } from '../../core/services/storage-upload.service';
import { isRealProfilePhoto } from '../../core/config/env';
import { ToastService } from '../../shared/services/toast.service';
import { Role, ROLE_LABELS, UsuarioAuth } from '../../core/models/roles.model';
import { ModalPortalDirective } from '../../shared/directives/modal-portal.directive';
import { ImageCropModalComponent } from '../../shared/components/image-crop-modal/image-crop-modal.component';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, ModalPortalDirective, ImageCropModalComponent],
  template: `
    <div class="space-y-6 animate-fade-in pb-12">
      
      <!-- Top Title Bar -->
      <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-easydry flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-easydry-blue/10 text-easydry-blue text-xs font-bold mb-2">
            <i-lucide name="user" class="w-3.5 h-3.5"></i-lucide>
            <span>Configuración de Cuenta</span>
          </div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 font-outfit">Mi Perfil</h1>
          <p class="text-slate-500 text-xs mt-1">Gestiona tu avatar, credenciales de acceso y visualiza tus datos de usuario.</p>
        </div>

        <div class="flex items-center gap-3">
          <span 
            class="px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border"
            [ngClass]="isAdmin ? 'bg-purple-50 text-purple-800 border-purple-200' : 'bg-blue-50 text-blue-800 border-blue-200'">
            <i-lucide [name]="isAdmin ? 'shield-check' : 'user-check'" class="w-4 h-4"></i-lucide>
            <span>{{ rolLabel }}</span>
          </span>

          @if (!modoEdicion) {
            <button 
              type="button"
              (click)="activarEdicion()"
              class="px-4 py-2 bg-easydry-green hover:bg-easydry-green-dark text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-glow-green flex items-center gap-2 cursor-pointer">
              <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
              <span>Editar Perfil</span>
            </button>
          } @else {
            <div class="flex items-center gap-2">
              <button 
                type="button"
                (click)="intentarCancelarEdicion()"
                class="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer">
                <i-lucide name="x" class="w-4 h-4"></i-lucide>
                <span>Cancelar</span>
              </button>
              <button 
                type="button"
                (click)="solicitarGuardar()"
                class="px-4 py-2 bg-easydry-green text-slate-950 hover:bg-easydry-green/90 font-extrabold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer">
                <i-lucide name="save" class="w-4 h-4"></i-lucide>
                <span>Guardar Edición</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Editing Active Banner -->
      @if (modoEdicion) {
        <div class="bg-gradient-to-r from-easydry-blue/10 via-blue-50 to-emerald-50 border border-easydry-blue/20 p-4 rounded-2xl flex items-center justify-between gap-4 animate-fade-in shadow-xs">
          <div class="flex items-center gap-3">
            <div class="p-2 bg-easydry-blue text-white rounded-xl shadow-xs">
              <i-lucide name="edit-3" class="w-4 h-4"></i-lucide>
            </div>
            <div>
              <p class="text-xs font-extrabold text-slate-900">Modo de Edición de Perfil Activo</p>
              <p class="text-[11px] text-slate-600 mt-0.5">Puedes cambiar tu foto y editar tus datos autorizados. Haz clic en "Guardar Edición" al finalizar.</p>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-2">
            <button 
              (click)="intentarCancelarEdicion()"
              class="text-xs text-slate-500 hover:text-slate-800 font-bold px-2 py-1">
              Descartar
            </button>
            <button 
              (click)="solicitarGuardar()"
              class="px-3 py-1.5 bg-easydry-blue text-white text-xs font-bold rounded-lg shadow-xs hover:bg-easydry-blue-dark">
              Guardar
            </button>
          </div>
        </div>
      }

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Left Column: Avatar & Quick Info -->
        <div class="col-span-1 space-y-6">
          <div class="bg-white rounded-3xl border border-slate-100 shadow-easydry p-6 text-center">
            
            <!-- Avatar with Change Photo Overlay -->
            <div class="relative inline-block mb-4 group">
              @if (avatarPreviewUrl && !avatarFailed) {
                <img
                  [src]="avatarPreviewUrl"
                  alt="Avatar"
                  (error)="avatarFailed = true"
                  class="w-32 h-32 rounded-full object-cover border-4 border-easydry-blue/20 mx-auto shadow-lg transition-transform group-hover:scale-105">
              } @else {
                <div class="w-32 h-32 rounded-full bg-slate-100 border-4 border-easydry-blue/20 mx-auto shadow-lg flex items-center justify-center text-3xl font-extrabold text-slate-400">
                  {{ (perfilForm.nombre || currentUser?.nombre || '?').charAt(0) }}{{ (perfilForm.apellido || currentUser?.apellido || '').charAt(0) }}
                </div>
              }
              
              @if (modoEdicion) {
                <button 
                  type="button"
                  (click)="fileInput.click()"
                  class="absolute bottom-0 right-0 p-2.5 bg-easydry-blue text-white rounded-full hover:bg-easydry-blue-dark transition-all shadow-md border-2 border-white cursor-pointer"
                  title="Subir foto desde archivo">
                  <i-lucide name="camera" class="w-4 h-4"></i-lucide>
                </button>
              }

              <input 
                type="file" 
                #fileInput 
                (change)="onFileSelected($event)" 
                accept="image/*" 
                class="hidden">
            </div>
            
            @if (modoEdicion) {
              <div class="flex justify-center gap-2 mb-4 animate-fade-in">
                <button 
                  type="button"
                  (click)="fileInput.click()"
                  class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer">
                  <i-lucide name="upload" class="w-3.5 h-3.5"></i-lucide>
                  <span>Subir Foto</span>
                </button>
                @if (cropSourceUrl || pendingAvatarFile) {
                  <button
                    type="button"
                    (click)="reabrirAjuste()"
                    class="px-3 py-1.5 bg-easydry-blue/10 hover:bg-easydry-blue/20 text-easydry-blue font-bold rounded-xl text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer">
                    <i-lucide name="crop" class="w-3.5 h-3.5"></i-lucide>
                    <span>Ajustar</span>
                  </button>
                }
              </div>
            }

            <h3 class="text-lg font-bold text-slate-900 leading-snug">{{ currentUser?.nombre }} {{ currentUser?.apellido }}</h3>
            <p class="text-[11px] font-extrabold text-easydry-blue uppercase tracking-widest mt-0.5">{{ rolLabel }}</p>
            
            <div class="mt-6 pt-5 border-t border-slate-100 text-left space-y-3 text-xs">
              <div class="flex items-center gap-3 text-slate-600">
                <i-lucide name="mail" class="w-4 h-4 text-slate-400 flex-shrink-0"></i-lucide>
                <span class="truncate">{{ currentUser?.email }}</span>
              </div>
              <div class="flex items-center gap-3 text-slate-600">
                <i-lucide name="building-2" class="w-4 h-4 text-slate-400 flex-shrink-0"></i-lucide>
                <span class="truncate">{{ currentUser?.sucursalNombre || 'Red Nacional EasyDry®' }}</span>
              </div>
              <div class="flex items-center gap-3 text-slate-600">
                <i-lucide name="shield" class="w-4 h-4 text-slate-400 flex-shrink-0"></i-lucide>
                <span>Estado: <strong class="text-emerald-600 font-bold">Activo</strong></span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Edit Forms -->
        <div class="col-span-1 md:col-span-2 space-y-6">
          
          <!-- Personal Info Form -->
          <div class="bg-white rounded-3xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 class="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <i-lucide name="user" class="w-5 h-5 text-easydry-blue"></i-lucide>
                Datos Personales del Usuario
              </h3>
              @if (isAdmin) {
                <span class="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold rounded-full">
                  Edición Habilitada (Admin)
                </span>
              } @else {
                <span class="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                  <i-lucide name="lock" class="w-3 h-3"></i-lucide>
                  Solo Lectura (Admin)
                </span>
              }
            </div>
            
            <form (ngSubmit)="solicitarGuardar()" class="p-6 space-y-5">
              
              <!-- Admin-Only Notice Banner -->
              @if (!isAdmin) {
                <div class="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-3">
                  <i-lucide name="lock" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></i-lucide>
                  <div>
                    <p class="font-bold text-amber-950">Restricción de Edición Administrativa</p>
                    <p class="text-[11px] text-amber-800 mt-1 leading-relaxed">
                      Por políticas de seguridad de EasyDry®, los nombres, apellidos y correos institucionales solo pueden ser modificados por un <strong>Super Administrador</strong>. Si necesitas actualizar tus datos oficiales, contacta a la Gerencia o Administración Central.
                    </p>
                  </div>
                </div>
              }

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                    <span>Nombres</span>
                    @if (!isAdmin || !modoEdicion) { <i-lucide name="lock" class="w-3 h-3 text-slate-400"></i-lucide> }
                  </label>
                  <input 
                    type="text" 
                    [(ngModel)]="perfilForm.nombre" 
                    name="nombre" 
                    [disabled]="!isAdmin || !modoEdicion"
                    [readonly]="!isAdmin || !modoEdicion"
                    class="w-full p-2.5 border rounded-xl text-xs font-semibold transition-all"
                    [ngClass]="(isAdmin && modoEdicion) ? 'bg-white border-easydry-blue focus:ring-2 focus:ring-easydry-blue text-slate-900' : 'bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed'">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                    <span>Apellidos</span>
                    @if (!isAdmin || !modoEdicion) { <i-lucide name="lock" class="w-3 h-3 text-slate-400"></i-lucide> }
                  </label>
                  <input 
                    type="text" 
                    [(ngModel)]="perfilForm.apellido" 
                    name="apellido" 
                    [disabled]="!isAdmin || !modoEdicion"
                    [readonly]="!isAdmin || !modoEdicion"
                    class="w-full p-2.5 border rounded-xl text-xs font-semibold transition-all"
                    [ngClass]="(isAdmin && modoEdicion) ? 'bg-white border-easydry-blue focus:ring-2 focus:ring-easydry-blue text-slate-900' : 'bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed'">
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5 flex items-center justify-between">
                  <span>Correo Electrónico Institucional</span>
                  @if (!isAdmin || !modoEdicion) { <i-lucide name="lock" class="w-3 h-3 text-slate-400"></i-lucide> }
                </label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <i-lucide name="mail" class="w-4 h-4"></i-lucide>
                  </span>
                  <input 
                    type="email" 
                    [(ngModel)]="perfilForm.email" 
                    name="email" 
                    [disabled]="!isAdmin || !modoEdicion"
                    [readonly]="!isAdmin || !modoEdicion"
                    class="w-full pl-10 p-2.5 border rounded-xl text-xs font-semibold transition-all"
                    [ngClass]="(isAdmin && modoEdicion) ? 'bg-white border-easydry-blue focus:ring-2 focus:ring-easydry-blue text-slate-900' : 'bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed'">
                </div>
              </div>

              @if (modoEdicion) {
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between animate-fade-in">
                  <button 
                    type="button" 
                    (click)="intentarCancelarEdicion()"
                    class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                    Cancelar y Descartar
                  </button>

                  <button 
                    type="submit" 
                    class="px-5 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
                    <i-lucide name="save" class="w-4 h-4"></i-lucide>
                    <span>Guardar Edición</span>
                  </button>
                </div>
              }
            </form>
          </div>

          <!-- Security / Password Form -->
          <div class="bg-white rounded-3xl border border-slate-100 shadow-easydry overflow-hidden">
            <div class="p-5 border-b border-slate-100">
              <h3 class="font-bold text-slate-900 flex items-center gap-2 text-sm">
                <i-lucide name="key" class="w-5 h-5 text-slate-600"></i-lucide>
                Seguridad & Cambio de Contraseña
              </h3>
            </div>
            
            <form (ngSubmit)="cambiarPassword()" class="p-6 space-y-5">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Contraseña Actual</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <i-lucide name="lock" class="w-4 h-4"></i-lucide>
                  </span>
                  <input 
                    type="password" 
                    [(ngModel)]="passwords.actual" 
                    name="actual" 
                    class="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" 
                    placeholder="Ingresa tu contraseña actual">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Nueva Contraseña</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i-lucide name="lock" class="w-4 h-4"></i-lucide>
                    </span>
                    <input 
                      type="password" 
                      [(ngModel)]="passwords.nueva" 
                      name="nueva" 
                      class="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" 
                      placeholder="Mínimo 6 caracteres">
                  </div>
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Confirmar Nueva Contraseña</label>
                  <div class="relative">
                    <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <i-lucide name="lock" class="w-4 h-4"></i-lucide>
                    </span>
                    <input 
                      type="password" 
                      [(ngModel)]="passwords.confirmacion" 
                      name="confirmacion" 
                      class="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" 
                      placeholder="Repite la nueva contraseña">
                  </div>
                </div>
              </div>

              <div class="pt-2 flex justify-end">
                <button 
                  type="submit" 
                  [disabled]="isChangingPass"
                  class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50">
                  <i-lucide name="shield" class="w-4 h-4"></i-lucide>
                  <span>{{ isChangingPass ? 'Actualizando...' : 'Actualizar Contraseña' }}</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>

      <!-- ───────────────────────────────────────────────────────────── -->
      <!-- MODAL 1: CONFIRMACIÓN PARA GUARDAR CAMBIOS                    -->
      <!-- ───────────────────────────────────────────────────────────── -->
      @if (showConfirmGuardarModal) {
        <div appModalPortal class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-center">
            <div class="w-14 h-14 rounded-2xl bg-easydry-blue/10 text-easydry-blue flex items-center justify-center mx-auto">
              <i-lucide name="save" class="w-7 h-7"></i-lucide>
            </div>

            <h3 class="font-extrabold text-slate-900 text-lg">¿Guardar Cambios de Perfil?</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              ¿Estás seguro de que deseas guardar las modificaciones realizadas en tu perfil institucional?
            </p>

            <div class="flex items-center gap-3 pt-3">
              <button 
                type="button" 
                (click)="showConfirmGuardarModal = false"
                class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                Continuar Editando
              </button>

              <button 
                type="button" 
                [disabled]="isSaving"
                (click)="ejecutarGuardado()"
                class="flex-1 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50">
                {{ isSaving ? 'Guardando...' : 'Sí, Guardar' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ───────────────────────────────────────────────────────────── -->
      <!-- MODAL 2: ÉXITO DE CAMBIOS REALIZADOS                          -->
      <!-- ───────────────────────────────────────────────────────────── -->
      @if (showExitoModal) {
        <div appModalPortal class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-center">
            <div class="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <i-lucide name="check-circle-2" class="w-7 h-7"></i-lucide>
            </div>

            <h3 class="font-extrabold text-slate-900 text-lg">¡Cambios Realizados con Éxito!</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Tu información personal y avatar han sido actualizados y sincronizados correctamente en EasyDry®.
            </p>

            <div class="pt-2">
              <button 
                type="button" 
                (click)="cerrarModalExito()"
                class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer">
                Aceptar y Continuar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ───────────────────────────────────────────────────────────── -->
      <!-- MODAL 3: DESCARTAR CAMBIOS AL SALIR                           -->
      <!-- ───────────────────────────────────────────────────────────── -->
      @if (showDescartarModal) {
        <div appModalPortal class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div class="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 text-center">
            <div class="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <i-lucide name="alert-triangle" class="w-7 h-7"></i-lucide>
            </div>

            <h3 class="font-extrabold text-slate-900 text-lg">¿Descartar Cambios no Guardados?</h3>
            <p class="text-xs text-slate-500 leading-relaxed">
              Tienes cambios pendientes en tu perfil. Si sales ahora, todas las modificaciones no guardadas se perderán.
            </p>

            <div class="flex items-center gap-3 pt-3">
              <button 
                type="button" 
                (click)="showDescartarModal = false"
                class="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer">
                Continuar Editando
              </button>

              <button 
                type="button" 
                (click)="confirmarDescarte()"
                class="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer">
                Sí, Descartar Cambios
              </button>
            </div>
          </div>
        </div>
      }

      <app-image-crop-modal
        [open]="showCropModal"
        [imageSrc]="cropSourceUrl"
        (apply)="onCropApplied($event)"
        (cancel)="cerrarAjuste()">
      </app-image-crop-modal>

    </div>
  `
})
export class PerfilComponent implements OnInit {
  private authService = inject(AuthService);
  private storageUpload = inject(StorageUploadService);
  private toastService = inject(ToastService);

  currentUser: UsuarioAuth | null = this.authService.getCurrentUser();
  
  isAdmin = false;
  modoEdicion = false;
  isSaving = false;
  isChangingPass = false;

  // Modals state
  showConfirmGuardarModal = false;
  showExitoModal = false;
  showDescartarModal = false;

  pendingAvatarFile: File | null = null;
  showCropModal = false;
  cropSourceUrl = '';

  perfilForm = {
    nombre: '',
    apellido: '',
    email: '',
    avatar: ''
  };

  avatarFailed = false;

  get avatarPreviewUrl(): string {
    const raw = this.perfilForm.avatar || '';
    if (raw.startsWith('data:image/') || raw.startsWith('blob:')) return raw;
    if (!isRealProfilePhoto(raw)) return '';
    return this.storageUpload.resolveBackendUrl(raw);
  }

  backupForm = {
    nombre: '',
    apellido: '',
    email: '',
    avatar: ''
  };

  passwords = {
    actual: '',
    nueva: '',
    confirmacion: ''
  };

  ngOnInit(): void {
    this.cargarDatosUsuario();
  }

  cargarDatosUsuario(): void {
    this.currentUser = this.authService.getCurrentUser();
    if (!this.currentUser) return;

    const roleStr = (this.currentUser.role || '').toString().toUpperCase();
    this.isAdmin = roleStr === Role.SUPER_ADMIN || roleStr.includes('ADMIN');
    
    this.perfilForm = {
      nombre: this.currentUser.nombre || '',
      apellido: this.currentUser.apellido || '',
      email: this.currentUser.email || '',
      avatar: isRealProfilePhoto(this.currentUser.avatar) ? this.currentUser.avatar || '' : ''
    };
    this.pendingAvatarFile = null;
    this.cropSourceUrl = '';
    this.showCropModal = false;
    this.avatarFailed = false;

    this.backupForm = { ...this.perfilForm };
  }

  get rolLabel(): string {
    const role = this.authService.getRole();
    return role ? (ROLE_LABELS[role] || role.toString()) : 'Super Administrador';
  }

  activarEdicion(): void {
    this.backupForm = { ...this.perfilForm };
    this.modoEdicion = true;
    this.toastService.info('Modo Edición', 'Ahora puedes modificar tus datos y foto de perfil.');
  }

  hasUnsavedChanges(): boolean {
    return (
      this.perfilForm.nombre !== this.backupForm.nombre ||
      this.perfilForm.apellido !== this.backupForm.apellido ||
      this.perfilForm.email !== this.backupForm.email ||
      this.perfilForm.avatar !== this.backupForm.avatar
    );
  }

  intentarCancelarEdicion(): void {
    if (this.hasUnsavedChanges()) {
      this.showDescartarModal = true;
    } else {
      this.modoEdicion = false;
    }
  }

  confirmarDescarte(): void {
    this.perfilForm = { ...this.backupForm };
    this.pendingAvatarFile = null;
    this.cropSourceUrl = '';
    this.showCropModal = false;
    this.showDescartarModal = false;
    this.modoEdicion = false;
    this.toastService.info('Edición Cancelada', 'Se han restaurado los valores originales.');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.toastService.warning('Archivo inválido', 'Selecciona una imagen (JPG, PNG o WEBP).');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.warning('Tamaño Excedido', 'La imagen no debe superar los 5 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const preview = e.target?.result as string;
        if (preview) {
          this.cropSourceUrl = preview;
          this.showCropModal = true;
        }
      };
      reader.readAsDataURL(file);
      input.value = '';
    }
  }

  reabrirAjuste(): void {
    if (!this.cropSourceUrl) return;
    this.showCropModal = true;
  }

  cerrarAjuste(): void {
    this.showCropModal = false;
  }

  onCropApplied(result: { file: File; preview: string }): void {
    this.pendingAvatarFile = result.file;
    this.perfilForm.avatar = result.preview;
    this.avatarFailed = false;
    this.showCropModal = false;
    this.toastService.success('Imagen ajustada', 'El recorte está listo. Guarda el perfil para subirlo a S3.');
  }

  solicitarGuardar(): void {
    if (this.isAdmin) {
      if (!this.perfilForm.nombre.trim() || !this.perfilForm.apellido.trim() || !this.perfilForm.email.trim()) {
        this.toastService.warning('Campos Incompletos', 'Por favor llena todos los campos obligatorios.');
        return;
      }
    }

    this.showConfirmGuardarModal = true;
  }

  async ejecutarGuardado(): Promise<void> {
    this.isSaving = true;
    try {
      let avatarUrl = this.backupForm.avatar || '';
      if (this.pendingAvatarFile && this.currentUser?.id) {
        avatarUrl = await this.storageUpload.uploadMedia(this.pendingAvatarFile, {
          category: 'PERFIL_USUARIO',
          type: 'FOTO_PERFIL',
          clientUuid: String(this.currentUser.id),
          fileName: this.pendingAvatarFile.name || `avatar_${Date.now()}.jpg`,
          contentType: this.pendingAvatarFile.type || 'image/jpeg',
        });
      }

      const payload: Partial<UsuarioAuth> = {
        avatar: avatarUrl,
      };

      if (this.isAdmin) {
        payload.nombre = this.perfilForm.nombre.trim();
        payload.apellido = this.perfilForm.apellido.trim();
        payload.email = this.perfilForm.email.trim();
      }

      this.authService.updateProfile(payload).subscribe({
        next: (res) => {
          this.isSaving = false;
          if (!res.success) {
            this.showConfirmGuardarModal = false;
            this.toastService.error('Error', 'No se pudieron guardar los cambios.');
            return;
          }
          this.currentUser = res.user;
          this.perfilForm.avatar = res.user.avatar || avatarUrl;
          this.pendingAvatarFile = null;
          this.backupForm = { ...this.perfilForm };
          this.showConfirmGuardarModal = false;
          this.modoEdicion = false;
          this.showExitoModal = true;
        },
        error: () => {
          this.isSaving = false;
          this.showConfirmGuardarModal = false;
          this.toastService.error('Error', 'No se pudieron guardar los cambios.');
        }
      });
    } catch (error) {
      this.isSaving = false;
      this.showConfirmGuardarModal = false;
      this.toastService.error('Error', 'No se pudo subir la foto de perfil a S3.');
    }
  }

  cerrarModalExito(): void {
    this.showExitoModal = false;
  }

  cambiarPassword(): void {
    if (!this.passwords.actual || !this.passwords.nueva || !this.passwords.confirmacion) {
      this.toastService.warning('Campos Requeridos', 'Por favor completa todos los campos de contraseña.');
      return;
    }

    if (this.passwords.nueva.length < 6) {
      this.toastService.warning('Contraseña Corta', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    
    if (this.passwords.nueva !== this.passwords.confirmacion) {
      this.toastService.error('Error de Coincidencia', 'La confirmación no coincide con la nueva contraseña.');
      return;
    }

    this.isChangingPass = true;
    this.authService.changePassword(this.passwords.actual, this.passwords.nueva).subscribe({
      next: (res) => {
        this.isChangingPass = false;
        if (res.success) {
          this.toastService.success('Seguridad Actualizada', 'Tu contraseña ha sido cambiada exitosamente.');
          this.passwords = { actual: '', nueva: '', confirmacion: '' };
        } else {
          this.toastService.error('Error', res.message || 'No se pudo actualizar la contraseña.');
        }
      },
      error: () => {
        this.isChangingPass = false;
        this.toastService.error('Error', 'Ocurrió un error al cambiar la contraseña.');
      }
    });
  }
}
