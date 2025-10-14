#!/usr/bin/env bash
# Usage:
#   ./scripts/setup_test_bot.sh <BOT_TOKEN> <NGROK_URL> <YOUR_CHAT_ID>
# Example:
#   ./scripts/setup_test_bot.sh "1234:ABC" "abcd-1234.ngrok.io" "123456789"

set -euo pipefail

TOKEN="$1"
NGROK_HOST="$2"
CHAT_ID="$3"

WEBHOOK_URL="https://${NGROK_HOST}/webhook"
WEBAPP_URL="https://${NGROK_HOST}/webapp.html"

echo "Setting webhook to: ${WEBHOOK_URL}"
curl -s -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook" -d "url=${WEBHOOK_URL}" | jq .

echo "Sending test WebApp button to chat ${CHAT_ID} (url: ${WEBAPP_URL})"
read -r -d '' PAYLOAD <<EOF
{
  "chat_id": "${CHAT_ID}",
  "text": "Открыть тестовый WebApp",
  "reply_markup": {
    "inline_keyboard": [[{"text":"Открыть магазин","web_app": {"url": "${WEBAPP_URL}"}}]]
  }
}
EOF

echo "$PAYLOAD" | curl -s -X POST "https://api.telegram.org/bot${TOKEN}/sendMessage" -H "Content-Type: application/json" -d @- | jq .

echo "Done. Open Telegram and click the button to test the Web App."
