import { AuthService } from '../services/auth.service';

/**
 * Permisos de UI del módulo de maquinaria: consultan los mismos códigos que el backend exige por endpoint.
 * El backend valida siempre (y aplica el alcance: región, pulidores, asignado); esto solo oculta acciones.
 */

export const puedeVerMaquinaria = (auth: AuthService) => auth.puede('maquinaria.ver');
export const puedeCrearMaquina = (auth: AuthService) => auth.puede('maquinaria.crear');
/** Editar datos y activar/desactivar. */
export const puedeEditarMaquina = (auth: AuthService) => auth.puede('maquinaria.editar');
export const puedeActivarMaquina = (auth: AuthService) => auth.puede('maquinaria.editar');
/** Asignar operador, ventana de adelanto, transferir, asignar incidentes y programar/asignar mantenimientos. */
export const puedeTrasladarMaquina = (auth: AuthService) => auth.puede('maquinaria.trasladar');
export const puedeAsignarResponsableMaquina = (auth: AuthService) => auth.puede('maquinaria.responsable');
export const puedeAsignarTecnico = (auth: AuthService) => auth.puede('taller.incidentes.asignar');
export const puedeProgramarMantenimiento = (auth: AuthService) => auth.puede('taller.mantenimientos.programar');
export const puedeExportarLimpiezas = (auth: AuthService) => auth.puede('reportes.maquinaria.limpiezas');
export const puedeGestionarMaquina = (auth: AuthService) =>
  puedeTrasladarMaquina(auth) || puedeAsignarResponsableMaquina(auth) || puedeAsignarTecnico(auth) || puedeProgramarMantenimiento(auth);
/** Historial (línea de tiempo) y movimientos. */
export const puedeVerTrazabilidad = (auth: AuthService) => auth.puede('maquinaria.trazabilidad.ver');
/** Cambiar la foto o la ficha técnica es una casilla aparte de editar los datos. */
export const puedeCambiarArchivosMaquina = (auth: AuthService) => auth.puede('maquinaria.archivos');
export const puedeVerIncidentes = (auth: AuthService) => auth.puede('incidentes.ver');
export const puedeVerMantenimientos = (auth: AuthService) => auth.puede('mantenimientos.ver');
export const puedeReportarIncidente = (auth: AuthService) => auth.puedeAlguno('maquinaria.incidente.reportar', 'taller.incidentes.reportar');

/**
 * Roles oficiales del módulo: el servidor les aplica una regla de negocio propia además del permiso
 * (el técnico reporta solo lo asignado, el líder toda su agencia…). Copia exacta de `maquinaria/maquinaria.permisos.ts`.
 */
const ROLES_DEL_MODULO = [
  'SUPER_ADMIN', 'ADMIN', 'SUPERVISOR', 'COORD_MANTENIMIENTO', 'COORD_SERVICIOS_ESPECIALES',
  'COORD_BODEGA', 'COORD_COMERCIAL', 'TECNICO', 'PULIDOR', 'LIDER',
];

/**
 * ¿Reporta sobre cualquier equipo de su alcance y no solo sobre el que tiene asignado? Es la misma condición que
 * aplica el servidor: líder, supervisor, coordinador de servicios especiales y cualquier rol creado desde Roles.
 */
export const reportaSobreSuAlcance = (auth: AuthService) =>
  auth.isLiderOperador()
  || auth.hasRole('SUPERVISOR')
  || auth.hasRole('COORD_SERVICIOS_ESPECIALES')
  || !ROLES_DEL_MODULO.some((rol) => auth.hasRole(rol));
/** Resolver / editar incidentes (el servidor exige además ser el técnico asignado si no gestiona). */
export const puedeResolverIncidentes = (auth: AuthService) => auth.puede('taller.incidentes.resolver');
export const puedeCancelarIncidentes = (auth: AuthService) => auth.puede('taller.incidentes.cancelar');
/** Ejecutar / editar mantenimientos (el servidor exige además ser el técnico asignado si no gestiona). */
export const puedeEjecutarMantenimientos = (auth: AuthService) => auth.puede('taller.mantenimientos.ejecutar');
export const puedeEditarMantenimientos = (auth: AuthService) => auth.puede('taller.mantenimientos.editar');
/**
 * Evidencias de una máquina. Subir la foto va incluida en la casilla de cada flujo (reportar o resolver una
 * incidencia, ejecutar un mantenimiento): todas conceden `maquinaria.evidencias`, que es lo que exige el servidor.
 */
export const puedeEvidenciaIncidente = (auth: AuthService) => auth.puede('maquinaria.evidencias');
export const puedeEvidenciaMantenimiento = (auth: AuthService) => auth.puede('maquinaria.evidencias');
export const puedeAgregarEvidenciaMaquinaria = (auth: AuthService) => auth.puede('maquinaria.evidencias');
export const puedeSubirEvidenciaLimpieza = (auth: AuthService) => auth.puede('taller.limpiezas.registrar');
export const puedeVerLimpiezas = (auth: AuthService) => auth.puede('limpiezas.ver');
/** Corregir observaciones o eliminar un registro de limpieza (el servidor acota además a su región). */
export const puedeEditarLimpiezas = (auth: AuthService) => auth.puede('taller.limpiezas.editar');

/**
 * Corregir el costo de un mantenimiento/incidencia ya cerrado (el técnico lo ingresa al cerrar, pero no
 * puede tocarlo después — el servidor aplica exactamente esta misma regla por rol, no por permiso).
 */
export const puedeCorregirCostoMaquinaria = (auth: AuthService) =>
  auth.hasRole('ADMIN') || auth.hasRole('SUPER_ADMIN') || auth.hasRole('COORD_MANTENIMIENTO');
