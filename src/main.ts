import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { aplicarEscalaGuardadaAntesDeArrancar } from './app/core/services/ui-scale.service';

// Antes del primer render: evita el parpadeo de "Normal" seguido de un salto a la escala guardada.
aplicarEscalaGuardadaAntesDeArrancar();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
