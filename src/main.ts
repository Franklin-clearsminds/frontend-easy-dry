import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { aplicarEscalaGuardadaAntesDeArrancar } from './app/core/services/ui-scale.service';
import { instalarSelectBuscable } from './app/core/utils/select-buscable';

// Antes del primer render: evita el parpadeo de "Normal" seguido de un salto a la escala guardada.
aplicarEscalaGuardadaAntesDeArrancar();

// Cualquier lista desplegable con muchas opciones (agencias, clientes, regiones, servicios…) gana un buscador.
instalarSelectBuscable();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
