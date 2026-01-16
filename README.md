# NRD Monitor

Sistema de monitoreo ejecutado en GitHub Actions que envía pings periódicos a Telegram para validar frecuencia, estabilidad y retrasos.

## Características

- ✅ Ejecución automática cada 1 minuto via GitHub Actions
- ✅ Ejecución manual mediante `workflow_dispatch`
- ✅ Notificaciones a Telegram con timestamp legible
- ✅ Logs claros de inicio y fin de ejecución
- ✅ Código mínimo, limpio y extensible

## Requisitos

- Node.js >= 18.0.0
- Variables de entorno:
  - `TELEGRAM_BOT_TOKEN`: Token del bot de Telegram
  - `TELEGRAM_CHAT_ID`: ID del chat donde se enviarán los mensajes

## Configuración en GitHub

1. Ve a **Settings** > **Secrets and variables** > **Actions** en tu repositorio
2. Agrega los siguientes secrets:
   - `TELEGRAM_BOT_TOKEN`: Token de tu bot de Telegram (obtener de @BotFather)
   - `TELEGRAM_CHAT_ID`: ID del chat donde recibir las notificaciones

## Uso Local

```bash
# Instalar dependencias (no hay dependencias externas, pero se puede usar para futuras)
npm install

# Ejecutar manualmente (requiere variables de entorno)
export TELEGRAM_BOT_TOKEN="tu-token"
export TELEGRAM_CHAT_ID="tu-chat-id"
node monitoring/index.js
```

## Estructura del Proyecto

```
nrd-monitor/
├── monitoring/
│   ├── index.js      # Punto de entrada principal
│   └── notify.js     # Módulo reutilizable para notificaciones Telegram
├── .github/
│   └── workflows/
│       └── monitoring.yml  # Workflow de GitHub Actions
├── package.json
└── README.md
```

## Formato de Mensaje

Los mensajes enviados a Telegram tienen el formato:

```
🟢 NRD MONITOR ACTIVO - ping desde GitHub Actions

📅 DD/MM/YYYY, HH:MM:SS
```

## Notas

- El proyecto está diseñado para ejecutarse exclusivamente en GitHub Actions
- No incluye reglas de negocio por ahora, solo validación de infraestructura
- El código está preparado para extensión futura con nuevas funcionalidades
