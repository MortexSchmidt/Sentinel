# Sentinel (Sentinel Lua)

Простой Telegram Bot + Web App для продажи лицензий Sentinel Lua (Nixware).

Ключевые файлы:
- `src/index.js` — сервер Express + Telegram webhook + API для покупок
- `public/webapp.html` — Telegram Web App (UI)
- `src/licenses.json` — простое хранилище покупок

Переменные окружения:
- `BOT_TOKEN` — токен бота (например, из вашего сообщения)
- `PORT` — порт (Railway предоставляет автоматически)
- `WEB_APP_URL` — публичный URL на `webapp.html`, например `https://your-app.up.railway.app/webapp.html`. Если задан, бот пришлёт кнопку "Купить лицензию" в /start.

Установка и запуск локально:

```bash
npm install
# экспортируйте BOT_TOKEN в окружение или создайте .env (Railway не использует .env)
export BOT_TOKEN="YOUR_BOT_TOKEN_HERE"  # Замените на ваш токен
npm start
```
## Репозиторий
Для получения последней версии и обновлений, пожалуйста, посетите наш [GitHub репозиторий](https://github.com/MortexSchmidt/Sentinel.git).

Деплой на Railway:
1. Создайте новый проект, подключите репозиторий GitHub.
2. Установите переменную окружения `BOT_TOKEN` в Railway settings.
3. Укажите команду запуска `npm start`.
4. После деплоя получите URL (например, `https://your-app.up.railway.app`) и установите webhook. Пример установки (замените токен и URL):

```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://your-app.up.railway.app/webhook"
```

Если вы хотите, чтобы кнопка открывала встроенный Web App, используйте `WEB_APP_URL` с путём прямо на `webapp.html`, например `https://your-app.up.railway.app/webapp.html`, и установите её в переменных окружения проекта.

Примечание: текущая реализация генерирует лицензионные ключи локально и сохраняет их в `src/licenses.json`.

## Настройка .env

Создайте файл `.env` в корне проекта с содержимым:

```
BOT_TOKEN=ваш_токен_бота
WEB_APP_URL=https://sentinel-production-6e0e.up.railway.app
```

## Установка webhook

После деплоя на Railway, установите webhook командой:

```bash
curl "https://api.telegram.org/botваш_токен_бота/setWebhook?url=https://sentinel-production-6e0e.up.railway.app/webhook"
```
