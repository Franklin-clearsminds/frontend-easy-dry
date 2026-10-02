import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { MaquinariaDetalleModalComponent } from './maquinaria-detalle-modal.component';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { IncidenteService } from '../../../core/services/incidente.service';
import { MantenimientoService } from '../../../core/services/mantenimiento.service';
import { MovimientoMaquinariaService } from '../../../core/services/movimiento-maquinaria.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { MaquinaFicha } from '../../../core/models';

function archivo(nombre: string, tipo: string, bytes: number): File {
  const contenido = new Uint8Array(bytes);
  return new File([contenido], nombre, { type: tipo });
}

function ficha(over: Partial<MaquinaFicha> = {}): MaquinaFicha {
  return {
    id: 'm1',
    codigo: 'MQ-01',
    nombre: 'Hidrolavadora',
    estadoOperativo: 'OPERATIVA',
    activa: true,
    ventanaAdelantoDias: 7,
    incidentesNoAtendidos: 0,
    mantenimientosVencidos: 0,
    totales: { incidentes: 0, mantenimientos: 0, movimientos: 0 },
    limpieza: { regla: 'PULIDOR', ultimaFecha: null, ultimasFotos: [], atrasada: false },
    ...over,
  } as MaquinaFicha;
}

describe('MaquinariaDetalleModalComponent — registrar limpieza', () => {
  let maquinariaService: jasmine.SpyObj<MaquinariaService>;
  let storage: jasmine.SpyObj<StorageUploadService>;
  let authHasRole: jasmine.Spy;
  let component: MaquinariaDetalleModalComponent;

  function configurar(rol: string): void {
    TestBed.resetTestingModule();
    maquinariaService = jasmine.createSpyObj<MaquinariaService>('MaquinariaService', ['registrarLimpieza', 'getDetalle', 'getLimpiezasPagina']);
    maquinariaService.getLimpiezasPagina.and.returnValue(
      of({ items: [], total: 0, page: 1, pageSize: 50, totalPages: 1, hasNextPage: false, hasPrevPage: false }),
    );
    storage = jasmine.createSpyObj<StorageUploadService>('StorageUploadService', ['uploadMedia']);
    authHasRole = jasmine.createSpy('hasRole').and.callFake((r: string) => r === rol);

    TestBed.configureTestingModule({
      providers: [
        { provide: MaquinariaService, useValue: maquinariaService },
        { provide: IncidenteService, useValue: jasmine.createSpyObj('IncidenteService', ['list']) },
        { provide: MantenimientoService, useValue: jasmine.createSpyObj('MantenimientoService', ['list']) },
        { provide: MovimientoMaquinariaService, useValue: jasmine.createSpyObj('MovimientoMaquinariaService', ['list']) },
        { provide: StorageUploadService, useValue: storage },
        { provide: AuthService, useValue: { puede: () => true, hasRole: authHasRole } },
      ],
    });

    // Se instancia la clase directamente (sin montar la vista completa, pesada en dependencias):
    // estos métodos no tocan @ViewChild (salvo iniciarCamaraLimpieza, probado con la cámara simulada)
    // ni los componentes hijos.
    component = TestBed.runInInjectionContext(() => new MaquinariaDetalleModalComponent());
    // maquinariaId en null: cargarFicha() (llamada tras registrar) no dispara una petición real.
    component.maquinariaId = null;
    component.ficha = ficha();
  }

  beforeEach(() => configurar('LIDER'));

  it('puedeRegistrarLimpieza es true para el líder', () => {
    expect(component.puedeRegistrarLimpieza).toBe(true);
  });

  it('puedeRegistrarLimpieza es true para el pulidor', () => {
    configurar('PULIDOR');
    expect(component.puedeRegistrarLimpieza).toBe(true);
  });

  it('puedeRegistrarLimpieza es false para admin: solo líder y pulidor registran, no auditan desde aquí', () => {
    configurar('ADMIN');
    expect(component.puedeRegistrarLimpieza).toBe(false);
  });

  it('puedeRegistrarLimpieza es false para super admin', () => {
    configurar('SUPER_ADMIN');
    expect(component.puedeRegistrarLimpieza).toBe(false);
  });

  describe('cámara (las fotos se capturan en vivo, nunca se eligen de archivos guardados)', () => {
    it('iniciarCamaraLimpieza arranca el stream y apaga el loading cuando el navegador da acceso', async () => {
      const track = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
      const stream = { getTracks: () => [track] } as unknown as MediaStream;
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(stream));

      await component.iniciarCamaraLimpieza();

      expect(component.limpiezaCameraLoading).toBe(false);
      expect(component.limpiezaCameraError).toBeNull();
    });

    it('iniciarCamaraLimpieza fija un mensaje de error si no se puede acceder a la cámara', async () => {
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.reject(new Error('Permission denied')));

      await component.iniciarCamaraLimpieza();

      expect(component.limpiezaCameraLoading).toBe(false);
      expect(component.limpiezaCameraError).toContain('cámara');
    });

    it('cerrarRegistrarLimpieza detiene todas las pistas del stream y cierra el modal', async () => {
      const track = jasmine.createSpyObj('MediaStreamTrack', ['stop']);
      const stream = { getTracks: () => [track] } as unknown as MediaStream;
      spyOn(navigator.mediaDevices, 'getUserMedia').and.returnValue(Promise.resolve(stream));
      await component.iniciarCamaraLimpieza();
      component.limpiezaModalOpen = true;

      component.cerrarRegistrarLimpieza();

      expect(track.stop).toHaveBeenCalled();
      expect(component.limpiezaModalOpen).toBe(false);
    });

    it('quitarFotoLimpieza elimina la foto y su miniatura en el mismo índice', () => {
      component.limpiezaArchivos = [archivo('a.jpg', 'image/jpeg', 10), archivo('b.jpg', 'image/jpeg', 10)];
      component.limpiezaPreviews = ['data:a', 'data:b'];

      component.quitarFotoLimpieza(0);

      expect(component.limpiezaArchivos.map((f) => f.name)).toEqual(['b.jpg']);
      expect(component.limpiezaPreviews).toEqual(['data:b']);
    });
  });

  it('confirmarRegistrarLimpieza no sube nada si no se capturó ninguna foto', async () => {
    component.limpiezaArchivos = [];
    await component.confirmarRegistrarLimpieza();
    expect(component.limpiezaError).toBe('Captura al menos una foto con la cámara.');
    expect(storage.uploadMedia).not.toHaveBeenCalled();
  });

  it('confirmarRegistrarLimpieza no sube nada si alguna foto capturada no es válida (defensa adicional)', async () => {
    component.limpiezaArchivos = [archivo('no-es-foto.pdf', 'application/pdf', 100)];
    await component.confirmarRegistrarLimpieza();
    expect(component.limpiezaError).toContain('no es una imagen');
    expect(storage.uploadMedia).not.toHaveBeenCalled();
  });

  it('confirmarRegistrarLimpieza sube las fotos y registra la limpieza cuando todo es válido', async () => {
    storage.uploadMedia.and.returnValue(Promise.resolve('maquinaria/mq-01/limpiezas/foto1.jpg'));
    maquinariaService.registrarLimpieza.and.returnValue(of({ success: true }));
    component.limpiezaArchivos = [archivo('foto.jpg', 'image/jpeg', 1024)];
    component.limpiezaObservaciones = 'Todo en orden';
    component.limpiezaModalOpen = true;

    await component.confirmarRegistrarLimpieza();

    expect(storage.uploadMedia).toHaveBeenCalledTimes(1);
    expect(maquinariaService.registrarLimpieza).toHaveBeenCalledWith(jasmine.objectContaining({
      maquinariaId: 'm1',
      fotos: [{ url: 'maquinaria/mq-01/limpiezas/foto1.jpg' }],
      observaciones: 'Todo en orden',
    }));
    expect(component.limpiezaModalOpen).toBe(false);
    expect(component.limpiezaError).toBe('');
  });

  it('confirmarRegistrarLimpieza muestra el error del servidor y deja el modal abierto si falla', async () => {
    storage.uploadMedia.and.returnValue(Promise.resolve('maquinaria/mq-01/limpiezas/foto1.jpg'));
    maquinariaService.registrarLimpieza.and.returnValue(throwError(() => ({ error: { message: 'No puedes registrar la limpieza de esta máquina.' } })));
    component.limpiezaArchivos = [archivo('foto.jpg', 'image/jpeg', 1024)];
    component.limpiezaModalOpen = true;

    await component.confirmarRegistrarLimpieza();

    expect(component.limpiezaError).toBe('No puedes registrar la limpieza de esta máquina.');
    expect(component.limpiezaModalOpen).toBe(true);
  });

  it('la pestaña "Limpieza" aparece cuando la máquina tiene una regla de limpieza vigente', () => {
    component.ficha = ficha({ limpieza: { regla: 'PULIDOR', ultimaFecha: null, ultimasFotos: [], atrasada: false } });
    expect(component.pestanas.some((p) => p.id === 'limpieza')).toBe(true);
  });

  it('la pestaña "Limpieza" no aparece si a la máquina no le aplica ninguna regla', () => {
    component.ficha = ficha({ limpieza: { regla: null, ultimaFecha: null, ultimasFotos: [], atrasada: false } });
    expect(component.pestanas.some((p) => p.id === 'limpieza')).toBe(false);
  });

  it('registrar una limpieza recarga el historial de la pestaña "Limpieza" si ya estaba abierta', async () => {
    storage.uploadMedia.and.returnValue(Promise.resolve('maquinaria/mq-01/limpiezas/foto1.jpg'));
    maquinariaService.registrarLimpieza.and.returnValue(of({ success: true }));
    component.cambiarPestana('limpieza');
    expect(maquinariaService.getLimpiezasPagina).toHaveBeenCalledTimes(1);

    component.limpiezaArchivos = [archivo('foto.jpg', 'image/jpeg', 1024)];
    await component.confirmarRegistrarLimpieza();

    expect(maquinariaService.getLimpiezasPagina).toHaveBeenCalledTimes(2);
  });
});
