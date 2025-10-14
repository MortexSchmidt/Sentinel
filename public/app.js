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
  // hide button
  authBtn.style.display = 'none';

  // request server to generate code
  try {
    const r = await fetch('/auth/generate', { method: 'POST' });
    const j = await r.json();
    if (!j.ok) throw new Error('no code');
    const code = j.code;
    // show code to user and instructions
    const promptEl = document.createElement('div');
    promptEl.className = 'auth-code';
    promptEl.innerHTML = `<h2>Код авторизации</h2><p>Введите команду в боте: <code>/auth ${code}</code></p><p>После ввода кода в боте подождите — страница автоматически обновится.</p><div class="timer">05:00</div>`;
    loginScreen.appendChild(promptEl);
    // playClick();

    // make code clickable to copy
    const codeEl = promptEl.querySelector('code');
    codeEl.addEventListener('click', () => {
      navigator.clipboard.writeText(`/auth ${code}`).then(() => {
        codeEl.textContent = 'Скопировано!';
        setTimeout(() => codeEl.textContent = `/auth ${code}`, 2000);
      }).catch(() => alert('Не удалось скопировать'));
    });

    // timer 5 min
    let timeLeft = 300; // 5*60
    const timerEl = promptEl.querySelector('.timer');
    const interval = setInterval(() => {
      timeLeft--;
      const min = Math.floor(timeLeft / 60);
      const sec = timeLeft % 60;
      timerEl.textContent = `${min.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
      if (timeLeft <= 0) {
        clearInterval(interval);
        // show retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'retry-btn';
        retryBtn.textContent = 'Попробовать снова';
        retryBtn.addEventListener('click', () => {
          promptEl.remove();
          authBtn.style.display = 'block';
        });
        promptEl.appendChild(retryBtn);
      }
    }, 1000);

    // poll status
    const poll = setInterval(async () => {
      try {
        const s = await fetch('/auth/status?code=' + encodeURIComponent(code));
        const sj = await s.json();
        if (sj.ok && sj.linked) {
          clearInterval(poll);
          clearInterval(interval);
          // use returned user
          currentUser = sj.user;
          // update UI
          showMain();
        }
      } catch(e){}
    }, 2000);
    return;
  } catch (e) {
    alert('Не удалось получить код авторизации');
    authBtn.style.display = 'block';
    return;
  }
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
