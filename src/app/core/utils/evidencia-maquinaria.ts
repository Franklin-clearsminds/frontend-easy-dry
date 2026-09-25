import { EvidenciaMaquinaria, nombrePersona } from '../models';

/** Detecta si una evidencia es foto, video o documento (PDF) según tipo, mime o extensión. */
export function clasificarEvidencia(e: { tipo?: string; mimeType?: string; url?: string }): EvidenciaMaquinaria['kind'] {
  const tipo = String(e.tipo || '').toUpperCase();
  const mime = String(e.mimeType || '').toLowerCase();
  const url = String(e.url || '').toLowerCase().split('?')[0];
  if (tipo.includes('VIDEO') || mime.startsWith('video/') || /\.(mp4|mov|webm)$/.test(url)) return 'VIDEO';
  if (tipo.includes('DOC') || tipo.includes('PDF') || mime === 'application/pdf' || url.endsWith('.pdf')) return 'DOCUMENTO';
  return 'FOTO';
}

/** Normaliza las evidencias que devuelve el backend (solo activas) al modelo del panel. */
export function mapEvidenciasMaquinaria(raw: any): EvidenciaMaquinaria[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e: any) => e && e.url && e.activa !== false)
    .map((e: any) => ({
      id: String(e.id || e.url),
      tipo: String(e.tipo || ''),
      url: String(e.url),
      descripcion: e.descripcion || undefined,
      etapa: e.etapa || undefined,
      mimeType: e.mimeType || undefined,
      tamanoBytes: e.tamanoBytes != null ? Number(e.tamanoBytes) : undefined,
      duracionSeg: e.duracionSeg != null ? Number(e.duracionSeg) : null,
      subidoPorId: e.subidoPorId || e.subidoPor?.id || undefined,
      subidoPorNombre: e.subidoPor ? nombrePersona(e.subidoPor) : undefined,
      creadaEn: e.creadaEn || e.createdAt || undefined,
      kind: clasificarEvidencia(e),
    }));
}

/** Fecha y hora local legible (dd/mm/aaaa hh:mm) a partir de un ISO del backend. */
export function fechaHoraLocal(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Solo fecha local (dd/mm/aaaa). */
export function fechaLocal(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** YYYY-MM-DD en hora local (compatible con los filtros por fecha existentes). */
export function fechaISOLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).substring(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Fecha programada (solo día, YYYY-MM-DD). Si el backend la guardó a medianoche UTC (solo fecha) se respeta ese día
 * para no correrla un día atrás por la zona horaria; si trae hora real se convierte a hora local.
 */
export function fechaProgramadaISO(iso?: string | null): string {
  if (!iso) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return String(iso);
  if (/T00:00:00(\.000)?Z?$/.test(String(iso))) return String(iso).substring(0, 10);
  return fechaISOLocal(iso);
}

/** dd/mm/aaaa de una fecha programada (mismas reglas que fechaProgramadaISO). */
export function fechaProgramadaLocal(iso?: string | null): string {
  const d = fechaProgramadaISO(iso);
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}
