/**
 * Módulo para envío de notificaciones a Telegram
 * Reutilizable para futuras alertas y notificaciones
 */

/**
 * Envía un mensaje a Telegram usando la API oficial
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<Object>} Resultado de la API de Telegram
 */
export async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID son requeridos');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  console.log(`🔗 URL: ${url.replace(botToken, '***')}`);
  console.log(`💬 Chat ID: ${chatId}`);
  console.log(`📏 Longitud del mensaje: ${message.length} caracteres`);

  // Payload sin parse_mode para evitar problemas con caracteres especiales
  const payload = {
    chat_id: chatId,
    text: message,
  };

  console.log(`📋 Payload preparado (chat_id: ${chatId}, message length: ${message.length})`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const statusText = response.statusText || 'Unknown';
    console.log(`📡 Status HTTP: ${response.status} ${statusText}`);

    // Leer el cuerpo de la respuesta
    let responseBody;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      const textBody = await response.text();
      console.log(`📄 Response body (text): ${textBody.substring(0, 500)}`);
      try {
        responseBody = JSON.parse(textBody);
      } catch (e) {
        throw new Error(`Error al parsear respuesta de Telegram: ${textBody}`);
      }
    }

    console.log(`📦 Response data:`, JSON.stringify(responseBody).substring(0, 200));

    if (!response.ok) {
      console.error(`❌ Error HTTP ${response.status}:`, responseBody);
      const errorMsg = responseBody.description || responseBody.error_code || 'Unknown error';
      throw new Error(`Error al enviar mensaje a Telegram (HTTP ${response.status}): ${errorMsg}`);
    }
    
    if (!responseBody.ok) {
      console.error(`❌ Error en respuesta de Telegram:`, responseBody);
      const errorMsg = responseBody.description || 'Unknown error';
      const errorCode = responseBody.error_code || 'N/A';
      throw new Error(`Error en respuesta de Telegram: ${errorMsg} (error_code: ${errorCode})`);
    }

    const messageId = responseBody.result?.message_id || 'N/A';
    console.log(`✅ Mensaje enviado correctamente. Message ID: ${messageId}`);
    return responseBody;
  } catch (error) {
    // Si es un error de red o fetch
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      const detailedError = `Error de red al conectar con Telegram: ${error.message}`;
      console.error(`❌ ${detailedError}`);
      throw new Error(detailedError);
    }
    // Re-lanzar otros errores con más contexto
    console.error(`❌ Error capturado:`, error);
    throw error;
  }
}
