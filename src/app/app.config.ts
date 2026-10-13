import { ApplicationConfig, importProvidersFrom, inject, LOCALE_ID, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LucideAngularModule } from 'lucide-angular';
import { routes } from './app.routes';
import { EASYDRY_ICONS } from './shared/icons/lucide-icons';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { AuthService } from './core/services/auth.service';
import { firstValueFrom } from 'rxjs';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    // Las pantallas se descargan en segundo plano cuando el navegador está libre: al navegar ya están listas.
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([jwtInterceptor, errorInterceptor])),
    // Antes de la primera ruta: recupera el access token (solo vive en memoria) con la cookie HttpOnly del refresh token.
    provideAppInitializer(() => firstValueFrom(inject(AuthService).restaurarSesion())),
    importProvidersFrom(LucideAngularModule.pick(EASYDRY_ICONS))
  ]
};
