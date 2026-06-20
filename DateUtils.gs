// ============================================================
// DateUtils.gs — Normalización de fechas inconsistentes del Sheet
// ============================================================

/**
 * Convierte cualquier formato de fecha que Jorge usa en el Sheet
 * a objeto Date de JavaScript. Retorna null si no puede parsear.
 *
 * Formatos conocidos en el Sheet:
 *   1/27/2025   → mm/dd/yyyy  (americano)
 *   21/7/2025   → dd/mm/yyyy  (europeo/hondureño)
 *   14/2/025    → typo de año
 *   08-03-2026  → dd-mm-yyyy con guiones
 *   Date object directo (cuando Sheets ya lo convirtió)
 */
function normalizarFecha(valor) {
  if (!valor) return null;

  // Ya es un objeto Date de Apps Script
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return valor;
  }

  var str = String(valor).trim();
  if (!str || str === '' || str.startsWith('#')) return null;

  // Reemplazar guiones por barras para unificar
  str = str.replace(/-/g, '/');

  var partes = str.split('/');
  if (partes.length !== 3) return null;

  var a = parseInt(partes[0], 10);
  var b = parseInt(partes[1], 10);
  var c = parseInt(partes[2], 10);

  if (isNaN(a) || isNaN(b) || isNaN(c)) return null;

  var dia, mes, anio;

  // Corregir años con typo (ej: 025 → 2025)
  if (c < 100) c += 2000;

  // Detectar si es mm/dd/yyyy (americano) o dd/mm/yyyy
  // Si el primer número > 12, DEBE ser dd (día)
  if (a > 12) {
    // formato dd/mm/yyyy
    dia = a; mes = b; anio = c;
  } else if (b > 12) {
    // formato mm/dd/yyyy
    mes = a; dia = b; anio = c;
  } else {
    // Ambiguo: asumir dd/mm/yyyy (más común en Honduras)
    dia = a; mes = b; anio = c;
  }

  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  var fecha = new Date(anio, mes - 1, dia);
  if (isNaN(fecha.getTime())) return null;
  return fecha;
}

/**
 * Convierte una fecha a string ISO (yyyy-mm-dd) para uso interno.
 */
function fechaAISO(fecha) {
  if (!fecha) return null;
  var d = normalizarFecha(fecha);
  if (!d) return null;
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

/**
 * Retorna cuántos días faltan hasta la fecha dada.
 * Negativo = ya pasó. 0 = hoy.
 */
function diasHastaFecha(fechaISO) {
  if (!fechaISO) return null;
  var hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  var partes = fechaISO.split('-');
  var destino = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
  return Math.round((destino - hoy) / (1000 * 60 * 60 * 24));
}

/**
 * Clasifica urgencia de un pago.
 */
function clasificarUrgencia(fechaISO, estado) {
  if (estado === 'pagado') return 'pagado';
  var dias = diasHastaFecha(fechaISO);
  if (dias === null) return 'sin-fecha';
  if (dias < 0) return 'mora';
  if (dias <= 3) return 'urgente';
  if (dias <= 10) return 'proximo';
  return 'ok';
}

/**
 * Formatea una fecha ISO a string legible en español.
 * Ejemplo: "2026-06-22" → "22 jun 2026"
 */
function formatearFecha(fechaISO) {
  if (!fechaISO) return '—';
  var meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  var partes = fechaISO.split('-');
  return parseInt(partes[2]) + ' ' + meses[parseInt(partes[1]) - 1] + ' ' + partes[0];
}
