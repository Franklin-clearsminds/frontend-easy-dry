import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { LucideAngularModule } from 'lucide-angular';
import { routes } from './app.routes';
import { EASYDRY_ICONS } from './shared/icons/lucide-icons';
import { authInterceptor, correlationInterceptor, errorInterceptor } from './core/interceptors/http.interceptors';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor, correlationInterceptor, errorInterceptor])),
    importProvidersFrom(LucideAngularModule.pick(EASYDRY_ICONS))
  ]
};

