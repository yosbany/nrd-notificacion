/**
 * Punto de entrada para procesar notificaciones pendientes
 * Se ejecuta desde GitHub Actions cada 5 minutos o a demanda
 * 
 * Procesa notificaciones desde Firebase Realtime Database y las envía por FCM
 * Usa Firebase Admin SDK con Service Account para autenticación
 */

import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';

// Inicializar Firebase Admin SDK (solo una vez)
let adminInitialized = false;

function initializeAdmin() {
  if (adminInitialized) {
    return;
  }

  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON no está configurado');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Inicializar Admin SDK con el Service Account
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://nrd-db-default-rtdb.firebaseio.com"
    });

    adminInitialized = true;
    console.log('Firebase Admin SDK inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando Firebase Admin SDK:', error.message);
    throw error;
  }
}

/**
 * Obtiene un token OAuth2 para FCM usando Service Account
 */
async function getFCMAccessToken() {
  const serviceAccountJson = process.env.FCM_SERVICE_ACCOUNT_JSON;
  
  if (!serviceAccountJson) {
    throw new Error('FCM_SERVICE_ACCOUNT_JSON no está configurado');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    // Crear JWT
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600, // Token válido por 1 hora
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    // Firmar JWT con la clave privada
    const jwtToken = jwt.sign(payload, serviceAccount.private_key, { algorithm: 'RS256' });

    // Intercambiar JWT por access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwtToken
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error obteniendo access token: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error generando ACCESS_TOKEN:', error.message);
    throw error;
  }
}

/**
 * Obtiene todos los tokens FCM activos desde Firebase
 */
async function getFCMTokens() {
  initializeAdmin();
  
  const db = admin.database();
  const tokensRef = db.ref('fcmTokens');

  const snapshot = await tokensRef.once('value');
  
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const tokens = Object.keys(data)
    .map(key => ({
      id: key,
      ...data[key]
    }))
    .filter(t => t.token && (t.active !== false)); // Solo tokens activos (active !== false)

  return tokens;
}

/**
 * Envía notificación FCM usando API V1 a un token específico
 * Genera el ACCESS_TOKEN automáticamente usando Service Account
 */
async function sendFCMNotificationToToken(title, message, deviceToken) {
  const fcmProjectId = process.env.FCM_PROJECT_ID;

  if (!fcmProjectId || !deviceToken) {
    return null;
  }

  // Generar access token automáticamente
  let accessToken;
  try {
    accessToken = await getFCMAccessToken();
  } catch (error) {
    console.error('Error obteniendo ACCESS_TOKEN:', error.message);
    throw error;
  }

  try {
    // Enviar notificación FCM
    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${fcmProjectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: {
            token: deviceToken,
            notification: {
              title: title,
              body: message
            },
            data: {
              title: title,
              message: message
            }
          }
        })
      }
    );

    if (!fcmResponse.ok) {
      const errorText = await fcmResponse.text();
      throw new Error(`FCM error: ${fcmResponse.status} - ${errorText}`);
    }

    const result = await fcmResponse.json();
    return result;
  } catch (error) {
    console.error('Error enviando notificación FCM:', error.message);
    throw error;
  }
}

/**
 * Obtiene notificaciones pendientes desde Firebase usando Admin SDK
 */
async function getPendingNotifications() {
  initializeAdmin();
  
  const db = admin.database();
  const notificationsRef = db.ref('notifications');

  const snapshot = await notificationsRef.once('value');
  
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  const notifications = Object.keys(data)
    .map(key => ({
      id: key,
      ...data[key]
    }))
    .filter(n => !n.sent); // Solo notificaciones pendientes

  return notifications;
}

/**
 * Marca una notificación como enviada usando Admin SDK
 */
async function markNotificationAsSent(notificationId, error = null) {
  initializeAdmin();
  
  const db = admin.database();
  const notificationRef = db.ref(`notifications/${notificationId}`);

  const updates = {
    sent: true,
    sentAt: Date.now()
  };

  if (error) {
    updates.error = error;
  }

  await notificationRef.update(updates);
}

/**
 * Procesa y envía todas las notificaciones pendientes
 */
async function processPendingNotifications() {
  console.log('========================================');
  console.log('Iniciando procesamiento de notificaciones...');
  console.log('========================================');

  try {
    // Obtener notificaciones pendientes
    const pendingNotifications = await getPendingNotifications();
    
    if (pendingNotifications.length === 0) {
      console.log('No hay notificaciones pendientes');
      return {
        total: 0,
        sent: 0,
        failed: 0
      };
    }

    console.log(`Encontradas ${pendingNotifications.length} notificacion(es) pendiente(s)`);

    // Obtener tokens FCM desde Firebase
    const fcmTokens = await getFCMTokens();
    
    if (fcmTokens.length === 0) {
      console.log('No hay tokens FCM registrados en Firebase');
      // Marcar todas como fallidas
      for (const notification of pendingNotifications) {
        await markNotificationAsSent(notification.id, 'No hay tokens FCM registrados');
      }
      return {
        total: pendingNotifications.length,
        sent: 0,
        failed: pendingNotifications.length
      };
    }

    console.log(`Encontrados ${fcmTokens.length} token(s) FCM activo(s)`);

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of pendingNotifications) {
      console.log(`\nProcesando notificacion ID: ${notification.id}`);
      console.log(`   Titulo: ${notification.title}`);
      console.log(`   Mensaje: ${notification.message}`);

      // Enviar a todos los dispositivos registrados
      if (process.env.FCM_PROJECT_ID) {
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const tokenData of fcmTokens) {
          try {
            await sendFCMNotificationToToken(notification.title, notification.message, tokenData.token);
            successCount++;
            console.log(`   Enviado a dispositivo: ${tokenData.id || 'unknown'}`);
          } catch (error) {
            errorCount++;
            errors.push(`${tokenData.id || 'unknown'}: ${error.message}`);
            console.error(`   Error enviando a ${tokenData.id || 'unknown'}: ${error.message}`);
          }
        }

        // Marcar notificación según resultado
        if (successCount > 0) {
          await markNotificationAsSent(notification.id);
          sentCount++;
          console.log(`   Notificacion enviada a ${successCount} dispositivo(s) y marcada como enviada`);
          if (errorCount > 0) {
            console.log(`   Advertencia: ${errorCount} envio(s) fallaron`);
          }
        } else {
          // Todos fallaron
          await markNotificationAsSent(notification.id, `FCM: Todos los envios fallaron - ${errors.join('; ')}`);
          failedCount++;
          console.log(`   Notificacion marcada como fallida (todos los envios fallaron)`);
        }
      } else {
        console.log('   FCM_PROJECT_ID no configurado - saltando');
        await markNotificationAsSent(notification.id, 'FCM_PROJECT_ID no configurado');
        failedCount++;
      }
    }

    console.log('\n========================================');
    console.log('Resumen:');
    console.log(`   Total: ${pendingNotifications.length}`);
    console.log(`   Enviadas: ${sentCount}`);
    console.log(`   Fallidas: ${failedCount}`);
    console.log('========================================\n');

    return {
      total: pendingNotifications.length,
      sent: sentCount,
      failed: failedCount
    };

  } catch (error) {
    console.error('\n========================================');
    console.error('Error procesando notificaciones:');
    console.error('========================================');
    console.error(`Mensaje: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    console.error('========================================\n');
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  const startTime = Date.now();
  
  console.log('========================================');
  console.log('Iniciando procesamiento de notificaciones...');
  console.log('========================================');
  console.log(`Timestamp Local: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}`);
  console.log(`Timestamp UTC: ${new Date().toISOString()}`);
  
  // Información del workflow de GitHub Actions
  if (process.env.GITHUB_RUN_ID) {
    console.log(`Run ID: ${process.env.GITHUB_RUN_ID}`);
    console.log(`Run Number: ${process.env.GITHUB_RUN_NUMBER}`);
    console.log(`Workflow: ${process.env.GITHUB_WORKFLOW}`);
    console.log(`Event: ${process.env.GITHUB_EVENT_NAME || 'unknown'}`);
  }

  try {
    const result = await processPendingNotifications();
    
    const executionTime = Date.now() - startTime;
    console.log(`Tiempo de ejecucion: ${executionTime}ms`);
    console.log('Procesamiento completado correctamente');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('\n========================================');
    console.error('Error durante la ejecucion:');
    console.error('========================================');
    console.error(`Mensaje: ${error.message}`);
    if (error.stack) {
      console.error(`Stack: ${error.stack}`);
    }
    console.error(`Tiempo hasta el error: ${executionTime}ms`);
    console.error('Ejecucion fallida');
    console.error('========================================\n');

    process.exit(1);
  }
}

// Ejecutar
main();
