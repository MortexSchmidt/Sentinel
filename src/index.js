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
const USERS_FILE = path.join(__dirname, 'users.json');
const AUTH_FILE = path.join(__dirname, 'authcodes.json');

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

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveUsers(list) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2));
}

function loadAuthCodes() {
  try { return JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8')); } catch(e) { return {}; }
}

function saveAuthCodes(obj) {
  fs.writeFileSync(AUTH_FILE, JSON.stringify(obj, null, 2));
}

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
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

app.get('/', (req, res) => { res.sendFile(path.join(__dirname, '../public/webapp.html')); });

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
    // handle /auth <CODE> command from user to link web session
    if (text.startsWith('/auth')) {
      const parts = text.split(' ');
      if (parts.length >= 2) {
        const code = parts[1].trim().toUpperCase();
        const auth = loadAuthCodes();
        const entry = auth[code];
        if (entry && !entry.linked) {
          // link user: save to users.json
          const users = loadUsers();
          const from = upd.message.from || {};
          let user = users.find(u => u.chat_id == chatId);
          if (!user) {
            user = { chat_id: chatId, username: from.username || null, first_name: from.first_name || null, last_name: from.last_name || null, avatar: null, created: Date.now() };
            users.push(user);
          } else {
            user.username = from.username || user.username;
            user.first_name = from.first_name || user.first_name;
            user.last_name = from.last_name || user.last_name;
          }
          // try to fetch user's profile photo and save locally
          try {
            if (BOT_TOKEN) {
              const photosUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUserProfilePhotos?user_id=${chatId}&limit=1`;
              const pr = await fetch(photosUrl);
              const pj = await pr.json();
              if (pj.ok && pj.result && pj.result.total_count > 0 && pj.result.photos && pj.result.photos.length > 0) {
                const sizes = pj.result.photos[0];
                // pick the largest size (last)
                const best = sizes[sizes.length - 1];
                if (best && best.file_id) {
                  const fileMeta = await getFile(best.file_id);
                  if (fileMeta && fileMeta.file_path) {
                    const dest = path.join(__dirname, '../public/avatars', String(chatId) + path.extname(fileMeta.file_path));
                    try {
                      await downloadFilePath(fileMeta.file_path, dest);
                      user.avatar = '/avatars/' + path.basename(dest);
                    } catch(e) {
                      console.error('Failed to download avatar', e);
                    }
                  }
                }
              }
            }
          } catch(e) {
            console.error('avatar fetch error', e);
          }
          saveUsers(users);
          // mark code as linked
          auth[code].linked = true;
          auth[code].chat_id = chatId;
          saveAuthCodes(auth);
          // notify user
          try { await sendMessage(chatId, 'Аутентификация выполнена. Вы успешно связали Web App.'); } catch(e){}
        } else {
          try { await sendMessage(chatId, 'Неверный или уже использованный код.'); } catch(e){}
        }
      } else {
        try { await sendMessage(chatId, 'Использование: /auth CODE'); } catch(e){}
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

async function getFile(fileId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!j.ok) throw new Error('getFile failed');
  return j.result;
}

async function downloadFilePath(filePath, dest) {
  // filePath is like: "file/bot<token>/<path>" or just path; Telegram provides file_path
  const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('download failed');
  const buffer = await res.buffer();
  fs.writeFileSync(dest, buffer);
}

app.get('/licenses', (req, res) => {
  res.json(loadLicenses());
});

// simple auth endpoint: store basic profile by chat_id
app.post('/auth', (req, res) => {
  const { chat_id, username, first_name, last_name, avatar } = req.body;
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
  const users = loadUsers();
  let user = users.find(u => u.chat_id === chat_id);
  if (!user) {
    user = { chat_id, username: username || null, first_name: first_name || null, last_name: last_name || null, avatar: avatar || null, created: Date.now() };
    users.push(user);
  } else {
    user.username = username || user.username;
    user.first_name = first_name || user.first_name;
    user.last_name = last_name || user.last_name;
    user.avatar = avatar || user.avatar;
  }
  saveUsers(users);
  res.json({ ok: true, user });
});

// generate a short auth code and return it
app.post('/auth/generate', (req, res) => {
  const auth = loadAuthCodes();
  const code = generateCode();
  auth[code] = { created: Date.now(), linked: false };
  saveAuthCodes(auth);
  res.json({ ok: true, code });
});

// status of auth code
app.get('/auth/status', (req, res) => {
  const code = (req.query.code || '').toString().toUpperCase();
  if (!code) return res.status(400).json({ error: 'code required' });
  const auth = loadAuthCodes();
  const entry = auth[code];
  if (!entry) return res.json({ ok: false, linked: false });
  if (!entry.linked) return res.json({ ok: true, linked: false });
  // linked -> return user
  const users = loadUsers();
  const user = users.find(u => u.chat_id && u.chat_id.toString() === entry.chat_id.toString());
  const licenses = loadLicenses().filter(l => l.chat_id && l.chat_id.toString() === entry.chat_id.toString());
  let active = null; const now = Date.now();
  for (let i = licenses.length - 1; i >= 0; i--) { const l = licenses[i]; if (l.expires === null || l.expires > now) { active = l; break; } }
  let daysRemaining = 0; if (active && active.expires) daysRemaining = Math.ceil((active.expires - now) / (24*60*60*1000));
  res.json({ ok: true, linked: true, user, active, daysRemaining });
});

// get profile and license status for a given chat_id
app.get('/me', (req, res) => {
  const chat_id = req.query.chat_id;
  if (!chat_id) return res.status(400).json({ error: 'chat_id required' });
  const users = loadUsers();
  const user = users.find(u => u.chat_id.toString() === chat_id.toString()) || null;
  const licenses = loadLicenses().filter(l => l.chat_id && l.chat_id.toString() === chat_id.toString());
  // find active license (expires null => forever or expires in future)
  const now = Date.now();
  let active = null;
  for (let i = licenses.length - 1; i >= 0; i--) {
    const l = licenses[i];
    if (l.expires === null || l.expires > now) { active = l; break; }
  }
  let daysRemaining = 0;
  if (active && active.expires) daysRemaining = Math.ceil((active.expires - now) / (24 * 60 * 60 * 1000));
  res.json({ ok: true, user, active, daysRemaining });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
