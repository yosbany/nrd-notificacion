/**
 * Punto de entrada principal del sistema de monitoreo
 * Ejecuta el ping de verificación y envía notificación a Telegram
 */

import { sendTelegramMessage } from './notify.js';

/**
 * Obtiene un timestamp legible en formato local
 * @returns {string}
 */
function getReadableTimestamp() {
  const now = new Date();
  return now.toLocaleString('es-CL', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Función principal
 */
async function main() {
  const startTime = Date.now();
  console.log('🚀 Iniciando ejecución de monitoreo...');
  console.log(`📅 Timestamp: ${getReadableTimestamp()}`);

  try {
    const message = `🟢 NRD MONITOR ACTIVO - ping desde GitHub Actions\n\n📅 ${getReadableTimestamp()}`;
    
    console.log('📤 Enviando mensaje a Telegram...');
    await sendTelegramMessage(message);
    
    const executionTime = Date.now() - startTime;
    console.log(`✅ Mensaje enviado exitosamente`);
    console.log(`⏱️  Tiempo de ejecución: ${executionTime}ms`);
    console.log('✨ Ejecución completada correctamente');

    process.exit(0);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Error durante la ejecución:');
    console.error(error.message);
    console.error(`⏱️  Tiempo hasta el error: ${executionTime}ms`);
    console.error('💥 Ejecución fallida');

    process.exit(1);
  }
}

// Ejecutar
main();
