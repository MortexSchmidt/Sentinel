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
let selected = null;

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

buyBtn.addEventListener('click', async () => {
  if (!selected) return;
  buyBtn.disabled = true;
  buyBtn.innerText = 'Обработка...';

  // Telegram Web App details
  const tg = window.Telegram.WebApp;
  const initDataUnsafe = window.Telegram ? window.Telegram.WebApp.initDataUnsafe : null;
  const chatId = (initDataUnsafe && initDataUnsafe.user) ? initDataUnsafe.user.id : null;

  if (!chatId) {
    alert('Не удалось получить chat_id. Откройте Web App из чата бота.');
    buyBtn.disabled = false;
    buyBtn.innerText = 'Купить';
    return;
  }

  try {
    const res = await fetch('/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, days: selected.days })
    });
    const json = await res.json();
    if (json.ok) {
      const license = json.license;
      document.body.innerHTML = `
        <h1>Покупка успешна!</h1>
        <p>Лицензия: ${license.key}</p>
        <p>Период: ${license.days === 0 ? 'Навсегда' : license.days + ' дней'}</p>
        <p>Цена: ${license.price} рублей</p>
        <p>Лицензия также отправлена в Telegram.</p>
        <button onclick="window.Telegram.WebApp.close()">Закрыть</button>
      `;
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
