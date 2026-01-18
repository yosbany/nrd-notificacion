# NRD Notificación

Sistema de notificaciones ejecutado en GitHub Actions que procesa notificaciones pendientes desde Firebase Realtime Database y las envía por FCM (Firebase Cloud Messaging) a múltiples dispositivos.

## Características

- ✅ Ejecución automática cada 5 minutos via GitHub Actions (programado con cron)
- ✅ Ejecución manual mediante `workflow_dispatch` (mismo workflow unificado)
- ✅ Lee notificaciones pendientes desde Firebase Realtime Database
- ✅ Obtiene tokens FCM activos desde Firebase Realtime Database
- ✅ Envía notificaciones por FCM (Firebase Cloud Messaging) API V1 a múltiples dispositivos
- ✅ Marca notificaciones como enviadas automáticamente
- ✅ Manejo de errores con registro en Firebase
- ✅ Logs claros de inicio y fin de ejecución

## Requisitos

- Node.js >= 18.0.0
- Variables de entorno (configuradas como secrets en GitHub):
  - `FCM_SERVICE_ACCOUNT_JSON`: JSON del Service Account de Firebase (usado para FCM y acceso a Realtime Database)
  - `FCM_PROJECT_ID`: ID del proyecto de Firebase

## Configuración en GitHub

1. Ve a **Settings** > **Secrets and variables** > **Actions** en tu repositorio
2. Agrega los siguientes secrets:
   - `FCM_SERVICE_ACCOUNT_JSON`: Contenido completo del JSON del Service Account de Firebase (debe tener permisos para FCM y Realtime Database)
   - `FCM_PROJECT_ID`: ID del proyecto de Firebase

## Estructura de Datos en Firebase

### Notificaciones (`/notifications`)

Las notificaciones se almacenan en Firebase Realtime Database con la siguiente estructura:

```javascript
{
  "notifications": {
    "notification-id": {
      "title": "Título de la notificación",
      "message": "Mensaje de la notificación",
      "sent": false,              // Si ya fue enviada o no
      "sentAt": null,             // Timestamp cuando fue enviada
      "createdAt": 1234567890,    // Timestamp de creación
      "error": null               // Mensaje de error si falló el envío
    }
  }
}
```

### Tokens FCM (`/fcmTokens`)

Los tokens de dispositivos FCM se almacenan en Firebase Realtime Database:

```javascript
{
  "fcmTokens": {
    "token-id": {
      "token": "token-fcm-del-dispositivo",
      "active": true,             // Si el token está activo
      "deviceName": "Dispositivo 1",
      "platform": "android",      // 'android', 'ios', 'web'
      "createdAt": 1234567890,
      "updatedAt": 1234567890
    }
  }
}
```

Los tokens se gestionan desde **nrd-portal** usando el servicio `nrd.fcmTokens` de `nrd-data-access`.

## Uso Local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
export FCM_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
export FCM_PROJECT_ID="tu-project-id"

# Ejecutar manualmente
npm run process
```

## Estructura del Proyecto

```
nrd-notificacion/
├── process.js                    # Punto de entrada principal (lógica consolidada)
├── .github/
│   └── workflows/
│       └── process-notifications.yml  # Workflow unificado (automático cada 5 min + manual)
├── package.json
└── README.md
```

## Cómo funciona

1. **Otros sistemas/módulos** crean notificaciones en Firebase Realtime Database en `/notifications` con `sent: false`
2. **El workflow** se ejecuta cada 5 minutos automáticamente (o manualmente mediante `workflow_dispatch`) y:
   - Obtiene todas las notificaciones pendientes (`sent: false`)
   - Obtiene todos los tokens FCM activos desde `/fcmTokens`
3. **Para cada notificación pendiente:**
   - Se genera un token OAuth2 usando el Service Account JSON
   - Se envía la notificación por FCM API V1 a cada token activo
   - Se marca como enviada (`sent: true`) o se registra el error si falla

## Crear Notificaciones

### Desde nrd-portal

1. Inicia sesión en **nrd-portal**
2. Haz clic en "Enviar Notificación" en el header
3. Completa el título y mensaje
4. La notificación se creará en Firebase y se enviará automáticamente en los próximos minutos

### Desde código (otro módulo o sistema)

```javascript
// Usando nrd-data-access (en el cliente)
const notification = {
  title: "Nueva orden",
  message: "Se ha creado una nueva orden #123",
  sent: false,
  createdAt: Date.now()
};
const notificationId = await nrd.notifications.create(notification);

// O usando Firebase Admin SDK (en servidor)
const db = admin.database();
await db.ref('notifications').push({
  title: "Nueva orden",
  message: "Se ha creado una nueva orden #123",
  sent: false,
  createdAt: Date.now()
});
```

## Gestión desde nrd-portal

### Tokens FCM

Los tokens FCM se gestionan desde **nrd-portal**:

1. Inicia sesión en nrd-portal
2. Haz clic en "Tokens FCM" en el header
3. Agrega, edita o elimina tokens de dispositivos
4. Solo los tokens con `active: true` recibirán notificaciones

### Enviar Notificaciones

Las notificaciones también pueden crearse directamente desde **nrd-portal**:

1. Inicia sesión en nrd-portal
2. Haz clic en "Enviar Notificación" en el header
3. Completa el formulario con título y mensaje
4. La notificación se procesará automáticamente por el sistema

## Autenticación

El sistema usa **Firebase Admin SDK** con **Service Account** para:
- Autenticación en Firebase Realtime Database
- Generación de tokens OAuth2 para FCM API V1
- Envío de notificaciones FCM

Esto permite acceso completo desde GitHub Actions sin necesidad de autenticación de usuario.

## Notas

- El proyecto está diseñado para ejecutarse exclusivamente en GitHub Actions
- Las notificaciones deben crearse en Firebase Realtime Database en la ruta `/notifications`
- El sistema procesa todas las notificaciones con `sent: false` en cada ejecución
- Los tokens FCM se almacenan y gestionan en Firebase, permitiendo múltiples dispositivos
- El sistema envía a todos los tokens activos en paralelo

## Limitaciones de GitHub Actions Schedule

⚠️ **IMPORTANTE**: GitHub Actions usa scheduling de "mejor esfuerzo" (best effort). Esto significa:

- Los workflows programados **NO garantizan** ejecución puntual
- Pueden tener retrasos de **5-30 minutos** o más durante alta carga
- Los intervalos pueden ser **irregulares** (ej: programado cada 5 min, pero ejecuta cada 17, 31, 45 min)
- Los cron se ejecutan en **UTC**, no en hora local
- En repos públicos, los workflows se deshabilitan después de 60 días sin actividad

**Ejemplo de comportamiento real observado:**
- Programado: cada 5 minutos
- Ejecución real observada: 31 min, 17 min, 8 min, 45 min entre ejecuciones

Si necesitas precisión exacta (cada 5 minutos sin retrasos), considera:
- Usar un servicio externo (cron en servidor, AWS EventBridge, etc.) que llame a `workflow_dispatch` vía API
- Usar un repositorio privado (mejor comportamiento de schedules)
- Usar un runner self-hosted (mejora la ejecución pero no el trigger)
