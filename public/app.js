const plans = [
  { days: 1, label: '1 День', price: 116 },
  { days: 7, label: '7 Дней', price: 179 },
  { days: 14, label: '14 Дней', price: 269 },
  { days: 30, label: '30 Дней', price: 358 },
  { days: 60, label: '60 Дней', price: 754 },
  { days: 180, label: '180 Дней', price: 2478 },
  { days: 0, label: 'Навсегда', price: 4491 }
];

const plansContainer = document.getElementById('plans');
const buyBtn = document.getElementById('buyBtn');
const authBtn = document.getElementById('authBtn');
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const nameEl = document.getElementById('name');
const usernameEl = document.getElementById('username');
const avatarEl = document.getElementById('avatar');
const planStatusEl = document.getElementById('planStatus');
// WebAudio short sound generator (click and success chirp)
let audioCtx = null;
function ensureAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
function playClick() {
  try {
    ensureAudio();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = 800;
    g.gain.value = 0.0001;
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.linearRampToValueAtTime(0.12, now + 0.001);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.start(now); o.stop(now + 0.14);
  } catch(e){}
}
function playSuccess() {
  try {
    ensureAudio();
    const now = audioCtx.currentTime;
    const o1 = audioCtx.createOscillator();
    const o2 = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o1.type = 'triangle'; o2.type = 'sine';
    o1.frequency.value = 880; o2.frequency.value = 1320;
    g.gain.value = 0.0001;
    o1.connect(g); o2.connect(g); g.connect(audioCtx.destination);
    g.gain.linearRampToValueAtTime(0.18, now + 0.002);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    o1.start(now); o2.start(now + 0.03);
    o1.stop(now + 0.28); o2.stop(now + 0.31);
  } catch(e){}
}

let selected = null;
let currentUser = null; // { chat_id, username, first_name }

function render() {
  plansContainer.innerHTML = '';
  plans.forEach(p => {
    const el = document.createElement('div');
    el.className = 'plan' + (selected && selected.days === p.days ? ' selected' : '');
    el.innerHTML = `<h3>${p.label}</h3><p>${p.price} рублей — Лицензия</p>`;
    el.onclick = () => { selected = p; render(); buyBtn.disabled = false; };
    plansContainer.appendChild(el);
  });
}

  authBtn && authBtn.addEventListener('click', async () => {
  // fake auth using Telegram WebApp init data if available
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    const u = window.Telegram.WebApp.initDataUnsafe.user;
    const chatId = u.id;
    currentUser = { chat_id: chatId, username: u.username || null, first_name: u.first_name || null, avatar: null };
    // post to /auth
    try { await fetch('/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentUser) }); } catch(e){/*ignore*/}
    showMain();
  playClick();
    return;
  }
  // fallback demo auth: prompt for a nickname and generate a fake chat id
  const nick = prompt('Введите никнейм для демо:', 'demo_user');
  if (!nick) return;
  currentUser = { chat_id: 'demo-' + Date.now(), username: nick, first_name: nick, avatar: null };
  try { await fetch('/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(currentUser) }); } catch(e){/*ignore*/}
  showMain();
  playClick();
});

buyBtn.addEventListener('click', async () => {
  if (!selected) return;
  buyBtn.disabled = true;
  buyBtn.innerText = 'Обработка...';

  // determine chat id from currentUser or Telegram WebApp
  const chatId = (currentUser && currentUser.chat_id) ? currentUser.chat_id : (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user ? window.Telegram.WebApp.initDataUnsafe.user.id : null);

  // if no chat id, use demo fallback
  const effectiveChatId = chatId || ('demo-purchase-' + Date.now());
  try {
    const res = await fetch('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: effectiveChatId, days: selected.days })
    });
    const json = await res.json();
    if (json.ok) {
      const license = json.license;
      // show success card inside mainScreen
      sndSuccess && sndSuccess.play().catch(()=>{});
      const info = document.createElement('div');
      info.className = 'purchase-success';
      info.innerHTML = `<h2>Покупка успешна!</h2><p>Лицензия: ${license.key}</p><p>Период: ${license.days === 0 ? 'Навсегда' : license.days + ' дней'}</p><p>Цена: ${license.price} руб.</p>`;
      mainScreen.appendChild(info);
      planStatusEl.innerText = license.days === 0 ? 'Навсегда' : license.days + ' дней';
      buyBtn.disabled = false;
      buyBtn.innerText = 'Купить';
    } else {
      alert('Ошибка: ' + (json.error || 'unknown'));
      buyBtn.disabled = false;
      buyBtn.innerText = 'Купить';
    }
  } catch (e) {
    alert('Сетевая ошибка');
    buyBtn.disabled = false;
    buyBtn.innerText = 'Купить';
  }
});

render();
