/**
 * Módulo para envío de notificaciones a Telegram
 * Reutilizable para futuras alertas y notificaciones
 */

/**
 * Envía un mensaje a Telegram usando la API oficial
 * @param {string} message - Mensaje a enviar
 * @returns {Promise<void>}
 */
export async function sendTelegramMessage(message) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error('TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID son requeridos');
  }

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

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

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Error al enviar mensaje a Telegram: ${response.status} - ${errorData}`);
  }

  const result = await response.json();
  
  if (!result.ok) {
    throw new Error(`Error en respuesta de Telegram: ${result.description || 'Unknown error'}`);
  }

  return result;
}
