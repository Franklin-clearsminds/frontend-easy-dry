import { TestBed } from '@angular/core/testing';
import { PasswordRequisitosComponent } from './password-requisitos.component';
import { LucideAngularModule } from 'lucide-angular';
import { EASYDRY_ICONS } from '../../icons/lucide-icons';

describe('PasswordRequisitosComponent', () => {
  const crear = (password: string, email = '') => {
    const fixture = TestBed.createComponent(PasswordRequisitosComponent);
    fixture.componentInstance.password = password;
    fixture.componentInstance.email = email;
    fixture.detectChanges();
    const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')) as HTMLElement[];
    return { fixture, filas };
  };

  beforeEach(() => TestBed.configureTestingModule({ imports: [PasswordRequisitosComponent, LucideAngularModule.pick(EASYDRY_ICONS)] }));

  it('con el campo vacío muestra los requisitos en gris, sin marcarlos como fallidos', () => {
    const { filas } = crear('');
    expect(filas.length).toBe(7);
    expect(filas.every((f) => f.classList.contains('text-slate-500'))).toBeTrue();
    expect(filas.some((f) => f.classList.contains('text-rose-600'))).toBeFalse();
  });

  it('mientras se escribe marca en rojo lo que falta y en verde lo que ya cumple', () => {
    const { filas } = crear('lavado');
    const rojas = filas.filter((f) => f.classList.contains('text-rose-600')).map((f) => f.textContent);
    const verdes = filas.filter((f) => f.classList.contains('text-emerald-600')).map((f) => f.textContent);
    expect(rojas.join(' ')).toContain('Al menos 10 caracteres');
    expect(rojas.join(' ')).toContain('mayúscula');
    expect(rojas.join(' ')).toContain('número');
    expect(rojas.join(' ')).toContain('especial');
    expect(verdes.join(' ')).toContain('minúscula');
  });

  it('una contraseña válida deja todo en verde', () => {
    const { filas } = crear('Lavado#2026Seco');
    expect(filas.every((f) => f.classList.contains('text-emerald-600'))).toBeTrue();
  });

  it('con el correo del usuario agrega el requisito de no contenerlo', () => {
    const { filas } = crear('Maria.Perez#2026X', 'maria.perez@easydry.com');
    expect(filas.length).toBe(8);
    expect(filas.filter((f) => f.classList.contains('text-rose-600')).map((f) => f.textContent).join(' ')).toContain('correo');
  });

  it('se actualiza al cambiar la contraseña', () => {
    const { fixture } = crear('abc');
    fixture.componentInstance.password = 'Lavado#2026Seco';
    fixture.detectChanges();
    const filas = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('li')) as HTMLElement[];
    expect(filas.every((f) => f.classList.contains('text-emerald-600'))).toBeTrue();
  });
});
