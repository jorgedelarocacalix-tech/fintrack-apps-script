// ============================================================
// Code.gs — Entry point de Fintrack La Roca
// ============================================================

// Sirve la app web cuando se accede a la URL pública
function doGet() {
  return HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('Fintrack La Roca')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Menú opcional en el Sheet (por si Jorge también lo quiere desde ahí)
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Fintrack')
    .addItem('Abrir dashboard', 'abrirSidebar')
    .addSeparator()
    .addItem('Crear hoja Proveedores', 'crearHojaProveedores')
    .toUi();
}

function abrirSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('Fintrack La Roca')
    .setWidth(420);
  SpreadsheetApp.getUi().showSidebar(html);
}

