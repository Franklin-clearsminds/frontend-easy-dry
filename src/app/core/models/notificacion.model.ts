export type NotificacionTipo = 'alerta' | 'info' | 'exito' | 'sistema';

export interface Notificacion {
  id: number | string;
  titulo: string;
  mensaje: string;
  tipo: NotificacionTipo;
  fecha: string;
  hora: string;
  leida: boolean;
  sucursal?: string;
  enlace?: string;
  enlaceLabel?: string;
}
