Приватное тестирование Telegram Web App

Этот файл описывает безопасный рабочий процесс для проверки Web App локально через публичный туннель (ngrok) и тестового бота, без изменения продового бота.

1) Предварительные требования
- Node.js установлен
- ngrok установлен (https://ngrok.com)
- jq (для удобного парсинга) — опционально
- В проекте есть скрипт `scripts/setup_test_bot.sh` (добавлен)

2) Как запустить локально
```bash
cd /path/to/sentinel
npm install
npm start
```
По умолчанию сервер слушает порт, указанный в `src/index.js` (обычно 3000).

3) Подключить ngrok
```bash
ngrok http 3000
```
Скопируйте публичный HTTPS хост, например `abcd-1234.ngrok.io`.

4) Вызвать скрипт для установки webhook и отправки WebApp-кнопки
```bash
# Подставьте ваш токен тестового бота, ngrok host и ваш chat_id
./scripts/setup_test_bot.sh "<TEST_BOT_TOKEN>" "abcd-1234.ngrok.io" "<YOUR_CHAT_ID>"
```
Скрипт установит webhook и отправит сообщение с кнопкой, открывающей `webapp.html`.

5) Тестирование
- Откройте Telegram, нажмите на кнопку у тестового бота — Web App откроется в WebView.
- Отлаживайте: смотрите логи сервера и DevTools (remote debugging для WebView).

6) После тестирования
- Чтобы удалить webhook:
```bash
curl -s -X POST "https://api.telegram.org/bot<TEST_BOT_TOKEN>/deleteWebhook"
```
- Если токен был случайно скомпрометирован, регенерируйте токен у BotFather.

Безопасность
- Никогда не добавляйте токен в публичный репозиторий.
- Храните токены в `.env` и добавьте `.env` в `.gitignore`.
- Для CI используйте защищённые secrets.

