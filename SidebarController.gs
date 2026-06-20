// ============================================================
// SidebarController.gs — Funciones llamadas desde el sidebar HTML
// vía google.script.run
// ============================================================

/**
 * Carga todos los datos del mes actual para el sidebar.
 */
function cargarDatos() {
  try {
    var datos = leerDatosMes();
    return { ok: true, datos: datos };
  } catch (e) {
    Logger.log('Error cargarDatos: ' + e.toString());
    return { ok: false, error: e.message };
  }
}

/**
 * Agrega un proveedor desde el formulario del sidebar.
 */
function agregarProveedorDesideSidebar(formData) {
  return agregarProveedor(formData);
}

/**
 * Llama a Claude para analizar los datos actuales.
 */
function obtenerAnalisisIA() {
  try {
    var datos = leerDatosMes();
    return analizarConClaude(datos);
  } catch (e) {
    return { ok: false, texto: 'Error al obtener análisis: ' + e.message };
  }
}

/**
 * Marca un proveedor como pagado.
 */
function pagarProveedor(filaIndex) {
  return marcarProveedorPagado(filaIndex);
}

/**
 * Retorna la URL del Spreadsheet actual (para mostrar en el sidebar).
 */
function obtenerUrlSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl();
}
