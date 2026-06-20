// ============================================================
// ClaudeService.gs — Análisis IA vía Anthropic API
// ============================================================

var CLAUDE_MODEL = 'claude-sonnet-4-6';
var CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';

var SYSTEM_PROMPT = 'Eres un asesor financiero para un empresario hondureño que maneja ' +
  'tarjetas de crédito personales (suyas y de su esposa) y pagos a proveedores de su negocio ' +
  'de retail (muebles, electrodomésticos, motos). Tu trabajo es:\n' +
  '1. Detectar pagos urgentes o en riesgo de mora\n' +
  '2. Señalar errores de datos (fórmulas rotas, fechas inconsistentes, montos en USD sin marcar)\n' +
  '3. Comparar gasto de un proveedor mes a mes y avisar si subió sin explicación\n' +
  '4. Dar un resumen ejecutivo corto y accionable\n' +
  'Responde en español, en lempiras (L), tono directo y práctico — nada de relleno.';

/**
 * Llama a Claude con los datos del mes y retorna el análisis.
 * @param {Object} datosMes - El objeto completo retornado por leerDatosMes()
 */
function analizarConClaude(datosMes) {
  try {
    var apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return { ok: false, texto: 'ANTHROPIC_API_KEY no configurada en las propiedades del script.' };
    }

    var resumen = construirResumenParaClaude(datosMes);

    var payload = {
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: 'Analiza estos datos financieros de ' + datosMes.mes + ':\n\n' + resumen
        }
      ]
    };

    var opciones = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var respuesta = UrlFetchApp.fetch(CLAUDE_API_URL, opciones);
    var codigo = respuesta.getResponseCode();
    var cuerpo = JSON.parse(respuesta.getContentText());

    if (codigo !== 200) {
      Logger.log('Error Claude API: ' + respuesta.getContentText());
      return { ok: false, texto: 'Error de API (' + codigo + '): ' + (cuerpo.error ? cuerpo.error.message : 'desconocido') };
    }

    var texto = cuerpo.content && cuerpo.content[0] ? cuerpo.content[0].text : 'Sin respuesta';
    return { ok: true, texto: texto };

  } catch (e) {
    Logger.log('Error analizarConClaude: ' + e.toString());
    return { ok: false, texto: 'Error inesperado: ' + e.message };
  }
}

/**
 * Construye un resumen en texto plano de los datos del mes para enviarlo a Claude.
 */
function construirResumenParaClaude(datosMes) {
  var lineas = [];
  lineas.push('=== MES: ' + datosMes.mes + ' ===\n');

  // Tarjetas Jorge
  lineas.push('TARJETAS DE JORGE (' + datosMes.tarjetas.jorge.length + '):');
  datosMes.tarjetas.jorge.forEach(function(t) {
    var monto = t.valorAPagar !== null ? 'L ' + t.valorAPagar.toLocaleString() : 'sin monto';
    var usd = t.requiereRevisionUSD ? ' ⚠️ en USD' : '';
    lineas.push('  - ' + t.banco + ' ' + t.cuenta +
      ' | Pago: ' + (t.fechaPago || 'sin fecha') +
      ' | ' + monto + usd +
      ' | Estado: ' + t.estado +
      (t.nota ? ' | Nota: ' + t.nota : ''));
  });

  // Tarjetas Isis
  lineas.push('\nTARJETAS DE ISIS (' + datosMes.tarjetas.isis.length + '):');
  datosMes.tarjetas.isis.forEach(function(t) {
    var monto = t.valorAPagar !== null ? 'L ' + t.valorAPagar.toLocaleString() : 'sin monto';
    lineas.push('  - ' + t.banco + ' ' + t.cuenta +
      ' | Pago: ' + (t.fechaPago || 'sin fecha') +
      ' | ' + monto +
      ' | Estado: ' + t.estado);
  });

  // Préstamos BAC
  if (datosMes.prestamosBac && datosMes.prestamosBac.length > 0) {
    lineas.push('\nPRÉSTAMOS BAC:');
    datosMes.prestamosBac.forEach(function(p) {
      lineas.push('  - Tarjeta ' + p.tarjeta +
        ' | Cuota: ' + p.cuota +
        ' | Monto cuota: L ' + (p.montoCuota || '?') +
        ' | Saldo: L ' + (p.saldo || '?'));
    });
  }

  // Proveedores
  if (datosMes.proveedores && datosMes.proveedores.length > 0) {
    lineas.push('\nPROVEEDORES (' + datosMes.proveedores.length + '):');
    datosMes.proveedores.forEach(function(p) {
      lineas.push('  - ' + p.proveedor + ' (' + p.categoria + ')' +
        ' | Vence: ' + (p.fechaVence || 'sin fecha') +
        ' | L ' + (p.monto || '?') +
        ' | Estado: ' + p.estado);
    });
  }

  return lineas.join('\n');
}
