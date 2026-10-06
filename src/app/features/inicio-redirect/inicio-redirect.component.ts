import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio-redirect',
  standalone: true,
  template: '',
})
export class InicioRedirectComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.auth.verificarPermisosActualizados(true).subscribe(() => {
      void this.router.navigateByUrl(this.auth.rutaInicial(), { replaceUrl: true });
    });
  }
}
