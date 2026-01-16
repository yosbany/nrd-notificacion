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
  
  console.log('========================================');
  console.log('🚀 Iniciando ejecución de monitoreo...');
  console.log('========================================');
  console.log(`📅 Timestamp Local: ${getReadableTimestamp()}`);
  console.log(`📅 Timestamp UTC: ${new Date().toISOString()}`);
  
  // Información del workflow de GitHub Actions
  if (process.env.GITHUB_RUN_ID) {
    console.log(`🔢 Run ID: ${process.env.GITHUB_RUN_ID}`);
    console.log(`🔢 Run Number: ${process.env.GITHUB_RUN_NUMBER}`);
    console.log(`📋 Workflow: ${process.env.GITHUB_WORKFLOW}`);
  }
  
  // Verificar variables de entorno
  console.log('\n🔍 Verificando variables de entorno...');
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!botToken) {
    console.error('❌ TELEGRAM_BOT_TOKEN no está configurado');
    process.exit(1);
  } else {
    console.log(`✅ TELEGRAM_BOT_TOKEN configurado (${botToken.substring(0, 10)}...)`);
  }
  
  if (!chatId) {
    console.error('❌ TELEGRAM_CHAT_ID no está configurado');
    process.exit(1);
  } else {
    console.log(`✅ TELEGRAM_CHAT_ID configurado: ${chatId}`);
  }

  try {
    const timestamp = getReadableTimestamp();
    const runInfo = process.env.GITHUB_RUN_ID 
      ? `\n🔢 Run #${process.env.GITHUB_RUN_NUMBER} (ID: ${process.env.GITHUB_RUN_ID})`
      : '';
    
    const eventType = process.env.GITHUB_EVENT_NAME || 'unknown';
    const eventInfo = eventType === 'schedule' ? ' (SCHEDULE/CRON)' : eventType === 'workflow_dispatch' ? ' (MANUAL)' : eventType === 'push' ? ' (PUSH)' : '';
    
    const message = `🟢 NRD MONITOR ACTIVO - ping desde GitHub Actions${runInfo}\n\n📅 ${timestamp}\n\n⚡ Ejecutado por: ${eventType.toUpperCase()}${eventInfo}`;
    
    console.log('\n📤 Enviando mensaje a Telegram...');
    console.log(`📝 Evento: ${eventType}`);
    console.log(`📝 Mensaje: ${message.replace(/\n/g, ' ')}`);
    
    const result = await sendTelegramMessage(message);
    
    const executionTime = Date.now() - startTime;
    console.log('\n✅ Mensaje enviado exitosamente');
    console.log(`📬 Message ID: ${result.result?.message_id || 'N/A'}`);
    console.log(`⏱️  Tiempo de ejecución: ${executionTime}ms`);
    console.log('✨ Ejecución completada correctamente');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('\n========================================');
    console.error('❌ Error durante la ejecución:');
    console.error('========================================');
    console.error(`Mensaje: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    console.error(`⏱️  Tiempo hasta el error: ${executionTime}ms`);
    console.error('💥 Ejecución fallida');
    console.error('========================================\n');

    process.exit(1);
  }
}

// Ejecutar
main();
