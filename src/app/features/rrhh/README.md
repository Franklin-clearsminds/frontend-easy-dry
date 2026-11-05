# Módulo RRHH (prototipo)

Prototipo **solo del front web**, con **datos de ejemplo en memoria**. No hay backend, base de datos ni app móvil. Todo se reinicia al recargar la página, salvo las tareas que nacen de un informe (ver más abajo). Sirve para probar y presentar cómo funcionaría.

## Quién lo ve

Solo el **Super Admin**. Las rutas usan los códigos de módulo `rrhh/tareas` y `rrhh/timbradas`, que no existen en la base de datos: el Super Admin pasa siempre por la guardia de módulos y los demás roles no los tienen asignados, así que no ven el menú y la ruta los manda a «sin acceso».

| Menú (grupo «RRHH») | Ruta | Pantalla |
|---|---|---|
| Tareas del personal | `/rrhh/tareas` | [rrhh-tareas.component.ts](rrhh-tareas.component.ts) |
| Timbradas | `/rrhh/timbradas` | [rrhh-timbradas.component.ts](rrhh-timbradas.component.ts) |

Sin lógica por rol por ahora: el Super Admin hace todo (asigna, completa «como el operador», revisa y timbra). La jerarquía de quién asigna a quién y cómo se ve según el rol quedan por definir.

## Archivos

| Archivo | Qué hace |
|---|---|
| `rrhh.modelos.ts` | Tipos y reglas puras: distancia (Haversine), entrada o salida por hora, horas trabajadas, tarea vencida, agrupar por día, límites de adjuntos. |
| `rrhh-mock.service.ts` | Los **datos de ejemplo** y las operaciones sobre ellos (crear, completar, revisar, devolver, cancelar, timbrar). Es lo único que habría que reemplazar por llamadas al backend. |
| `rrhh-adjuntos.component.ts` | Selector de archivos con previsualización (imagen, video o documento). |
| `rrhh-google-maps.ts` | Carga la API de Google Maps una sola vez con la clave del entorno. |
| `rrhh-mapa-ubicacion.component.ts` | Mapa para elegir la ubicación de una agencia (usado en Sucursales). |
| `rrhh-tareas.component.ts` | Pantalla de tareas y su lista de notificaciones. |
| `rrhh-timbradas.component.ts` | Pantalla de timbradas. |
| `rrhh-responsables.ts` | Recuerda en el navegador el responsable de cada novedad de un informe. |
| `rrhh.modelos.spec.ts` | Pruebas de las reglas y del flujo con los datos de ejemplo. |

## 1. Tareas

- El Super Admin asigna una tarea a un operador de ejemplo: **título**, **descripción**, **fecha límite** (opcional) y **archivos** (imágenes, videos o documentos).
- Estados: **Pendiente → Completada → Revisada**, más **Cancelada**. **Vencida** no es un estado guardado: es una marca que se calcula cuando una tarea sigue Pendiente después de su fecha límite.
- Para completarla se escribe una **respuesta** y se adjunta **al menos una evidencia**. Se hace con el botón «Completar como operador» (se simula al operador).
- Quien asignó la tarea la **aprueba** (queda Revisada) o la **devuelve** a Pendiente con un motivo.
- Solo una tarea Pendiente se puede **cancelar**.
- Cada tarea muestra con **fecha y hora** cuándo se asignó, completó, revisó y canceló, y un historial con cada paso (incluidas las devoluciones).
- **Adjuntos**: el selector abre el explorador real y previsualiza el archivo mientras la página siga abierta (no se sube a ningún lado). Tope de **5 archivos** de **10 MB** cada uno.

### Notificaciones del módulo

Salen en una lista propia a un lado de la pantalla, con contador de no leídas. **No** pasan por la campana del encabezado, que habla con el backend. Cada aviso dice a quién le llegaría:

| Evento | Le llega a |
|---|---|
| Tarea asignada (queda Pendiente) | El operador |
| Tarea completada | Quien asignó la tarea |
| Tarea revisada, devuelta o cancelada | El operador |

## 1b. Tareas desde los informes de inspección

Cada **novedad** del informe tiene un selector opcional **«Responsable de la tarea»** (los operadores de ejemplo de RRHH). Sin responsable no hay tarea ni aviso.

- El responsable elegido se recuerda en el navegador (`localStorage`, [rrhh-responsables.ts](rrhh-responsables.ts)), por informe y por novedad: sobrevive a recargar y a retomar el borrador. **Nunca se envía al servidor**; el formulario lo quita de los datos antes de guardar.
- Al dar **«Guardar informe»** (el informe queda pendiente de revisión), cada novedad con responsable se vuelve una **tarea Pendiente** en RRHH, con el título y la descripción de la novedad y su fecha y hora de asignación. Si la novedad no tiene descripción se usa el título.
- La tarea muestra su **origen** («Desde un informe · INF-… · novedad …») con enlace para abrir el informe. El informe no muestra nada de las tareas: el enlace va solo de la tarea al informe.
- **Avisos** (en la lista de RRHH): uno **de la tarea** por cada novedad asignada y uno **del informe** por operador, aunque tenga varias novedades, con enlace al informe.
- **Persistencia**: estas tareas y sus avisos se conservan en el navegador al recargar, con sus estados y respuestas. Los archivos adjuntos no caben: tras recargar quedan solo sus nombres, y el detalle lo avisa. Las tareas de ejemplo y las creadas a mano se reinician. El botón **«Restablecer datos de ejemplo»** borra todo lo guardado.
- Quién revisa estas tareas sigue siendo el Super Admin desde RRHH; la jerarquía por roles queda pendiente.

## 2. Timbradas

- Timbran solo los **operadores**. Se elige el operador que timbra; su agencia sale de los datos de ejemplo.
- **La hora decide el tipo**: antes de las 12:00 es **Entrada** y desde las 12:00 es **Salida**.
- **Una entrada y una salida por día**. Repetir la marca del mismo tipo se rechaza («Ya registraste tu entrada de hoy»). Un día con una sola de las dos aparece **Incompleto**. Un día sin ninguna marca no aparece como falta, porque sin turnos ni calendario no se sabe si debía trabajar.
- **Foto**: se toma con la **cámara** del navegador. Si no hay cámara o se niega el permiso, se ofrece un selector de archivo con un aviso de que en el sistema real la foto será siempre de cámara.
- **Ubicación**: al guardar se toma la ubicación y se calcula la distancia a la agencia con la fórmula de Haversine (real). Si está a **100 m o menos**, la marca se registra y sale una alerta verde. Si está más lejos, **se rechaza** y la alerta roja dice a cuántos metros está.
- **Panel «Solo prototipo»** para la demostración:
  - *¿Dónde estoy?*: «Mi GPS real», «Estoy en la agencia» (30 m), «Estoy a 300 m» o «Estoy lejos» (5 km).
  - *¿Qué hora es?*: la actual, 08:30 (entrada) o 17:30 (salida), para probar los dos tipos a cualquier hora.
- El **resumen por día** muestra, por operador, la hora de entrada y de salida (con su foto y la distancia al abrirlas), las horas trabajadas y si el día está Completo o Incompleto. Se puede filtrar por operador y por días incompletos.

## 3. Ubicación de la agencia en Sucursales

En el formulario de la agencia ([sucursales.component.ts](../sucursales/sucursales.component.ts)) hay un recuadro **violeta** «Ubicación de la agencia (RRHH)», visible **solo para el Super Admin**:

- Un **buscador de lugares**: escribes una dirección o un nombre y Google sugiere hasta 5 lugares de Ecuador; al elegir uno, el marcador salta ahí y lo ajustas después. Usa la **Places API (New)** (hay que habilitarla en Google Cloud además de la Maps JavaScript API).
- Un **mapa de Google** ([rrhh-mapa-ubicacion.component.ts](rrhh-mapa-ubicacion.component.ts)): clic en el mapa o arrastrar el marcador para elegir el punto. La latitud y la longitud se rellenan solas y también se pueden escribir a mano; «Usar mi ubicación» toma la del navegador.
- **«Guardar ubicación» es simulado**: la deja en memoria (`RrhhMockService.ubicacionesAgencia`, por id de agencia) y muestra «Guardada (simulado)» con la hora. No se envía al servidor y se pierde al recargar. Al volver a abrir esa agencia el mapa arranca con lo guardado. «Quitar» la borra.
- Lo que se guarda aquí **no lo leen** las timbradas: las agencias de ejemplo de esa pantalla tienen su ubicación quemada.

### Clave de Google Maps

El mapa usa la **Maps JavaScript API** y el buscador, la **Places API (New)** (ambas habilitadas en el proyecto y permitidas en la clave). La clave va en el `.env` del frontend (ignorado por git) como `NG_APP_GOOGLE_MAPS_KEY=AIza…`; `node scripts/sync-env.mjs` (lo corren `npm start` y `npm run dev`) la copia a `src/environments/environment.ts` como `googleMapsKey`.

- Sin clave, el recuadro avisa «Falta la clave de Google Maps» y deja escribir las coordenadas a mano.
- Si Google la rechaza (API no habilitada, sin facturación o dominio no permitido) sale el mensaje con la causa probable.
- El mapa solo se crea cuando el recuadro se ve, para no gastar una carga de mapa por abrir la pantalla.
- Para producción, ponla en `.env.production` o en la variable `NG_APP_GOOGLE_MAPS_KEY` del CI, y restringe la clave por dominio en Google Cloud. `environment.prod.ts` se queda con la clave vacía en git.

## Datos de ejemplo

6 operadores en 3 agencias (Quito Norte, Guayaquil Centro, Cuenca), 8 tareas en distintos estados y 10 días hábiles de timbradas con algunos días incompletos.

## Qué falta para pasar a producción

- Backend: tablas y endpoints de tareas, adjuntos, notificaciones y timbradas, y el campo de ubicación de la agencia (latitud y longitud) con migración. El guardado real de «Guardar ubicación» va en el formulario de agencia.
- Reemplazar `rrhh-mock.service.ts` por llamadas al backend sin cambiar las pantallas.
- Subir de verdad los archivos y guardar la foto de cada timbrada.
- Conectar los avisos a la campana real.
- Permisos por rol, jerarquía de asignación y ámbito (país, región, agencia).
- Foto obligatoriamente de cámara (sin la alternativa del selector de archivo).
- La app móvil para que el operador complete tareas y timbre desde el celular.
