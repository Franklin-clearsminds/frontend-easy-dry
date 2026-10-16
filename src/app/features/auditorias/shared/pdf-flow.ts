import { jsPDF } from 'jspdf';
import { StorageUploadService } from '../../../core/services/storage-upload.service';

/** Colores del documento original de EasyDry. */
export const AZUL_ENCABEZADO: [number, number, number] = [169, 200, 236];
export const AZUL_TITULO: [number, number, number] = [11, 79, 156];
export const TEXTO: [number, number, number] = [15, 23, 42];
export const GRIS: [number, number, number] = [100, 116, 139];

export interface ImagenCargada { dataUrl: string; formato: 'PNG' | 'JPEG'; ancho: number; alto: number }

/** Descarga una imagen (también las privadas, con URL firmada) y la deja lista para incrustar en el PDF. */
export async function cargarImagen(origen: string, storage?: StorageUploadService): Promise<ImagenCargada | null> {
  try {
    let url = origen;
    if (storage && !origen.startsWith('data:') && !origen.startsWith('assets/')) url = await storage.resolveMediaUrlStrict(origen);
    const blob = origen.startsWith('data:') ? await (await fetch(origen)).blob() : await (await fetch(url)).blob();
    const dataUrl = await new Promise<string>((ok, mal) => {
      const lector = new FileReader();
      lector.onload = () => ok(String(lector.result));
      lector.onerror = () => mal(lector.error);
      lector.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((ok, mal) => {
      const img = new Image();
      img.onload = () => ok({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => mal(new Error('imagen no válida'));
      img.src = dataUrl;
    });
    return { dataUrl, formato: /image\/png/.test(blob.type) ? 'PNG' : 'JPEG', ancho: dim.w, alto: dim.h };
  } catch {
    return null;
  }
}

/**
 * Cursor de escritura para armar un PDF por bloques sin cortar texto, imágenes ni firmas: cada bloque pide su alto y, si no cabe,
 * el documento pasa a una página nueva.
 */
export class PdfFlow {
  readonly doc = new jsPDF({ unit: 'mm', format: 'a4' });
  readonly margen = 12;
  readonly ancho = 210 - 24;
  y = 12;
  private readonly pie: (doc: jsPDF, pagina: number) => void;

  constructor(pie: (doc: jsPDF, pagina: number) => void = () => undefined) {
    this.pie = pie;
  }

  get alturaUtil(): number {
    return 297 - 14;
  }

  /** Asegura `alto` mm libres en la página actual; si no caben, abre otra. */
  asegurar(alto: number): void {
    if (this.y + alto > this.alturaUtil) this.paginaNueva();
  }

  paginaNueva(): void {
    this.doc.addPage();
    this.y = 12;
  }

  /** Franja azul con un título centrado (como los encabezados del formulario). */
  encabezado(titulo: string, alto = 6.5): void {
    this.asegurar(alto + 8);
    this.doc.setFillColor(...AZUL_ENCABEZADO);
    this.doc.rect(this.margen, this.y, this.ancho, alto, 'F');
    this.doc.setDrawColor(...TEXTO);
    this.doc.setLineWidth(0.2);
    this.doc.rect(this.margen, this.y, this.ancho, alto);
    this.doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXTO);
    this.doc.text(titulo, this.margen + this.ancho / 2, this.y + alto - 2, { align: 'center' });
    this.y += alto;
  }

  /** Párrafo dentro de un marco; si el texto es largo se reparte entre páginas sin cortar renglones. */
  caja(texto: string, opciones: { vacio?: string; minAlto?: number; tamano?: number; negrita?: boolean } = {}): void {
    const tamano = opciones.tamano ?? 9;
    const interlineado = tamano * 0.42;
    this.doc.setFont('helvetica', opciones.negrita ? 'bold' : 'normal').setFontSize(tamano).setTextColor(...TEXTO);
    const lineas: string[] = this.doc.splitTextToSize(texto.trim() || opciones.vacio || '', this.ancho - 6);
    const minAlto = opciones.minAlto ?? 10;
    let i = 0;
    do {
      const cabenAqui = Math.max(1, Math.floor((this.alturaUtil - this.y - 5) / interlineado));
      const trozo = lineas.slice(i, i + cabenAqui);
      const alto = Math.max(trozo.length * interlineado + 5, i === 0 ? minAlto : 0);
      this.asegurar(Math.min(alto, 20));
      this.doc.setDrawColor(...TEXTO).setLineWidth(0.2).rect(this.margen, this.y, this.ancho, alto);
      this.doc.setFont('helvetica', opciones.negrita ? 'bold' : 'normal').setFontSize(tamano).setTextColor(...TEXTO);
      this.doc.text(trozo, this.margen + 3, this.y + 4.5);
      this.y += alto;
      i += trozo.length;
      if (i < lineas.length) this.paginaNueva();
    } while (i < lineas.length);
  }

  /** Fila de etiquetas azules con su valor debajo (PARA / DE / FECHA / N.º). */
  filaEtiquetada(campos: { etiqueta: string; valor: string; ancho: number }[]): void {
    const alto = 6;
    this.asegurar(alto * 2 + 2);
    let x = this.margen;
    this.doc.setDrawColor(...TEXTO).setLineWidth(0.2);
    for (const c of campos) {
      const w = (c.ancho / 100) * this.ancho;
      this.doc.setFillColor(...AZUL_ENCABEZADO).rect(x, this.y, w, alto, 'FD');
      this.doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...TEXTO).text(c.etiqueta, x + w / 2, this.y + 4.2, { align: 'center' });
      this.doc.rect(x, this.y + alto, w, alto + 2);
      this.doc.setFont('helvetica', 'normal').setFontSize(8.5);
      const lineas: string[] = this.doc.splitTextToSize(c.valor, w - 3);
      this.doc.text(lineas.slice(0, 2), x + 1.5, this.y + alto + 4);
      x += w;
    }
    this.y += alto * 2 + 2;
  }

  /** Etiqueta azul a la izquierda y valor a la derecha (ASUNTO / ANTECEDENTES). */
  filaEtiquetaValor(etiqueta: string, valor: string): void {
    this.doc.setFont('helvetica', 'normal').setFontSize(9);
    const w = 34;
    const lineas: string[] = this.doc.splitTextToSize(valor.trim(), this.ancho - w - 5);
    const alto = Math.max(9, lineas.length * 3.9 + 4);
    this.asegurar(alto);
    this.doc.setDrawColor(...TEXTO).setLineWidth(0.2);
    this.doc.setFillColor(...AZUL_ENCABEZADO).rect(this.margen, this.y, w, alto, 'FD');
    this.doc.rect(this.margen + w, this.y, this.ancho - w, alto);
    this.doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...TEXTO).text(etiqueta, this.margen + 2, this.y + alto - 3);
    this.doc.setFont('helvetica', 'normal').setFontSize(9).text(lineas, this.margen + w + 2, this.y + 4.5);
    this.y += alto;
  }

  espacio(mm: number): void {
    this.y += mm;
  }

  /** Numera todas las páginas al final (la numeración total solo se conoce al terminar). */
  numerar(): void {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.pie(this.doc, p);
      this.doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...GRIS).text(`Página ${p} de ${total}`, 210 - 12, 292, { align: 'right' });
    }
  }

  /** Inserta una imagen manteniendo su proporción dentro de un recuadro; devuelve si pudo. */
  imagen(img: ImagenCargada, x: number, y: number, maxAncho: number, maxAlto: number): void {
    const escala = Math.min(maxAncho / img.ancho, maxAlto / img.alto);
    const w = img.ancho * escala;
    const h = img.alto * escala;
    this.doc.addImage(img.dataUrl, img.formato, x + (maxAncho - w) / 2, y + (maxAlto - h) / 2, w, h);
  }
}

/** Descarga el PDF con un nombre de archivo seguro. */
export function guardarPdf(flow: PdfFlow, nombre: string): void {
  flow.numerar();
  flow.doc.save(`${nombre.replace(/[^\w.-]+/g, '_')}.pdf`);
}

export function fechaLarga(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fechaHora(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
