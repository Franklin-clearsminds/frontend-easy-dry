/**
 * Utilidad TypeScript para inyectar/corregir la duración en contenedores WebM (EBML)
 * generados por MediaRecorder en navegadores (Chromium/Firefox/Edge).
 * 
 * Resuelve el problema donde MediaRecorder no incluye el tag Duration en la cabecera
 * de Info, provocando que la duración se interprete como Infinity y que el video
 * no permita adelantar/retrasar (seeking) o parezca cortado al alcanzar 90s.
 */

export async function fixWebmDuration(blob: Blob, durationMs: number): Promise<Blob> {
  if (!blob || durationMs <= 0) return blob;
  if (!blob.type.includes('webm')) return blob;

  try {
    const arrayBuffer = await blob.arrayBuffer();
    const fixedBuffer = injectDurationIntoWebm(arrayBuffer, durationMs);
    return new Blob([fixedBuffer], { type: blob.type || 'video/webm' });
  } catch (err) {
    console.warn('Advertencia al parchar duración WebM, usando blob original:', err);
    return blob;
  }
}

function injectDurationIntoWebm(buffer: ArrayBuffer, durationMs: number): ArrayBuffer {
  const bytes = new Uint8Array(buffer);
  const dataView = new DataView(buffer);

  // Verificar firma EBML: 0x1A 0x45 0xDF 0xA3
  if (bytes.length < 4 || bytes[0] !== 0x1A || bytes[1] !== 0x45 || bytes[2] !== 0xDF || bytes[3] !== 0xA3) {
    return buffer;
  }

  let pos = 0;

  // 1. Saltar EBML Header
  const ebmlHeader = readElement(bytes, pos);
  if (!ebmlHeader) return buffer;
  pos += ebmlHeader.headerSize + ebmlHeader.dataSize;

  // 2. Buscar Segment Element (ID: 0x18 0x53 0x80 0x67)
  const segment = readElement(bytes, pos);
  if (!segment || segment.id !== 0x18538067) return buffer;

  const segmentContentStart = pos + segment.headerSize;
  let cursor = segmentContentStart;
  const maxSearch = Math.min(bytes.length, segmentContentStart + 4096);

  // 3. Buscar Info Element (ID: 0x15 0x49 0xA9 0x66) dentro del Segment
  let infoElement: { pos: number; id: number; headerSize: number; dataSize: number; lenVintPos: number; lenVintLength: number } | null = null;

  while (cursor < maxSearch) {
    const elem = readElement(bytes, cursor);
    if (!elem) break;
    if (elem.id === 0x1549A966) {
      infoElement = { ...elem, pos: cursor };
      break;
    }
    // Si encontramos Cluster o Tracks antes de Info, continuar buscando
    cursor += elem.headerSize + (elem.dataSize > 0 ? elem.dataSize : 0);
  }

  if (!infoElement) return buffer;

  const infoStart = infoElement.pos + infoElement.headerSize;
  const infoEnd = infoStart + infoElement.dataSize;
  let infoCursor = infoStart;

  let timecodeScale = 1000000; // default 1ms por tick en nanosegundos
  let durationPos = -1;
  let durationSize = -1;

  // 4. Buscar TimecodeScale y Duration dentro de Info
  while (infoCursor < infoEnd && infoCursor < bytes.length) {
    const subElem = readElement(bytes, infoCursor);
    if (!subElem) break;

    if (subElem.id === 0x2AD7B1) {
      // TimecodeScale (uint)
      let scaleVal = 0;
      for (let i = 0; i < subElem.dataSize; i++) {
        scaleVal = (scaleVal << 8) | bytes[infoCursor + subElem.headerSize + i];
      }
      if (scaleVal > 0) timecodeScale = scaleVal;
    } else if (subElem.id === 0x4489) {
      // Duration Element
      durationPos = infoCursor + subElem.headerSize;
      durationSize = subElem.dataSize;
      break;
    }

    infoCursor += subElem.headerSize + subElem.dataSize;
  }

  // Duración en unidades de TimecodeScale
  const durationInTicks = durationMs * (1000000 / timecodeScale);

  if (durationPos > 0) {
    // Si ya existe elemento de duración, reescribir su valor en el buffer original
    if (durationSize === 4) {
      dataView.setFloat32(durationPos, durationInTicks, false); // Big-Endian
      return buffer;
    } else if (durationSize === 8) {
      dataView.setFloat64(durationPos, durationInTicks, false); // Big-Endian
      return buffer;
    }
  }

  // Si no existe, creamos el elemento Duration (ID: 0x44 0x89 + Size: 0x88 [8 bytes] + Float64)
  // Total 11 bytes: [0x44, 0x89, 0x88, ...8 bytes Float64...]
  const durationElementBytes = new Uint8Array(11);
  durationElementBytes[0] = 0x44;
  durationElementBytes[1] = 0x89;
  durationElementBytes[2] = 0x88; // VINT 1-byte con tamaño 8 (0x80 | 8)
  const durationDV = new DataView(durationElementBytes.buffer);
  durationDV.setFloat64(3, durationInTicks, false);

  // Insertar los 11 bytes justo al inicio de los datos de Info
  const insertPos = infoStart;
  const newLength = bytes.length + 11;
  const newBuffer = new ArrayBuffer(newLength);
  const newBytes = new Uint8Array(newBuffer);
  const newDataView = new DataView(newBuffer);

  // Copiar primera parte hasta insertPos
  newBytes.set(bytes.subarray(0, insertPos), 0);
  // Insertar elemento Duration
  newBytes.set(durationElementBytes, insertPos);
  // Copiar el resto
  newBytes.set(bytes.subarray(insertPos), insertPos + 11);

  // Actualizar el tamaño VINT del elemento Info
  updateVintSize(newBytes, newDataView, infoElement.lenVintPos, infoElement.lenVintLength, infoElement.dataSize + 11);

  return newBuffer;
}

/**
 * Lee un elemento EBML (ID + VINT de tamaño)
 */
function readElement(bytes: Uint8Array, offset: number): {
  id: number;
  headerSize: number;
  dataSize: number;
  lenVintPos: number;
  lenVintLength: number;
} | null {
  if (offset >= bytes.length) return null;

  // Leer ID (VINT de 1 a 4 bytes con bit indicador de longitud)
  const firstByte = bytes[offset];
  let idLength = 0;
  if (firstByte & 0x80) idLength = 1;
  else if (firstByte & 0x40) idLength = 2;
  else if (firstByte & 0x20) idLength = 3;
  else if (firstByte & 0x10) idLength = 4;
  else return null;

  if (offset + idLength > bytes.length) return null;

  let id = 0;
  for (let i = 0; i < idLength; i++) {
    id = (id << 8) | bytes[offset + i];
  }

  // Leer Data Size (VINT)
  const sizeOffset = offset + idLength;
  if (sizeOffset >= bytes.length) return null;

  const sizeFirstByte = bytes[sizeOffset];
  let sizeLength = 0;
  let sizeMask = 0;

  if (sizeFirstByte & 0x80) { sizeLength = 1; sizeMask = 0x7F; }
  else if (sizeFirstByte & 0x40) { sizeLength = 2; sizeMask = 0x3F; }
  else if (sizeFirstByte & 0x20) { sizeLength = 3; sizeMask = 0x1F; }
  else if (sizeFirstByte & 0x10) { sizeLength = 4; sizeMask = 0x0F; }
  else if (sizeFirstByte & 0x08) { sizeLength = 5; sizeMask = 0x07; }
  else if (sizeFirstByte & 0x04) { sizeLength = 6; sizeMask = 0x03; }
  else if (sizeFirstByte & 0x02) { sizeLength = 7; sizeMask = 0x01; }
  else if (sizeFirstByte & 0x01) { sizeLength = 8; sizeMask = 0x00; }
  else return null;

  if (sizeOffset + sizeLength > bytes.length) return null;

  let dataSize = sizeFirstByte & sizeMask;
  for (let i = 1; i < sizeLength; i++) {
    dataSize = (dataSize << 8) | bytes[sizeOffset + i];
  }

  return {
    id,
    headerSize: idLength + sizeLength,
    dataSize,
    lenVintPos: sizeOffset,
    lenVintLength: sizeLength,
  };
}

/**
 * Actualiza el valor VINT preservando la cantidad de bytes que ocupaba originalmente
 */
function updateVintSize(
  bytes: Uint8Array,
  dataView: DataView,
  vintPos: number,
  vintLength: number,
  newSize: number
): void {
  if (vintLength === 1) {
    bytes[vintPos] = 0x80 | (newSize & 0x7F);
  } else if (vintLength === 2) {
    bytes[vintPos] = 0x40 | ((newSize >> 8) & 0x3F);
    bytes[vintPos + 1] = newSize & 0xFF;
  } else if (vintLength === 3) {
    bytes[vintPos] = 0x20 | ((newSize >> 16) & 0x1F);
    bytes[vintPos + 1] = ((newSize >> 8) & 0xFF);
    bytes[vintPos + 2] = newSize & 0xFF;
  } else if (vintLength === 4) {
    bytes[vintPos] = 0x10 | ((newSize >> 24) & 0x0F);
    bytes[vintPos + 1] = ((newSize >> 16) & 0xFF);
    bytes[vintPos + 2] = ((newSize >> 8) & 0xFF);
    bytes[vintPos + 3] = newSize & 0xFF;
  }
}
