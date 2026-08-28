export type NotificacionTipo = 'alerta' | 'info' | 'exito' | 'sistema';

export interface Notificacion {
  id: number;
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

export const MOCK_NOTIFICACIONES: Notificacion[] = [
  {
    id: 1,
    titulo: 'Incidente en Aspiradora AS-002',
    mensaje: 'Fallo eléctrico reportado en Bahía 2. Requiere revisión del técnico de turno.',
    tipo: 'alerta',
    fecha: '2026-08-28',
    hora: '10:15',
    leida: false,
    sucursal: 'EasyDry Quito Norte',
    enlace: '/taller-tecnico',
    enlaceLabel: 'Ir al Taller',
  },
  {
    id: 2,
    titulo: 'Toyota RAV4 — Pendiente aprobación',
    mensaje: 'OT #OT-2026-0842 finalizada y esperando aprobación gerencial del cierre diario.',
    tipo: 'info',
    fecha: '2026-08-28',
    hora: '09:40',
    leida: false,
    sucursal: 'EasyDry Quito Norte',
    enlace: '/aprobaciones',
    enlaceLabel: 'Ver aprobaciones',
  },
  {
    id: 3,
    titulo: 'Stock crítico: Shampoo pH Neutro',
    mensaje: 'Quedan 8 unidades en bodega central. Umbral mínimo: 15 unidades.',
    tipo: 'alerta',
    fecha: '2026-08-28',
    hora: '08:55',
    leida: false,
    sucursal: 'Bodega Central',
    enlace: '/inventario',
    enlaceLabel: 'Ver inventario',
  },
  {
    id: 4,
    titulo: 'Mantenimiento preventivo completado',
    mensaje: 'Lavadoras LAV-01 y LAV-02 certificadas tras calibración semanal.',
    tipo: 'exito',
    fecha: '2026-08-27',
    hora: '17:30',
    leida: true,
    sucursal: 'EasyDry Quito Sur',
    enlace: '/maquinaria',
    enlaceLabel: 'Ver equipos',
  },
  {
    id: 5,
    titulo: 'Nuevo servicio extra asignado',
    mensaje: 'Pulido VIP Cerámico programado para mañana 09:00 — placa ABC-1234.',
    tipo: 'info',
    fecha: '2026-08-27',
    hora: '16:10',
    leida: true,
    sucursal: 'Red Nacional',
    enlace: '/servicios',
    enlaceLabel: 'Ver servicios',
  },
  {
    id: 6,
    titulo: 'Respaldo del sistema completado',
    mensaje: 'Copia de seguridad nocturna de la plataforma EasyDry® ejecutada correctamente.',
    tipo: 'sistema',
    fecha: '2026-08-27',
    hora: '02:00',
    leida: true,
    sucursal: 'EasyDry Corporativo',
  },
];
