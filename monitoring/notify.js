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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    console.log(`📡 Status HTTP: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Error en respuesta HTTP: ${errorData}`);
      throw new Error(`Error al enviar mensaje a Telegram: ${response.status} - ${errorData}`);
    }

    const result = await response.json();
    
    if (!result.ok) {
      console.error(`❌ Error en respuesta de Telegram:`, result);
      throw new Error(`Error en respuesta de Telegram: ${result.description || 'Unknown error'} (error_code: ${result.error_code || 'N/A'})`);
    }

    console.log(`✅ Mensaje enviado correctamente. Message ID: ${result.result?.message_id}`);
    return result;
  } catch (error) {
    // Si es un error de red o fetch
    if (error.name === 'TypeError' || error.message.includes('fetch')) {
      throw new Error(`Error de red al conectar con Telegram: ${error.message}`);
    }
    // Re-lanzar otros errores
    throw error;
  }
}
