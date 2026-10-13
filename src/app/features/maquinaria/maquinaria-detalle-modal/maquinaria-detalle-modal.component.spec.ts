import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { MaquinariaDetalleModalComponent } from './maquinaria-detalle-modal.component';
import { MaquinariaService } from '../../../core/services/maquinaria.service';
import { StorageUploadService } from '../../../core/services/storage-upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { MaquinaFicha } from '../../../core/models';
import { esperar, iniciarSesion, mundo, proveedoresApiReal, requiereMundo } from '../../../../testing/api-real';

/**
 * Contra el backend REAL y la base local (ver `src/testing/api-real.ts`): usuarios con sesión real y permisos reales.
 *
 * Únicos dobles: (1) el almacenamiento de archivos (S3), porque el `.env` apunta al bucket real y subir una foto de
 * prueba escribiría en él; la foto "subida" es una clave inventada, así que el servidor —que verifica la evidencia— la
 * rechaza, y eso es lo que se prueba; (2) las APIs del navegador (cámara).
 */
function archivo(nombre: string, tipo: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], nombre, { type: tipo });
}

function ficha(over: Partial<MaquinaFicha> = {}): MaquinaFicha {
  return {
    id: mundo.maquinaria.id,
    codigo: mundo.maquinaria.codigo,
    nombre: mundo.maquinaria.nombre,
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
  let component: MaquinariaDetalleModalComponent;
  let auth: AuthService;
  let subidas: Array<{ archivo: File; meta: unknown }>;

  /** Sesión real como `usuario` y componente creado en ese contexto de inyección. */
  async function configurar(usuario: string): Promise<void> {
    TestBed.resetTestingModule();
    localStorage.clear();
    subidas = [];
    // Borde S3: anota la subida y devuelve una clave que no existe en el bucket.
    const almacenamiento = {
      uploadMedia: async (a: File, meta: unknown) => {
        subidas.push({ archivo: a, meta });
        return `maquinaria/${mundo.marca}/limpiezas/foto-inexistente.jpg`;
      },
    };
    TestBed.configureTestingModule({
      providers: [...proveedoresApiReal(), { provide: StorageUploadService, useValue: almacenamiento }],
    });
    auth = TestBed.inject(AuthService);
    await iniciarSesion(auth, usuario);

    // Se instancia la clase directamente (sin montar la vista completa, pesada en dependencias): estos métodos no tocan
    // @ViewChild (salvo iniciarCamaraLimpieza) ni los componentes hijos.
    component = TestBed.runInInjectionContext(() => new MaquinariaDetalleModalComponent());
    component.maquinariaId = null;
    component.ficha = ficha();
  }

  beforeEach(() => requiereMundo());

  afterEach(() => {
    auth?.logout();
    localStorage.clear();
  });

  it('puedeRegistrarLimpieza es true para el líder', async () => {
    await configurar('lider');
    expect(component.puedeRegistrarLimpieza).toBe(true);
  });

  it('puedeRegistrarLimpieza es true para el pulidor', async () => {
    await configurar('pulidor');
    expect(component.puedeRegistrarLimpieza).toBe(true);
  });

  it('un técnico puede agregar evidencias de incidencias sin poder subir limpiezas', async () => {
    await configurar('tecnico');
    expect(component.puedeAgregarEvidencia).toBe(true);
    expect(component.puedeRegistrarLimpieza).toBe(false);
  });

  it('puedeRegistrarLimpieza es false para admin: solo líder y pulidor registran, no auditan desde aquí', async () => {
    await configurar('admin');
    expect(component.puedeRegistrarLimpieza).toBe(false);
  });

  it('puedeRegistrarLimpieza es false para super admin', async () => {
    await configurar('superadmin');
    expect(component.puedeRegistrarLimpieza).toBe(false);
  });

  describe('cámara (las fotos se capturan en vivo, nunca se eligen de archivos guardados)', () => {
    beforeEach(async () => configurar('lider'));

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

  describe('confirmarRegistrarLimpieza', () => {
    const limpiezasEnServidor = async () =>
      (await firstValueFrom(TestBed.inject(MaquinariaService).getLimpiezasPagina({ maquinariaId: mundo.maquinaria.id }))).items.length;

    beforeEach(async () => configurar('lider'));

    it('no sube nada si no se capturó ninguna foto', async () => {
      component.limpiezaArchivos = [];
      await component.confirmarRegistrarLimpieza();
      expect(component.limpiezaError).toBe('Captura al menos una foto con la cámara.');
      expect(subidas).toEqual([]);
    });

    it('no sube nada si alguna foto capturada no es válida (defensa adicional)', async () => {
      component.limpiezaArchivos = [archivo('no-es-foto.pdf', 'application/pdf', 100)];
      await component.confirmarRegistrarLimpieza();
      expect(component.limpiezaError).toContain('no es una imagen');
      expect(subidas).toEqual([]);
    });

    it('sube la foto y el servidor rechaza una evidencia que no existe: muestra el error y deja el modal abierto', async () => {
      const antes = await limpiezasEnServidor();
      component.limpiezaArchivos = [archivo('foto.jpg', 'image/jpeg', 1024)];
      component.limpiezaObservaciones = 'Todo en orden';
      component.limpiezaModalOpen = true;

      await component.confirmarRegistrarLimpieza();

      expect(subidas.length).toBe(1);
      expect(subidas[0].meta).toEqual(jasmine.objectContaining({ category: 'MAQUINARIA_LIMPIEZA', maquinariaId: mundo.maquinaria.id }));
      expect(component.limpiezaError).toBeTruthy();
      expect(component.limpiezaModalOpen).toBe(true);
      expect(component.subiendoLimpieza).toBe(false);
      expect(await limpiezasEnServidor()).toBe(antes); // no se creó ninguna limpieza
    });

    it('muestra el error del servidor cuando la máquina es de otra agencia', async () => {
      component.ficha = ficha({ id: mundo.maquinariaAjena.id, codigo: mundo.maquinariaAjena.codigo });
      component.limpiezaArchivos = [archivo('foto.jpg', 'image/jpeg', 1024)];
      component.limpiezaModalOpen = true;

      await component.confirmarRegistrarLimpieza();

      expect(component.limpiezaError).toBeTruthy();
      expect(component.limpiezaModalOpen).toBe(true);
    });
  });

  describe('pestaña "Limpieza"', () => {
    it('aparece cuando la máquina tiene una regla de limpieza vigente', async () => {
      await configurar('lider');
      component.ficha = ficha({ limpieza: { regla: 'PULIDOR', ultimaFecha: null, ultimasFotos: [], atrasada: false } });
      expect(component.pestanas.some((p) => p.id === 'limpieza')).toBe(true);
    });

    it('no aparece si a la máquina no le aplica ninguna regla', async () => {
      await configurar('lider');
      component.ficha = ficha({ limpieza: { regla: null, ultimaFecha: null, ultimasFotos: [], atrasada: false } });
      expect(component.pestanas.some((p) => p.id === 'limpieza')).toBe(false);
    });

    it('no aparece sin el permiso limpiezas.ver, aunque la máquina tenga regla vigente (el técnico)', async () => {
      await configurar('tecnico');
      expect(auth.puede('limpiezas.ver')).toBe(false);
      component.ficha = ficha({ limpieza: { regla: 'PULIDOR', ultimaFecha: null, ultimasFotos: [], atrasada: false } });
      expect(component.pestanas.some((p) => p.id === 'limpieza')).toBe(false);
    });

    it('al abrirla carga el historial real de limpiezas de la máquina', async () => {
      await configurar('lider');
      component.maquinariaId = mundo.maquinaria.id;

      component.cambiarPestana('limpieza');
      await esperar(() => component.listaLimp.items.length >= 2);

      expect(component.listaLimp.items.map((l) => l.id)).toEqual(jasmine.arrayContaining([mundo.limpiezas.paraEditar, mundo.limpiezas.paraExportar]));
    });
  });
});
