import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import { ROLE_LABELS } from '../../core/models/roles.model';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-6 animate-fade-in">
      
      <!-- Top Title Bar -->
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-easydry">
        <h1 class="text-2xl font-extrabold text-slate-900 font-outfit">Configuración de Perfil</h1>
        <p class="text-slate-500 text-xs mt-1">Gestiona tu información personal, credenciales de acceso y preferencias.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <!-- Left Column: Avatar & Quick Info -->
        <div class="col-span-1 space-y-6">
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry p-6 text-center">
            <div class="relative inline-block mb-4">
              <img
                [src]="perfilForm.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'"
                alt="Avatar"
                class="w-32 h-32 rounded-full object-cover border-4 border-easydry-blue/10 mx-auto shadow-md">
              <button 
                class="absolute bottom-0 right-0 p-2.5 bg-easydry-blue text-white rounded-full hover:bg-easydry-blue-dark transition-colors shadow-lg border-2 border-white"
                title="Cambiar Foto">
                <i-lucide name="image" class="w-4 h-4"></i-lucide>
              </button>
            </div>
            
            <h3 class="text-lg font-bold text-slate-900">{{ currentUser?.nombre }} {{ currentUser?.apellido }}</h3>
            <p class="text-[11px] font-extrabold text-easydry-blue uppercase tracking-widest mt-1">{{ rolLabel }}</p>
            
            <div class="mt-6 pt-6 border-t border-slate-100 text-left space-y-3">
               <div class="flex items-center gap-3 text-slate-600 text-xs">
                 <i-lucide name="mail" class="w-4 h-4 text-slate-400"></i-lucide>
                 <span class="truncate">{{ currentUser?.email }}</span>
               </div>
               <div class="flex items-center gap-3 text-slate-600 text-xs">
                 <i-lucide name="map-pin" class="w-4 h-4 text-slate-400"></i-lucide>
                 <span class="truncate">{{ currentUser?.sucursalNombre || 'Sede Central' }}</span>
               </div>
            </div>
          </div>
        </div>

        <!-- Right Column: Edit Forms -->
        <div class="col-span-1 md:col-span-2 space-y-6">
          
          <!-- Personal Info Form -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry">
            <div class="p-5 border-b border-slate-100">
              <h3 class="font-bold text-slate-900 flex items-center gap-2">
                <i-lucide name="user" class="w-5 h-5 text-easydry-blue"></i-lucide>
                Datos Personales
              </h3>
            </div>
            
            <form (ngSubmit)="guardarCambios()" class="p-6 space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Nombres</label>
                  <input type="text" [(ngModel)]="perfilForm.nombre" name="nombre" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Apellidos</label>
                  <input type="text" [(ngModel)]="perfilForm.apellido" name="apellido" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all">
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Correo Electrónico</label>
                <div class="relative">
                  <span class="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                    <i-lucide name="mail" class="w-4 h-4"></i-lucide>
                  </span>
                  <input type="email" [(ngModel)]="perfilForm.email" name="email" class="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all">
                </div>
              </div>

              <div class="pt-4 flex justify-end">
                <button type="submit" class="px-5 py-2.5 bg-easydry-blue hover:bg-easydry-blue-dark text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm">
                  <i-lucide name="check" class="w-4 h-4"></i-lucide>
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>

          <!-- Security / Password Form -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-easydry">
            <div class="p-5 border-b border-slate-100">
              <h3 class="font-bold text-slate-900 flex items-center gap-2">
                <i-lucide name="lock" class="w-5 h-5 text-slate-600"></i-lucide>
                Seguridad y Contraseña
              </h3>
            </div>
            
            <form (ngSubmit)="cambiarPassword()" class="p-6 space-y-5">
              <div>
                <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Contraseña Actual</label>
                <input type="password" [(ngModel)]="passwords.actual" name="actual" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" placeholder="••••••••">
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Nueva Contraseña</label>
                  <input type="password" [(ngModel)]="passwords.nueva" name="nueva" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" placeholder="••••••••">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-slate-700 uppercase mb-1.5">Confirmar Nueva Contraseña</label>
                  <input type="password" [(ngModel)]="passwords.confirmacion" name="confirmacion" class="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-easydry-blue focus:border-transparent transition-all" placeholder="••••••••">
                </div>
              </div>

              <div class="pt-4 flex justify-end">
                <button type="submit" class="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-2 shadow-sm">
                  <i-lucide name="shield" class="w-4 h-4"></i-lucide>
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PerfilComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  currentUser = this.authService.getCurrentUser();
  
  get rolLabel(): string {
    const role = this.authService.getRole();
    return role ? ROLE_LABELS[role] : 'Desconocido';
  }

  // Clone object to avoid two-way binding affecting the global state directly until saved
  perfilForm = {
    nombre: this.currentUser?.nombre || '',
    apellido: this.currentUser?.apellido || '',
    email: this.currentUser?.email || '',
    avatar: this.currentUser?.avatar || ''
  };

  passwords = {
    actual: '',
    nueva: '',
    confirmacion: ''
  };

  guardarCambios() {
    // Aquí se llamaría a un servicio real para actualizar
    if (!this.perfilForm.nombre || !this.perfilForm.apellido || !this.perfilForm.email) {
      this.toastService.warning('Campos incompletos', 'Por favor llena todos tus datos personales.');
      return;
    }
    this.toastService.success('Perfil Actualizado', 'Tus datos han sido guardados correctamente.');
  }

  cambiarPassword() {
    if (!this.passwords.actual || !this.passwords.nueva || !this.passwords.confirmacion) {
      this.toastService.warning('Validación', 'Ingresa la contraseña actual y la nueva.');
      return;
    }
    
    if (this.passwords.nueva !== this.passwords.confirmacion) {
      this.toastService.error('Error', 'Las contraseñas nuevas no coinciden.');
      return;
    }

    this.toastService.success('Seguridad', 'Tu contraseña ha sido actualizada con éxito.');
    this.passwords = { actual: '', nueva: '', confirmacion: '' }; // reset
  }
}
