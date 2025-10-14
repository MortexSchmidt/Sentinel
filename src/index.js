const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_APP_URL = process.env.WEB_APP_URL || null; // e.g. https://your-app.up.railway.app/webapp.html

if (!BOT_TOKEN) {
  console.warn('Warning: BOT_TOKEN is not set. Set it in environment variables.');
}
if (!WEB_APP_URL) {
  console.warn('Warning: WEB_APP_URL is not set. Web App button will be disabled in /start.');
}

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

const LICENSES_FILE = path.join(__dirname, 'licenses.json');

function loadLicenses() {
  try {
    const data = fs.readFileSync(LICENSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveLicenses(list) {
  fs.writeFileSync(LICENSES_FILE, JSON.stringify(list, null, 2));
}

function priceForDays(days) {
  const table = {
    1: 116,
    7: 179,
    14: 269,
    30: 358,
    60: 754,
    180: 2478,
    0: 4491 // 0 означает навсегда
  };
  return table[days] || null;
}

function generateKey() {
  return 'SENT-' + nanoid(10).toUpperCase();
}

app.get('/health', (req, res) => res.json({ ok: true }));

// Telegram webhook receiver
app.post('/webhook', async (req, res) => {
  const upd = req.body;
  // handle messages with /start
  if (upd.message && upd.message.text) {
    const chatId = upd.message.chat.id;
    const text = upd.message.text;
    if (text.startsWith('/start')) {
      const welcome = 'Добро пожаловать в Sentinel Lua. Нажмите кнопку ниже, чтобы открыть магазин.';
      // if WEB_APP_URL is set, send keyboard with Web App button
      if (WEB_APP_URL) {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const body = {
          chat_id: chatId,
          text: welcome,
          reply_markup: {
            inline_keyboard: [[
              { text: 'Купить лицензию', web_app: { url: WEB_APP_URL } }
            ]]
          }
        };
        try {
          await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        } catch (e) {
          console.error('Failed to send start message with Web App button', e);
          await sendMessage(chatId, welcome);
        }
      } else {
        await sendMessage(chatId, welcome);
      }
    }
  }
  res.sendStatus(200);
});

// purchase endpoint called from Web App
app.post('/purchase', (req, res) => {
  const { chat_id, days } = req.body;
  if (!chat_id || typeof days === 'undefined') {
    return res.status(400).json({ error: 'chat_id и days обязательны' });
  }
  const price = priceForDays(days);
  if (price === null) return res.status(400).json({ error: 'Неправильный период' });

  const key = generateKey();
  const now = Date.now();
  let expires = null;
  if (days > 0) {
    expires = now + days * 24 * 60 * 60 * 1000;
  }

  const licenses = loadLicenses();
  const item = { id: nanoid(), chat_id, days, price, key, created: now, expires };
  licenses.push(item);
  saveLicenses(licenses);

  // send license to user via bot
  const text = `Спасибо за покупку!\nЛицензия: ${key}\nПериод: ${days === 0 ? 'Навсегда' : days + ' дней'}\nЦена: ${price} руб.`;
  sendMessage(chat_id, text).catch(e => console.error('sendMessage failed', e));

  res.json({ ok: true, license: item });
});

async function sendMessage(chatId, text) {
  if (!BOT_TOKEN) throw new Error('BOT_TOKEN not set');
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' })
  });
}

app.get('/licenses', (req, res) => {
  res.json(loadLicenses());
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
