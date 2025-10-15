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

// show main screen after successful auth
async function showMain() {
  try {
    // remove any auth prompt
    const authPrompt = document.querySelector('.auth-code');
    if (authPrompt) authPrompt.remove();
    // hide login, show main
    if (loginScreen) loginScreen.classList.add('hidden');
    if (mainScreen) mainScreen.classList.remove('hidden');

    // if we have a chat_id, fetch /me for up-to-date profile/status
    if (currentUser && currentUser.chat_id) {
      try {
        const r = await fetch('/me?chat_id=' + encodeURIComponent(currentUser.chat_id));
        const j = await r.json();
        if (j.ok) {
          const user = j.user || currentUser;
          currentUser = user;
          nameEl.textContent = (user.first_name || user.username || 'Пользователь');
          usernameEl.textContent = user.username ? ('@' + user.username) : '';
          if (user.avatar) {
            avatarEl.src = user.avatar;
            avatarEl.classList.remove('hidden');
            document.querySelectorAll('.avatar-placeholder').forEach(el => el.classList.add('hidden'));
          } else {
            avatarEl.classList.add('hidden');
            document.querySelectorAll('.avatar-placeholder').forEach(el => el.classList.remove('hidden'));
          }
          if (j.active) {
            planStatusEl.textContent = j.daysRemaining ? (j.daysRemaining + ' дней') : 'Навсегда';
          } else {
            planStatusEl.textContent = 'Нет подписки';
          }
        }
      } catch (e) {
        // fallback to currentUser
        nameEl.textContent = (currentUser.first_name || currentUser.username || 'Пользователь');
        usernameEl.textContent = currentUser.username ? ('@' + currentUser.username) : '';
      }
    }
    // enable plans and render
    render();
    buyBtn.disabled = true;
  } catch (e) {
    console.error('showMain error', e);
  }
}

// on load: if chat_id passed in URL, fetch /me and show main
(function autoResume(){
  try{
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('chat_id');
    if (cid) {
      fetch('/me?chat_id='+encodeURIComponent(cid)).then(r=>r.json()).then(j=>{
        if (j && j.ok) { currentUser = j.user || { chat_id: cid }; showMain(); }
      }).catch(()=>{});
    }
  }catch(e){}
})();

function render() {
  plansContainer.innerHTML = '';
  plans.forEach(p => {
    const el = document.createElement('div');
    el.className = 'plan' + (selected && selected.days === p.days ? ' selected' : '');
    el.innerHTML = `<div class="plan-inner"><h3>${p.label}</h3><p>${p.price} рублей — Лицензия</p></div>`;
    el.onclick = () => { selected = p; render(); buyBtn.disabled = false; };
    // touch support: briefly blur on touchstart
    el.addEventListener('touchstart', () => {
      const inner = el.querySelector('.plan-inner');
      inner.classList.add('touched');
      setTimeout(() => inner.classList.remove('touched'), 300);
    });
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
            // redirect to main page with chat_id so main can load status
            const q = '?chat_id=' + encodeURIComponent(currentUser.chat_id);
            window.location.href = '/main.html' + q;
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

// New purchase flow: collapse plans into center, show providers, then purchase
const providersArea = document.getElementById('providersArea');
const providersList = document.getElementById('providers');
const providersBack = document.getElementById('providersBack');
const successOverlay = document.getElementById('successOverlay');
const successInfo = document.getElementById('successInfo');
const closeSuccess = document.getElementById('closeSuccess');

const PROVIDERS = [
  { id: 'card', name: 'Карта', desc: 'Быстрая оплата картой' },
  { id: 'qiwi', name: 'QIWI', desc: 'Оплата через QIWI кошелёк' },
  { id: 'yoomoney', name: 'YooMoney', desc: 'Оплата через YooMoney' }
];

buyBtn.addEventListener('click', async () => {
  if (!selected) return;
  // animate plans collapsing
  const planEls = Array.from(plansContainer.querySelectorAll('.plan'));
  plansContainer.classList.add('centering');
  // compute center point
  const rect = plansContainer.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  planEls.forEach((el, idx) => {
    const r = el.getBoundingClientRect();
    const dx = centerX - (r.left + r.width / 2);
    const dy = centerY - (r.top + r.height / 2);
    // set transform to move to center smoothly using translate
    el.style.transition = 'transform .48s cubic-bezier(.22,.9,.33,1), opacity .36s ease';
    el.style.transform = `translate(${dx}px, ${dy}px) scale(.12)`;
    el.style.opacity = '0';
  });

  // after animation, hide plans and show providers from center
  setTimeout(() => {
    plansContainer.classList.add('hidden');
    providersArea.classList.remove('hidden');
    // build providers
    providersList.innerHTML = '';
    PROVIDERS.forEach((p, i) => {
      const pe = document.createElement('div');
      pe.className = 'provider';
      pe.innerHTML = `<h4>${p.name}</h4><p>${p.desc}</p>`;
      pe.addEventListener('click', () => selectProvider(p));
      providersList.appendChild(pe);
      // staggered show
      setTimeout(() => pe.classList.add('show'), 80 * i);
    });
  }, 520);
});

providersBack && providersBack.addEventListener('click', () => {
  // reverse: hide providers, show plans back
  const providerEls = Array.from(providersList.querySelectorAll('.provider'));
  providerEls.reverse().forEach((pe, i) => {
    setTimeout(() => pe.classList.remove('show'), i * 60);
  });
  setTimeout(() => {
    providersArea.classList.add('hidden');
    plansContainer.classList.remove('hidden');
    // reset transforms
    const planEls = Array.from(plansContainer.querySelectorAll('.plan'));
    planEls.forEach(el => { el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; });
  }, 360);
});

async function selectProvider(provider) {
  // show processing state
  const providerEls = Array.from(providersList.querySelectorAll('.provider'));
  providerEls.forEach(pe => pe.style.opacity = '0.4');
  // simulate payment and call /purchase
  const chatId = (currentUser && currentUser.chat_id) ? currentUser.chat_id : (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe && window.Telegram.WebApp.initDataUnsafe.user ? window.Telegram.WebApp.initDataUnsafe.user.id : null);
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
      successInfo.innerHTML = `<p>Лицензия: <strong>${license.key}</strong></p><p>Период: ${license.days === 0 ? 'Навсегда' : license.days + ' дней'}</p><p>Цена: ${license.price} руб.</p>`;
      providersArea.classList.add('hidden');
      successOverlay.classList.remove('hidden');
      setTimeout(() => document.querySelector('.success-card')?.classList.add('show'), 10);
      planStatusEl.innerText = license.days === 0 ? 'Навсегда' : license.days + ' дней';
    } else {
      alert('Ошибка: ' + (json.error || 'unknown'));
    }
  } catch (e) {
    alert('Сетевая ошибка');
  }
}

closeSuccess && closeSuccess.addEventListener('click', () => {
  successOverlay.classList.add('hidden');
  document.querySelector('.success-card')?.classList.remove('show');
  // reset plans
  plansContainer.classList.remove('hidden');
  const planEls = Array.from(plansContainer.querySelectorAll('.plan'));
  planEls.forEach(el => { el.style.transform = ''; el.style.opacity = ''; el.style.transition = ''; });
});

render();
