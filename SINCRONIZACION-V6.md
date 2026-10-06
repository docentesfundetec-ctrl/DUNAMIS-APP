# Sincronización v6 — 6 de octubre de 2026

## Cambios

- Firebase es la fuente de los datos confirmados. Una base existente nunca se vuelve a sembrar con la planeación incluida en el HTML.
- Los pendientes que sobreviven a una recarga se guardan como borradores privados, no se envían automáticamente. El menú permite descargarlos como JSON para revisión manual; no publicar ese archivo.
- Cada guardado usa una transacción: lee únicamente los documentos afectados, compara la versión conocida y combina campos independientes. Si el mismo campo cambió en otro dispositivo, conserva un borrador y recarga Firebase sin sobrescribirlo.
- Se desactiva la cola persistente de escrituras del SDK. El respaldo local sigue disponible, pero no equivale a una confirmación del servidor.
- Las reglas exigen el protocolo v6 y la revisión anterior. Las páginas viejas deben recargarse; sus escrituras ya no pueden volver a introducir una copia antigua.
- Se conservan las notificaciones pendientes, se procesa la primera notificación y se detectan saltos de revisión. Una señal de curso no se confunde con una revisión de la estructura.
- Cada pestaña tiene un identificador diferente. Se protegen las planillas y las notas todavía sin guardar.
- Las revisiones recibidas se registran por pestaña. Al abrir se carga de Firebase el alcance del usuario; no se acepta una revisión compartida de localStorage como prueba de que la copia es actual. Al volver a la pestaña se revalida la señal (máximo una vez por minuto), sin sondeo periódico de colecciones.
- Se mantiene la carga por rol: cursos/asignaciones del docente; matrículas, notas y asistencias del estudiante; estructura completa solo en la interfaz administrativa. Los informes completos del administrador se cargan al solicitarlos.

## Seguridad: limitación deliberada

Se conserva el acceso solo con documento por solicitud del administrador. Firebase utiliza autenticación anónima. Esto **no comprueba la identidad real ni impone permisos por rol en el servidor**. La separación por rol en JavaScript reduce lecturas, pero no es una barrera de seguridad contra una persona que utilice directamente la API. El protocolo de revisión evita sobrescrituras accidentales y clientes antiguos; no sustituye autenticación individual. No se deben considerar estos datos protegidos por rol hasta migrar a credenciales verificadas y reglas vinculadas a cada usuario.

## Consumo

Un guardado aislado suele requerir una lectura del documento y de su señal, y tres escrituras: documento, señal y marca de confirmación. Una planilla de N registros modificados utiliza aproximadamente N+1 lecturas y N+2 escrituras, más las lecturas de quienes reciben las notificaciones y eventuales reintentos por concurrencia. No se escribe toda la base al abrir la aplicación.

No existe una garantía de permanecer dentro de Spark: depende de sesiones, informes, reconexiones y cambios reales. Revisar el consumo real durante una jornada. No activar sondeos periódicos de colecciones completas.

## Publicación y mantenimiento

- `index.html` es la versión completa y portátil para GitHub Pages; no publicar solamente `index.modular.html` sin sus carpetas.
- `node scripts/build-portable.js` regenera `index.html` y `docs/index.html`.
- `node scripts/test-sync.js` verifica sintaxis, fusión, conflictos y el ejecutor de transacciones con una base simulada.
- Las reglas v6 deben publicarse después del HTML compatible. Al actualizar, pedir a todos recargar la página (Ctrl+F5).
- No borrar datos del navegador si hay borradores pendientes: descargarlos primero y revisarlos sin importarlos masivamente.
- El historial Git permite recuperar el HTML anterior. No restaurar reglas amplias para aceptar clientes antiguos: eso reabriría el problema de sobrescritura.

## Verificaciones

Pruebas automáticas locales y prueba controlada contra Firebase con un documento temporal de diagnóstico, sin cambiar registros académicos. La prueba compara dos clientes con versiones distintas, confirma cambios independientes y rechaza el conflicto del mismo campo. Los resultados de publicación y reglas se comprueban también en Chrome.
