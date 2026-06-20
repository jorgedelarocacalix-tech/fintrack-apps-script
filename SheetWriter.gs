// ============================================================
// SheetWriter.gs — Escribe filas nuevas en el Sheet
// ============================================================

/**
 * Crea la hoja "Proveedores" si no existe.
 * Llamado desde el menú Fintrack > Crear hoja Proveedores.
 */
function crearHojaProveedores() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existente = ss.getSheetByName('Proveedores');

  if (existente) {
    SpreadsheetApp.getUi().alert('La hoja "Proveedores" ya existe.');
    return { ok: true, mensaje: 'La hoja ya existía.' };
  }

  var hoja = ss.insertSheet('Proveedores');

  // Cabecera
  var cabecera = [
    'Proveedor', 'Categoría', 'Fecha vence', 'Monto (L)',
    'Banco/Forma de pago', 'Estado', 'Nota', 'Fecha agregado'
  ];
  hoja.appendRow(cabecera);

  // Estilo de cabecera
  var rangoCab = hoja.getRange(1, 1, 1, cabecera.length);
  rangoCab.setBackground('#534AB7');
  rangoCab.setFontColor('#FFFFFF');
  rangoCab.setFontWeight('bold');

  // Anchos de columna
  hoja.setColumnWidth(1, 160); // Proveedor
  hoja.setColumnWidth(2, 160); // Categoría
  hoja.setColumnWidth(3, 110); // Fecha vence
  hoja.setColumnWidth(4, 100); // Monto
  hoja.setColumnWidth(5, 130); // Banco
  hoja.setColumnWidth(6, 90);  // Estado
  hoja.setColumnWidth(7, 200); // Nota
  hoja.setColumnWidth(8, 120); // Fecha agregado

  hoja.freezeRows(1);

  return { ok: true, mensaje: 'Hoja "Proveedores" creada exitosamente.' };
}

/**
 * Agrega un nuevo proveedor/pago a la hoja Proveedores.
 * Llamado desde el sidebar vía google.script.run.
 *
 * @param {Object} datos - { proveedor, categoria, monto, fechaVence, bancoPago, nota }
 */
function agregarProveedor(datos) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName('Proveedores');

    if (!hoja) {
      crearHojaProveedores();
      hoja = ss.getSheetByName('Proveedores');
    }

    var ahora = new Date();
    var fechaAgregado = Utilities.formatDate(ahora, 'America/Tegucigalpa', 'dd/MM/yyyy');

    var fila = [
      datos.proveedor || '',
      datos.categoria || '',
      datos.fechaVence || '',
      datos.monto ? parseFloat(datos.monto) : '',
      datos.bancoPago || '',
      'pendiente',
      datos.nota || '',
      fechaAgregado
    ];

    hoja.appendRow(fila);

    // Colorear fila nueva
    var ultimaFila = hoja.getLastRow();
    var rangoFila = hoja.getRange(ultimaFila, 1, 1, fila.length);
    var colorFondo = ultimaFila % 2 === 0 ? '#F5F4FF' : '#FFFFFF';
    rangoFila.setBackground(colorFondo);

    return { ok: true, mensaje: 'Proveedor "' + datos.proveedor + '" agregado correctamente.' };

  } catch (e) {
    Logger.log('Error agregarProveedor: ' + e.toString());
    return { ok: false, mensaje: 'Error al agregar: ' + e.message };
  }
}

/**
 * Marca un proveedor como pagado en la hoja Proveedores.
 * @param {number} filaIndex - Índice 0-based (se suma 2 para compensar cabecera + 1-based)
 */
function marcarProveedorPagado(filaIndex) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hoja = ss.getSheetByName('Proveedores');
    if (!hoja) return { ok: false, mensaje: 'Hoja Proveedores no encontrada.' };

    var filaSheet = filaIndex + 2; // +1 cabecera, +1 base 1
    hoja.getRange(filaSheet, 6).setValue('pagado');

    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: e.message };
  }
}
