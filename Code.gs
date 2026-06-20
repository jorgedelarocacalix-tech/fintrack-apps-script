// ============================================================
// Code.gs — Entry point de Fintrack La Roca
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Fintrack')
    .addItem('Abrir dashboard', 'abrirSidebar')
    .addSeparator()
    .addItem('Crear hoja Proveedores', 'crearHojaProveedores')
    .addItem('Sincronizar datos', 'sincronizarDatos')
    .toUi();
}

function abrirSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('Fintrack La Roca')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function sincronizarDatos() {
  abrirSidebar();
}
