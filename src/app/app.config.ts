import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { LucideAngularModule } from 'lucide-angular';
import { routes } from './app.routes';
import { EASYDRY_ICONS } from './shared/icons/lucide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideAnimations(),
    importProvidersFrom(LucideAngularModule.pick(EASYDRY_ICONS))
  ]
};
