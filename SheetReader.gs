// ============================================================
// SheetReader.gs — Lee y parsea el Sheet de pagos de tarjetas
// ============================================================

var MESES_ES = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

/**
 * Punto de entrada principal — retorna el objeto de datos completo
 * que consume el sidebar.
 */
function leerDatosMes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hojaActiva = encontrarHojaPrincipal(ss);

  if (!hojaActiva) {
    return { error: 'No se encontró la hoja principal de pagos.' };
  }

  var datos = hojaActiva.getDataRange().getValues();
  var mesActual = detectarMesActual();

  var bloqueInicio = encontrarBloqueMes(datos, mesActual);
  if (bloqueInicio === -1) {
    // Intentar con solo el nombre del mes sin año
    var mesSinAnio = mesActual.split(' ')[0];
    bloqueInicio = encontrarBloqueMes(datos, mesSinAnio);
  }
  if (bloqueInicio === -1) {
    return {
      error: 'No se encontró el bloque del mes "' + mesActual + '" en el Sheet.',
      mes: mesActual,
      tarjetas: { jorge: [], isis: [] },
      prestamosBac: [],
      proveedores: []
    };
  }

  var resultado = parsearBloqueMes(datos, bloqueInicio, mesActual);
  resultado.proveedores = leerProveedores(ss);
  return resultado;
}

/**
 * Busca la hoja que contiene el historial de pagos (no la de Proveedores).
 */
function encontrarHojaPrincipal(ss) {
  var hojas = ss.getSheets();
  for (var i = 0; i < hojas.length; i++) {
    var nombre = hojas[i].getName().toLowerCase();
    if (nombre !== 'proveedores' && nombre !== 'providers') {
      // La primera hoja que no sea Proveedores es la principal
      return hojas[i];
    }
  }
  return hojas[0] || null;
}

/**
 * Retorna el mes y año actuales en el formato que usa Jorge
 * Ejemplo: "junio 2026"
 */
function detectarMesActual() {
  var hoy = new Date();
  var nombresMes = ['enero','febrero','marzo','abril','mayo','junio',
                    'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return nombresMes[hoy.getMonth()] + ' ' + hoy.getFullYear();
}

/**
 * Busca la fila donde empieza el bloque del mes buscado.
 * Busca el texto del mes en la columna A (o B).
 */
function encontrarBloqueMes(datos, textoMes) {
  var buscar = textoMes.toLowerCase().trim();
  for (var i = 0; i < datos.length; i++) {
    for (var j = 0; j < Math.min(3, datos[i].length); j++) {
      var celda = String(datos[i][j] || '').toLowerCase().trim();
      if (celda === buscar || celda.indexOf(buscar) !== -1) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Parsea el bloque del mes y retorna el objeto de datos estructurado.
 */
function parsearBloqueMes(datos, inicio, mes) {
  var tarjetasJorge = [];
  var tarjetasIsis = [];
  var prestamosBac = [];
  var modoActual = 'jorge'; // 'jorge', 'isis', 'prestamos'

  var i = inicio + 1;
  var limite = Math.min(datos.length, inicio + 150); // máximo 150 filas por mes

  while (i < limite) {
    var fila = datos[i];
    var celdaA = String(fila[0] || '').trim();
    var celdaB = String(fila[1] || '').trim();

    // Detectar inicio del bloque del siguiente mes (parar)
    if (i > inicio + 2 && esCabeceraMes(celdaA)) break;

    // Detectar switch a sección de Isis
    if (esSeccionIsis(celdaA) || esSeccionIsis(celdaB)) {
      modoActual = 'isis';
      i++;
      continue;
    }

    // Detectar sección de préstamos BAC
    if (esSeccionPrestamos(celdaA) || esSeccionPrestamos(celdaB)) {
      modoActual = 'prestamos';
      i++;
      continue;
    }

    // Saltar filas vacías o cabeceras
    if (!celdaA && !celdaB) { i++; continue; }
    if (esCabeceraColumnas(fila)) { i++; continue; }

    if (modoActual === 'prestamos') {
      var prestamo = parsearFilaPrestamo(fila);
      if (prestamo) prestamosBac.push(prestamo);
    } else {
      var tarjeta = parsearFilaTarjeta(fila);
      if (tarjeta) {
        if (modoActual === 'isis') {
          tarjetasIsis.push(tarjeta);
        } else {
          tarjetasJorge.push(tarjeta);
        }
      }
    }

    i++;
  }

  return {
    mes: mes,
    tarjetas: {
      jorge: tarjetasJorge,
      isis: tarjetasIsis
    },
    prestamosBac: prestamosBac,
    proveedores: [] // se llena después con leerProveedores()
  };
}

/**
 * Detecta si una celda es cabecera de un nuevo mes.
 */
function esCabeceraMes(texto) {
  if (!texto) return false;
  var t = texto.toLowerCase().trim();
  for (var nombre in MESES_ES) {
    if (t.startsWith(nombre) || t.indexOf(nombre + ' 20') !== -1) {
      return true;
    }
  }
  return false;
}

/**
 * Detecta si una fila/celda indica inicio de sección de Isis.
 */
function esSeccionIsis(texto) {
  if (!texto) return false;
  var t = texto.toLowerCase();
  return t.indexOf('isis') !== -1 || t.indexOf('fonseca') !== -1;
}

/**
 * Detecta sección de préstamos BAC.
 */
function esSeccionPrestamos(texto) {
  if (!texto) return false;
  var t = texto.toLowerCase();
  return t.indexOf('prestamo') !== -1 || t.indexOf('préstamo') !== -1;
}

/**
 * Detecta si una fila es cabecera de columnas (no datos).
 * Ejemplo: "Banco | Tarjeta | Fecha de pago | ..."
 */
function esCabeceraColumnas(fila) {
  var textos = ['banco', 'tarjeta', 'fecha', 'valor', 'disponible', 'estado', 'pago'];
  var coincidencias = 0;
  for (var j = 0; j < fila.length; j++) {
    var t = String(fila[j] || '').toLowerCase();
    for (var k = 0; k < textos.length; k++) {
      if (t === textos[k] || t.startsWith(textos[k])) {
        coincidencias++;
        break;
      }
    }
  }
  return coincidencias >= 2;
}

/**
 * Parsea una fila de tarjeta de crédito.
 * Columnas esperadas: Banco | Tarjeta | Fecha pago | Fecha corte | Valor | Nota/Abono | Disponible | Estado
 */
function parsearFilaTarjeta(fila) {
  var banco = String(fila[0] || '').trim();
  var cuenta = String(fila[1] || '').trim();

  // Si no hay banco ni cuenta, ignorar
  if (!banco && !cuenta) return null;

  // Detectar proveedores mezclados en sección de tarjetas (baratillo, movesa)
  var nombreCompleto = (banco + ' ' + cuenta).toLowerCase();
  var esProveedor = nombreCompleto.indexOf('baratillo') !== -1 ||
                    nombreCompleto.indexOf('movesa') !== -1;

  var fechaPagoRaw = fila[2] || null;
  var fechaCorteRaw = fila[3] || null;
  var valorRaw = fila[4];
  var notaRaw = fila[5] || '';
  var disponibleRaw = fila[6];
  var estadoRaw = String(fila[7] || '').trim().toLowerCase();

  var fechaPago = fechaAISO(fechaPagoRaw);
  var fechaCorte = fechaAISO(fechaCorteRaw);

  var montoInfo = parsearMonto(valorRaw);
  var disponibleInfo = parsearMonto(disponibleRaw);
  var estado = normalizarEstado(estadoRaw, notaRaw);

  // Ignorar filas con errores de fórmula en los campos críticos y sin monto
  if (montoInfo === null && !fechaPago && !cuenta) return null;

  return {
    banco: banco,
    cuenta: cuenta,
    fechaPago: fechaPago,
    fechaCorte: fechaCorte,
    valorAPagar: montoInfo ? montoInfo.valor : null,
    moneda: montoInfo ? montoInfo.moneda : 'L',
    requiereRevisionUSD: montoInfo ? montoInfo.esUSD : false,
    disponible: disponibleInfo ? disponibleInfo.valor : null,
    estado: estado,
    urgencia: clasificarUrgencia(fechaPago, estado),
    nota: String(notaRaw).trim(),
    esProveedor: esProveedor,
    datoIncompleto: montoInfo === null || !fechaPago
  };
}

/**
 * Parsea una fila de préstamo BAC.
 * Columnas: Tarjeta | Cuota (texto "7 DE 24") | Monto cuota | Saldo restante
 */
function parsearFilaPrestamo(fila) {
  var tarjeta = String(fila[0] || fila[1] || '').trim();
  var cuotaTexto = String(fila[1] || fila[2] || '').trim();
  var montoCuotaRaw = fila[2] || fila[3];
  var saldoRaw = fila[3] || fila[4];

  if (!tarjeta && !cuotaTexto) return null;

  var montoInfo = parsearMonto(montoCuotaRaw);
  var saldoInfo = parsearMonto(saldoRaw);

  return {
    tarjeta: tarjeta,
    cuota: cuotaTexto,
    montoCuota: montoInfo ? montoInfo.valor : null,
    saldo: saldoInfo ? saldoInfo.valor : null
  };
}

/**
 * Parsea un valor de monto — maneja $, L, texto, errores de fórmula.
 * Retorna { valor: Number, moneda: 'L'|'USD', esUSD: bool } o null si no parseable.
 */
function parsearMonto(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  // Errores de fórmula de Sheets
  var str = String(valor).trim();
  if (str.startsWith('#')) return null;

  // Texto libre que no es monto
  if (isNaN(valor) && !str.match(/[\d,.]+/)) return null;

  var esUSD = str.indexOf('$') !== -1;
  var esLempiras = str.indexOf('L') !== -1 || str.indexOf('l') !== -1;

  // Limpiar para obtener número
  var limpio = str.replace(/[L$,\s]/g, '').replace(/[^0-9.-]/g, '');
  var numero = parseFloat(limpio);

  if (isNaN(numero)) return null;

  return {
    valor: numero,
    moneda: esUSD ? 'USD' : 'L',
    esUSD: esUSD && !esLempiras
  };
}

/**
 * Normaliza el estado de un pago a: 'pagado', 'pendiente', 'mora'.
 */
function normalizarEstado(estadoRaw, notaRaw) {
  var t = (estadoRaw + ' ' + String(notaRaw || '')).toLowerCase();
  if (t.indexOf('pagad') !== -1 || t.indexOf('pago') !== -1) return 'pagado';
  if (t.indexOf('mora') !== -1 || t.indexOf('atraso') !== -1) return 'mora';
  return 'pendiente';
}

/**
 * Lee la hoja de Proveedores (tab separado en el mismo Spreadsheet).
 */
function leerProveedores(ss) {
  var hoja = ss.getSheetByName('Proveedores');
  if (!hoja) return [];

  var datos = hoja.getDataRange().getValues();
  var proveedores = [];

  // Primera fila es cabecera
  for (var i = 1; i < datos.length; i++) {
    var fila = datos[i];
    if (!fila[0] && !fila[1]) continue; // fila vacía

    var fechaVenceRaw = fila[2];
    var montoRaw = fila[3];
    var fechaVence = fechaAISO(fechaVenceRaw);
    var montoInfo = parsearMonto(montoRaw);

    proveedores.push({
      proveedor: String(fila[0] || '').trim(),
      categoria: String(fila[1] || '').trim(),
      fechaVence: fechaVence,
      monto: montoInfo ? montoInfo.valor : null,
      moneda: 'L',
      bancoPago: String(fila[4] || '').trim(),
      estado: normalizarEstado(String(fila[5] || ''), String(fila[6] || '')),
      urgencia: clasificarUrgencia(fechaVence, normalizarEstado(String(fila[5] || ''), '')),
      nota: String(fila[6] || '').trim(),
      fechaAgregado: fechaAISO(fila[7])
    });
  }

  return proveedores;
}
