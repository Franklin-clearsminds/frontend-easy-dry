/**
 * Buscador para cualquier lista desplegable (<select>) con muchas opciones: agencias, clientes, regiones, servicios,
 * insumos, bodegas… en páginas y en modales. Se instala una sola vez al arrancar y no exige tocar cada pantalla:
 * al abrir un <select> de más de `MINIMO_OPCIONES` opciones se muestra en su lugar un panel con un buscador (sin importar
 * mayúsculas ni tildes). Al elegir, se actualiza el <select> original y se avisa con los eventos `input` y `change`, así
 * que `ngModel` y los formularios reactivos siguen funcionando igual.
 *
 * Un <select> puede excluirse con el atributo `data-sin-buscador`. Las listas cortas siguen con el desplegable de siempre.
 */
const MINIMO_OPCIONES = 8;

const sinTildes = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Opcion {
  indice: number;
  texto: string;
  deshabilitada: boolean;
}

let instalado = false;
let abierto: { cerrar: () => void } | null = null;

function opcionesDe(select: HTMLSelectElement): Opcion[] {
  return Array.from(select.options).map((o, indice) => ({ indice, texto: (o.textContent || '').trim(), deshabilitada: o.disabled }));
}

function debeUsarBuscador(select: HTMLSelectElement): boolean {
  return !select.multiple
    && select.size <= 1
    && !select.disabled
    && !select.hasAttribute('data-sin-buscador')
    && select.options.length > MINIMO_OPCIONES;
}

function abrirPanel(select: HTMLSelectElement): void {
  abierto?.cerrar();

  const todas = opcionesDe(select);
  const rect = select.getBoundingClientRect();
  const alto = Math.min(340, Math.max(220, window.innerHeight - rect.bottom - 16));
  const abajo = window.innerHeight - rect.bottom >= 220 || rect.top < 240;

  const panel = document.createElement('div');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Elegir una opción');
  panel.className = 'fixed bg-white border-2 border-easydry-blue rounded-xl shadow-2xl flex flex-col overflow-hidden';
  panel.style.zIndex = '10600';
  panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 260) - 8))}px`;
  panel.style.width = `${Math.max(rect.width, 260)}px`;
  panel.style.maxHeight = `${alto}px`;
  if (abajo) panel.style.top = `${rect.bottom + 4}px`;
  else panel.style.bottom = `${window.innerHeight - rect.top + 4}px`;

  const cabecera = document.createElement('div');
  cabecera.className = 'p-2 border-b border-slate-200 shrink-0 bg-white';
  const buscador = document.createElement('input');
  buscador.type = 'text';
  buscador.autocomplete = 'off';
  buscador.placeholder = 'Buscar…';
  buscador.setAttribute('aria-label', 'Buscar en la lista');
  buscador.className = 'w-full px-3 py-2 text-sm font-semibold text-slate-900 placeholder:text-slate-600 bg-white border-2 border-easydry-blue rounded-lg outline-none focus:ring-2 focus:ring-easydry-blue/30';
  cabecera.appendChild(buscador);

  const lista = document.createElement('div');
  lista.setAttribute('role', 'listbox');
  lista.className = 'overflow-y-auto py-1';

  panel.appendChild(cabecera);
  panel.appendChild(lista);
  document.body.appendChild(panel);

  let visibles: Opcion[] = todas;
  let activa = Math.max(0, visibles.findIndex((o) => o.indice === select.selectedIndex));

  const elegir = (o: Opcion) => {
    if (o.deshabilitada) return;
    select.selectedIndex = o.indice;
    select.dispatchEvent(new Event('input', { bubbles: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
    cerrar();
    select.focus();
  };

  const pintar = () => {
    lista.replaceChildren();
    if (visibles.length === 0) {
      const vacio = document.createElement('div');
      vacio.className = 'px-3 py-3 text-sm font-semibold text-slate-600';
      vacio.textContent = 'Sin resultados';
      lista.appendChild(vacio);
      return;
    }
    visibles.forEach((o, i) => {
      const fila = document.createElement('div');
      fila.setAttribute('role', 'option');
      const esActual = o.indice === select.selectedIndex;
      fila.setAttribute('aria-selected', String(esActual));
      fila.className = [
        'px-3 py-2 text-sm cursor-pointer select-none',
        o.deshabilitada ? 'text-slate-400' : 'text-slate-900 font-semibold',
        i === activa ? 'bg-easydry-blue/10' : 'hover:bg-slate-100',
        esActual ? 'text-easydry-blue font-extrabold' : '',
      ].join(' ');
      fila.textContent = o.texto || '—';
      fila.addEventListener('mousedown', (e) => { e.preventDefault(); elegir(o); });
      fila.addEventListener('mousemove', () => { if (activa !== i) { activa = i; pintar(); } });
      lista.appendChild(fila);
    });
    (lista.children[activa] as HTMLElement | undefined)?.scrollIntoView({ block: 'nearest' });
  };

  const filtrar = () => {
    const q = sinTildes(buscador.value.trim());
    visibles = q ? todas.filter((o) => sinTildes(o.texto).includes(q)) : todas;
    activa = 0;
    pintar();
  };

  const fueraDelPanel = (e: Event) => {
    const objetivo = e.target as Node | null;
    if (objetivo && (panel.contains(objetivo) || objetivo === select)) return;
    cerrar();
  };

  const teclas = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); select.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); activa = Math.min(visibles.length - 1, activa + 1); pintar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activa = Math.max(0, activa - 1); pintar(); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = visibles[activa]; if (o) elegir(o); }
    else if (e.key === 'Tab') cerrar();
  };

  const alCambiarTamano = () => cerrar();

  function cerrar() {
    document.removeEventListener('mousedown', fueraDelPanel, true);
    window.removeEventListener('resize', alCambiarTamano);
    buscador.removeEventListener('keydown', teclas);
    panel.remove();
    if (abierto?.cerrar === cerrar) abierto = null;
  }

  buscador.addEventListener('input', filtrar);
  buscador.addEventListener('keydown', teclas);
  document.addEventListener('mousedown', fueraDelPanel, true);
  window.addEventListener('resize', alCambiarTamano);
  abierto = { cerrar };

  pintar();
  buscador.focus();
}

/** Se llama una vez al arrancar la aplicación. */
export function instalarSelectBuscable(): void {
  if (instalado || typeof document === 'undefined') return;
  instalado = true;

  // Clic: se evita el desplegable nativo y se abre el panel con buscador.
  document.addEventListener('mousedown', (e) => {
    const select = (e.target as HTMLElement | null)?.closest?.('select') as HTMLSelectElement | null;
    if (!select || !debeUsarBuscador(select)) return;
    if (e.button !== 0) return;
    e.preventDefault();
    select.focus();
    abrirPanel(select);
  }, true);

  // Teclado: Enter, espacio o flecha abajo sobre el <select> también abren el buscador.
  document.addEventListener('keydown', (e) => {
    const select = (e.target as HTMLElement | null)?.closest?.('select') as HTMLSelectElement | null;
    if (!select || !debeUsarBuscador(select)) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'F4') {
      e.preventDefault();
      abrirPanel(select);
    }
  }, true);
}
